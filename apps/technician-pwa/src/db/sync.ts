import type { QueryClient } from '@tanstack/react-query'
import { assetService, getApiError, workOrderService, type AssetDto, type GetAssetsResponse, type WorkOrderDto } from '@cmms/api-client'
import { db, type OutboxEntry } from './schema'

export type NewEntry = Omit<OutboxEntry, 'id' | 'createdAt' | 'status' | 'error'>

const RETRY_INTERVAL_MS = 30_000
let client: QueryClient | null = null
let flushing: Promise<number> | null = null

// ---- Sending ---------------------------------------------------------------

async function send(entry: OutboxEntry) {
  const p = entry.payload as Record<string, any>
  switch (entry.action) {
    case 'TASK': return workOrderService.setTaskCompleted(entry.workOrderId!, p.taskId, p.completed, p.responseValue)
    case 'LABOR': return workOrderService.recordLabor(entry.workOrderId!, p.hours, p.workedAt, p.note)
    case 'STATUS': return workOrderService.changeStatus(entry.workOrderId!, p.status)
    case 'COMPLETE': return workOrderService.complete(entry.workOrderId!, p.notes)
    case 'PHOTO': return workOrderService.uploadTaskAttachment(entry.workOrderId!, p.taskId, p.blob as Blob, p.fileName)
    case 'METER': return assetService.recordMeterReading(entry.assetId!, p.meterId, p.value, p.note, undefined, p.readingAt)
  }
}

// No response, server errors and auth/throttle problems are retried later; anything else is a rejection
function isRetryable(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status
  return !status || status >= 500 || status === 401 || status === 408 || status === 429
}

// Changes only have to stay in order within the same work order (or asset): a photo must land before the
// completion that needs it, but one record's trouble must not hold up another's.
const recordKey = (entry: OutboxEntry) => entry.workOrderId ?? entry.assetId ?? 'other'

const sha256Hex = async (blob: Blob) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('')

/**
 * After a failed send the request may still have reached the server (only the reply was lost).
 * Before retrying, look at what the server holds so photos and labor are not added twice and a status
 * change that already happened is not reported as rejected. Returns false when unsure: then it just sends.
 */
async function alreadyOnServer(entry: OutboxEntry): Promise<boolean> {
  if (!entry.attempts || !entry.workOrderId) return false
  const p = entry.payload as Record<string, any>
  try {
    const wo = await workOrderService.getWorkOrderById(entry.workOrderId)
    switch (entry.action) {
      case 'PHOTO': {
        const hash = await sha256Hex(p.blob as Blob)
        return !!wo.tasks.find(task => task.id === p.taskId)?.attachments?.some(a => a.checksumSha256?.toLowerCase() === hash)
      }
      case 'LABOR':
        return wo.labor.some(l => l.hours === Number(p.hours) && Math.abs(new Date(l.workedAt).getTime() - new Date(p.workedAt).getTime()) < 1000)
      case 'STATUS': return wo.status === p.status
      case 'COMPLETE': return ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)
      default: return false
    }
  } catch { return false }
}

async function run(): Promise<number> {
  if (!navigator.onLine) return 0
  let sent = 0
  let rejected = 0
  const blocked = new Set<string>()
  for (;;) {
    const next = await db.outbox.orderBy('id').filter(entry => entry.status === 'PENDING' && !blocked.has(recordKey(entry))).first()
    if (!next) break
    try {
      if (!(await alreadyOnServer(next))) await send(next)
      await db.outbox.delete(next.id!)
      sent++
    } catch (error) {
      if (isRetryable(error)) {
        await db.outbox.update(next.id!, { attempts: (next.attempts ?? 0) + 1, lastAttemptError: getApiError(error, 'Could not reach the server') })
        const status = (error as { response?: { status?: number } })?.response?.status
        // No reply or an expired session affects everything; a server fault on one record only holds up that record
        if (!status || status === 401) break
        blocked.add(recordKey(next))
        continue
      }
      await db.outbox.update(next.id!, { status: 'FAILED', error: getApiError(error, 'The server rejected this change') })
      rejected++
    }
  }
  if ((sent > 0 || rejected > 0) && client && await db.outbox.where('status').equals('PENDING').count() === 0) {
    await client.invalidateQueries()
  }
  return sent
}

/** Sends queued changes in order. Safe to call from anywhere; calls are serialised. */
export async function flushOutbox() {
  while (flushing) await flushing
  flushing = run().finally(() => { flushing = null })
  return flushing
}

/**
 * Saves a change locally, then tries to send it right away.
 * Resolves 'synced' when the server accepted it, 'queued' when it is waiting for a connection,
 * and throws when the server rejected it (the entry is discarded so the UI can roll back).
 */
export async function submitChange(entry: NewEntry, onSaved?: (saved: OutboxEntry) => void): Promise<'synced' | 'queued'> {
  const record: OutboxEntry = { ...entry, createdAt: new Date().toISOString(), status: 'PENDING' }
  record.id = await db.outbox.add(record)
  onSaved?.(record)
  await flushOutbox()
  const after = await db.outbox.get(record.id)
  if (!after) return 'synced'
  if (after.status === 'FAILED') {
    await db.outbox.delete(record.id)
    throw new Error(after.error ?? 'The server rejected this change')
  }
  return 'queued'
}

/** Retries on reconnect, on app start and periodically (covers "online but server unreachable"). */
export function startOutboxSync(queryClient: QueryClient) {
  client = queryClient
  window.addEventListener('online', () => { void flushOutbox() })
  window.setInterval(() => { void flushOutbox() }, RETRY_INTERVAL_MS)
  void flushOutbox()
}

// ---- Showing queued changes before the server has them ------------------------

const heuristicTransitions: Record<string, string[]> = { IN_PROGRESS: ['COMPLETED'], COMPLETED: [] }

export function applyEntry(wo: WorkOrderDto, entry: OutboxEntry): WorkOrderDto {
  const p = entry.payload as Record<string, any>
  switch (entry.action) {
    case 'TASK':
      return { ...wo, tasks: wo.tasks.map(task => task.id !== p.taskId ? task : {
        ...task, status: p.completed ? 'COMPLETED' : 'OPEN', responseValue: p.responseValue ?? task.responseValue,
      }) }
    case 'LABOR':
      return {
        ...wo,
        totalLaborHours: Math.round((wo.totalLaborHours + Number(p.hours)) * 100) / 100,
        labor: [...wo.labor, { id: `pending-${entry.id}`, hours: Number(p.hours), workedAt: p.workedAt, notes: p.note }],
      }
    case 'STATUS':
      return {
        ...wo, status: p.status,
        actualStart: p.status === 'IN_PROGRESS' ? wo.actualStart ?? entry.createdAt : wo.actualStart,
        allowedTransitions: heuristicTransitions[p.status] ?? wo.allowedTransitions,
      }
    case 'PHOTO':
      // Shown right away; the real attachment replaces it once the upload has synced
      return { ...wo, tasks: wo.tasks.map(task => task.id !== p.taskId ? task : {
        ...task, attachments: [...(task.attachments ?? []), { id: `pending-${entry.id}`, fileName: p.fileName, contentType: 'image/jpeg' }],
      }) }
    case 'COMPLETE':
      return { ...wo, status: 'COMPLETED', allowedTransitions: [] }
    default:
      return wo
  }
}

/** The server copy of a work order with this device's unsent changes laid over it. */
export async function fetchWorkOrder(id: string) {
  return withPendingChanges(await workOrderService.getWorkOrderById(id))
}

export async function withPendingChanges(wo: WorkOrderDto) {
  const pending = await db.outbox.where('workOrderId').equals(wo.id).filter(entry => entry.status === 'PENDING').sortBy('id')
  return pending.reduce(applyEntry, wo)
}

export function applyMeterEntry(data: GetAssetsResponse | undefined, entry: OutboxEntry) {
  if (!data) return data
  const p = entry.payload as Record<string, any>
  const items = data.items.map((asset: AssetDto) => asset.id !== entry.assetId ? asset : {
    ...asset,
    meters: asset.meters?.map(m => m.id === p.meterId ? { ...m, currentReading: Number(p.value), readingAt: p.readingAt } : m),
  })
  return { ...data, items }
}
