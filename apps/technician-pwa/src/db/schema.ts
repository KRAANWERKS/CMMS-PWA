import Dexie, { type Table } from 'dexie'

export type OutboxAction = 'TASK' | 'LABOR' | 'STATUS' | 'COMPLETE' | 'METER'

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
  }
}

export const db = new CmmsDexie()
