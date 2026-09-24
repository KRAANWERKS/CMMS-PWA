import Dexie, { type Table } from 'dexie'

export interface OfflineWorkOrder {
  id: string
  number: string
  title: string
  status: string
  priority: string
  assetCode: string
  assetName: string
  checklist: { step: string; completed: boolean }[]
  laborLogs: { userId: string; hours: number; workedAt: string; note?: string }[]
  partUsages: { sparePartId: string; quantity: number }[]
  syncedAt?: string
}

export interface OfflineSparePart {
  id: string
  partNumber: string
  name: string
  uom: string
}

export interface OutboxEntry {
  id?: number
  action: 'WO_STATUS' | 'LABOR_LOG' | 'PART_USAGE' | 'METER_READING'
  payload: Record<string, unknown>
  createdAt: string
  synced: boolean
}

class CmmsDexie extends Dexie {
  workOrders!: Table<OfflineWorkOrder>
  spareParts!: Table<OfflineSparePart>
  outbox!: Table<OutboxEntry>

  constructor() {
    super('cmms-pwa')
    this.version(1).stores({
      workOrders: 'id, status, priority, syncedAt',
      spareParts: 'id, partNumber, name',
      outbox: '++id, action, synced, createdAt',
    })
  }
}

export const db = new CmmsDexie()
