import Dexie, { type Table } from 'dexie'

export type OutboxAction = 'TASK' | 'LABOR' | 'STATUS' | 'COMPLETE' | 'METER' | 'PHOTO'

/** A change made on this device that has not reached the server yet. */
export interface OutboxEntry {
  id?: number
  action: OutboxAction
  workOrderId?: string
  assetId?: string
  payload: Record<string, unknown>
  createdAt: string
  /** PENDING = waiting to send (retried); FAILED = the server rejected it. */
  status: 'PENDING' | 'FAILED'
  error?: string
  /** Failed sends that will be retried: a lost reply may still have reached the server, so retries check first. */
  attempts?: number
  lastAttemptError?: string
}

class CmmsDexie extends Dexie {
  outbox!: Table<OutboxEntry, number>

  constructor() {
    super('cmms-pwa')
    this.version(1).stores({
      workOrders: 'id, status, priority, syncedAt',
      spareParts: 'id, partNumber, name',
      outbox: '++id, action, synced, createdAt',
    })
    // v1 tables were never used; the outbox now tracks a status instead of a synced flag
    this.version(2).stores({
      workOrders: null,
      spareParts: null,
      outbox: '++id, action, status, workOrderId, createdAt',
    }).upgrade(tx => tx.table('outbox').clear())
    // attempts is indexed so the connection indicator re-renders when an entry starts failing
    // (Dexie only re-runs a live query when an indexed value changes). Existing rows are kept.
    this.version(3).stores({
      outbox: '++id, action, status, workOrderId, createdAt, attempts',
    })
  }
}

export const db = new CmmsDexie()
