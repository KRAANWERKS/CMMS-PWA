import { apiClient } from './assets'

export interface MonitoringItemDto {
  id: string
  assetId: string
  assetName: string
  assetCode: string
  siteId: string
  siteName?: string
  conditionPointKey: string
  measurement: string
  unit?: string | null
  /** HEALTHY, WARNING, CRITICAL or UNKNOWN (no usable reading) */
  status: string
  /** FRESH, STALE or MISSING */
  freshness: string
  lastKnownState?: string | null
  reason?: string | null
  latestValue?: number | null
  previousValue?: number | null
  completedAt?: string | null
  workOrderId?: string | null
  workOrderNumber?: string | null
}

export interface MonitoringSummaryDto {
  criticalAssets: number
  warningAssets: number
  needsFreshReadingAssets: number
  monitoredAssets: number
  unconfiguredAssets: number
}

export interface MonitoringPageDto {
  summary: MonitoringSummaryDto
  items: MonitoringItemDto[]
  totalCount: number
  page: number
  pageSize: number
}

export const monitoringService = {
  // pageSize is capped at 100 by the server. Each page also carries the site's full asset filter list,
  // so keep pages modest and only load them when the technician opens the screen.
  async getReadingsDue(siteId: string, page = 1, pageSize = 25): Promise<MonitoringPageDto> {
    return (await apiClient.get<MonitoringPageDto>('/dashboard/monitoring', { params: { siteId, status: 'UNKNOWN', page, pageSize } })).data
  },
}
