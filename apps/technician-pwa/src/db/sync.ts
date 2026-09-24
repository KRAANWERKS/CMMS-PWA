import { db, type OutboxEntry } from './schema'
import { apiClient } from '@cmms/api-client'

const FLUSH_KEY = 'cmms-pwa-last-flush'

export async function queueMutation(entry: Omit<OutboxEntry, 'id' | 'synced'>) {
  await db.outbox.add({ ...entry, synced: false, createdAt: new Date().toISOString() })
  // Try immediate flush if online
  if (navigator.onLine) {
    await flushOutbox()
  }
}

export async function flushOutbox() {
  const pending = await db.outbox.where('synced').equals(0).toArray()
  if (pending.length === 0) return

  let flushed = 0
  for (const entry of pending) {
    try {
      await sendToServer(entry)
      await db.outbox.update(entry.id!, { synced: true })
      flushed++
    } catch {
      // Server unreachable — leave in queue, will retry on next connectivity event
      break
    }
  }

  if (flushed > 0) {
    localStorage.setItem(FLUSH_KEY, new Date().toISOString())
  }
  return flushed
}

async function sendToServer(entry: OutboxEntry) {
  const endpoints: Record<string, string> = {
    WO_STATUS: `/work-orders/${entry.payload.workOrderId}/status`,
    LABOR_LOG: `/work-orders/${entry.payload.workOrderId}/labor`,
    PART_USAGE: `/work-orders/${entry.payload.workOrderId}/parts`,
    METER_READING: `/assets/${entry.payload.assetId}/meter-readings`,
  }
  await apiClient.post(endpoints[entry.action], entry.payload)
}

// Auto-flush when browser comes back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOutbox()
  })
}

// Background Sync API wrapper
export function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg) => {
      (reg as any).sync?.register('cmms-outbox-sync')
    })
  }
}
