import axios from 'axios'

// Axios instance proxied to .NET backend via Vite proxy (path /api/* → http://localhost:7154)
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  transformResponse: [(data) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      // Backend returns { value: [...], Count: N } wrapper — unwrap to flat array
      if (parsed && Array.isArray(parsed.value)) {
        return parsed.value
      }
      return parsed
    } catch {
      return data
    }
  }]
})

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase()
  if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['X-CMMS-Request'] = '1'
  }
  return config
})

// DTOs matching the backend
export interface AssetDto {
  id: string
  organizationId: string
  siteId: string
  parentAssetId?: string
  assetCode: string
  name: string
  description?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  status: string
  criticality: number
  categoryId?: string
  locationId?: string
  installedAt?: string
  retiredAt?: string
  depth?: number
  children?: AssetDto[]
  meters?: AssetMeterDto[]
  measurementPoints?: AssetMeasurementPointDto[]
  usageMeterId?: string
  usageBaselineValue?: number
  expectedLifeValue?: number
  health?: AssetHealthDto
}

export interface AssetMeterDto {
  id: string
  assetId: string
  code: string
  name: string
  meterType: string
  unit: string
  currentReading?: number
  readingAt?: string
}

export interface AssetMeasurementPointDto {
  id: string
  assetId: string
  code: string
  name: string
  measurementType: string
  unit: string
  normalMinimum?: number
  normalMaximum?: number
  currentValue?: number
  currentStatus?: 'GOOD' | 'WATCH' | 'BAD' | string
  readingAt?: string
  expectedValue?: number
  standardProfileId?: string
  standardRuleId?: string
  standardRuleCode?: string
  standardRuleReviewStatus?: string
  manualReference?: string
  sourcePageOrSection?: string
}

export interface MaintenanceStandardRuleDto {
  id: string
  code: string
  name: string
  ruleType: string
  measurementType?: string
  unit?: string
  minimumValue?: number
  maximumValue?: number
  expectedValue?: number
  intervalValue?: number
  intervalUnit?: string
  expectedLifeValue?: number
  expectedLifeUnit?: string
  manualReference?: string
  manualRevision?: string
  sourcePageOrSection?: string
  reviewStatus: string
  isActive: boolean
  effective: boolean
}

export interface MaintenanceStandardProfileSummaryDto {
  id: string
  code: string
  name: string
  description?: string
  manufacturer?: string
  model?: string
  series?: string
  manualReference?: string
  manualRevision?: string
  reviewStatus: string
  isActive: boolean
  ruleCount: number
  approvedRuleCount: number
}

export interface MaintenanceStandardProfileDetailDto {
  id: string
  code: string
  name: string
  description?: string
  manufacturer?: string
  model?: string
  series?: string
  manualReference?: string
  manualRevision?: string
  reviewStatus: string
  isActive: boolean
  rules: MaintenanceStandardRuleDto[]
}

export interface AssetStandardAssignmentDto {
  id: string
  assetId: string
  standardProfileId: string
  usageSourceMeterId?: string
  isPrimary: boolean
  isActive: boolean
  profile: {
    id: string
    code: string
    name: string
    manufacturer?: string
    model?: string
    series?: string
    manualReference?: string
    manualRevision?: string
    reviewStatus: string
    isActive: boolean
  }
  rules: MaintenanceStandardRuleDto[]
}

export interface AssetHealthDto {
  conditionStatus: 'GOOD' | 'WATCH' | 'BAD' | 'NO_DATA' | string
  conditionPointCount: number
  watchPointCount: number
  badPointCount: number
  usageMeterId?: string
  usageSourceAssetId?: string
  usageSourceAssetCode?: string
  usageSourceAssetName?: string
  usageMeterName?: string
  usageUnit?: string
  currentUsageValue?: number
  usageBaselineValue?: number
  expectedLifeValue?: number
  consumedLifeValue?: number
  remainingLifeValue?: number
  remainingLifePercent?: number
  expectedLifeSource?: 'ASSET_OVERRIDE' | 'STANDARD' | string
  expectedLifeStandardRuleId?: string
  expectedLifeStandardRuleCode?: string
  expectedLifeManualReference?: string
  expectedLifeSourcePageOrSection?: string
}

export interface MeasurementPointInput {
  code: string
  name: string
  measurementType: string
  unit: string
  normalMinimum?: number
  normalMaximum?: number
  description?: string
  isActive?: boolean
}

export interface AssetProfileInput {
  siteId: string
  assetCode: string
  name: string
  description?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  parentAssetId?: string | null
  status: string
  criticality: number
  installedAt?: string | null
  retiredAt?: string | null
}

export interface GetAssetsParams {
  search?: string
  siteId?: string
  page?: number
  pageSize?: number
}

export interface GetAssetsResponse {
  items: AssetDto[]
  totalCount: number
  page: number
  pageSize: number
}

export const assetService = {
  async createAsset(input: AssetProfileInput): Promise<{ id: string }> {
    return (await apiClient.post<{ id: string }>('/assets', input)).data
  },

  async moveAsset(id: string, parentAssetId: string | null): Promise<void> {
    await apiClient.put(`/assets/${id}/parent`, { parentAssetId })
  },

  async updateAsset(id: string, input: AssetProfileInput): Promise<void> {
    await apiClient.put(`/assets/${id}`, input)
  },

  async getAssets(params: GetAssetsParams): Promise<GetAssetsResponse> {
    const { siteId, search, page = 1, pageSize = 20 } = params
    const response = await apiClient.get<AssetDto[]>('/assets', {
      params: { siteId, search, page, pageSize }
    })
    return {
      items: response.data,
      totalCount: response.data.length,
      page,
      pageSize
    }
  },

  // The API caps pageSize at 500, so larger sites need several pages.
  async getAllAssets(siteId: string, search?: string): Promise<GetAssetsResponse> {
    const pageSize = 500
    const items: AssetDto[] = []
    for (let page = 1; ; page++) {
      const batch = (await assetService.getAssets({ siteId, search, page, pageSize })).items
      items.push(...batch)
      if (batch.length < pageSize) break
    }
    return { items, totalCount: items.length, page: 1, pageSize: items.length }
  },

  async getAssetById(id: string): Promise<AssetDto> {
    const response = await apiClient.get<AssetDto>(`/assets/${id}`)
    return response.data
  },

  async getAssetTree(siteId?: string): Promise<AssetDto[]> {
    const response = await apiClient.get<AssetDto[]>('/assets/tree', {
      params: { siteId }
    })
    return response.data
  },

  async recordMeterReading(assetId: string, meterId: string, value: number, note?: string, workOrderId?: string, readingAt?: string, isCorrection = false): Promise<void> {
    await apiClient.post(`/assets/${assetId}/meter-readings`, {
      meterId,
      value,
      readingAt: readingAt ?? new Date().toISOString(),
      note: note?.trim() || undefined,
      workOrderId,
      isCorrection,
    })
  },

  async createMeasurementPoint(assetId: string, input: MeasurementPointInput): Promise<{ id: string }> {
    return (await apiClient.post<{ id: string }>(`/assets/${assetId}/measurement-points`, input)).data
  },

  async updateMeasurementPoint(assetId: string, pointId: string, input: MeasurementPointInput): Promise<void> {
    await apiClient.put(`/assets/${assetId}/measurement-points/${pointId}`, input)
  },

  async recordMeasurementPointReading(assetId: string, pointId: string, value: number, note?: string, status?: string, workOrderId?: string): Promise<void> {
    await apiClient.post(`/assets/${assetId}/measurement-points/${pointId}/readings`, {
      value,
      readingAt: new Date().toISOString(),
      status: status || undefined,
      note: note?.trim() || undefined,
      workOrderId,
    })
  },

  async configureUsageHealth(assetId: string, input: { meterId?: string; baselineValue?: number; expectedLifeValue?: number }): Promise<void> {
    await apiClient.put(`/assets/${assetId}/health/usage`, {
      meterId: input.meterId || null,
      baselineValue: input.baselineValue ?? null,
      expectedLifeValue: input.expectedLifeValue ?? null,
    })
  },

  async getAssetStandards(assetId: string): Promise<AssetStandardAssignmentDto[]> {
    return (await apiClient.get<AssetStandardAssignmentDto[]>(`/assets/${assetId}/standards`)).data
  },

  async getMaintenanceStandards(): Promise<MaintenanceStandardProfileSummaryDto[]> {
    return (await apiClient.get<MaintenanceStandardProfileSummaryDto[]>('/maintenance-standards')).data
  },

  async getMaintenanceStandard(id: string): Promise<MaintenanceStandardProfileDetailDto> {
    return (await apiClient.get<MaintenanceStandardProfileDetailDto>(`/maintenance-standards/${id}`)).data
  },

  async assignMaintenanceStandard(assetId: string, profileId: string, input: {
    usageSourceMeterId?: string
    isPrimary?: boolean
    isActive?: boolean
    useAsAssetUsageSource?: boolean
  } = {}): Promise<void> {
    await apiClient.put(`/assets/${assetId}/standards/${profileId}`, {
      usageSourceMeterId: input.usageSourceMeterId || null,
      isPrimary: input.isPrimary ?? true,
      isActive: input.isActive ?? true,
      useAsAssetUsageSource: input.useAsAssetUsageSource ?? false,
    })
  }
}
