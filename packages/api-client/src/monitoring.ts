import { apiClient } from './assets'
import type { ConditionRule } from './work-orders'

export interface MonitoringRow {
  id: string
  assetId: string
  assetName: string
  assetCode: string
  siteId: string
  siteName: string
  conditionPointKey: string
  measurement: string
  unit: string
  status: string
  freshness: 'FRESH' | 'STALE' | 'MISSING' | 'INVALID'
  lastKnownState: string
  reason: string
  latestValue?: number | null
  previousValue?: number | null
  completedAt?: string | null
  workOrderId?: string | null
  workOrderNumber?: string | null
  rule: ConditionRule
}

export interface MonitoringResponse {
  evaluatedAt: string
  summary: { criticalAssets: number; warningAssets: number; needsFreshReadingAssets: number; monitoredAssets: number; unconfiguredAssets: number }
  items: MonitoringRow[]
  totalCount: number
  page: number
  pageSize: number
  filters: {
    assets: { id: string; name: string; code: string }[]
    measurements: { key: string; name: string; unit: string }[]
  }
  maintenance: {
    totalAssets: number
    openWorkOrders: number
    overdueWorkOrders: number
    completedWorkOrders: number
    highCriticalOpen: number
    statusDistribution: { name: string; value: number }[]
    priorityDistribution: { name: string; value: number }[]
    recent: { id: string; number: string; title: string; status: string; priority: string; workType: string; siteId: string; scheduledEnd?: string | null }[]
  }
}

export interface ConditionHistory {
  assetId: string
  conditionPointKey: string
  measurement: string
  unit: string
  days: number
  evaluatedAt: string
  rule: ConditionRule
  readings: {
    value: number
    completedAt: string
    workOrderId?: string | null
    workOrderNumber?: string | null
    taskId: string
    source?: 'ASSET_MEASUREMENT' | 'WORK_ORDER' | string
  }[]
}

export type MonitoringItemDto = MonitoringRow
export type MonitoringPageDto = MonitoringResponse

export const monitoringService = {
  async getReadingsDue(siteId: string, page = 1, pageSize = 25): Promise<MonitoringPageDto> {
    return (await apiClient.get<MonitoringPageDto>('/dashboard/monitoring', { params: { siteId, status: 'UNKNOWN', page, pageSize } })).data
  },
  async getMonitoring(params: { siteId?: string; assetId?: string; measurement?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<MonitoringResponse> {
    return (await apiClient.get<MonitoringResponse>('/dashboard/monitoring', { params })).data
  },
  async getHistory(assetId: string, conditionPointKey: string, days: number): Promise<ConditionHistory> {
    return (await apiClient.get<ConditionHistory>(`/assets/${assetId}/condition/history`, { params: { conditionPointKey, days } })).data
  },
}
