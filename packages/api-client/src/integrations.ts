import { apiClient } from './assets'

export interface IntegrationSyncStatusDto {
  integrationType: string
  entityType: string
  lastSyncAt?: string
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'NEVER_RUN'
  recordCount: number
  lastError?: string
}

export interface TriggerSyncResponse {
  accepted: boolean
  message?: string
}

export const integrationService = {
  async getLimbleStatus(): Promise<IntegrationSyncStatusDto[]> {
    const response = await apiClient.get<IntegrationSyncStatusDto[]>('/integrations/limble/status')
    return response.data
  },
  async triggerFullSync(): Promise<TriggerSyncResponse> {
    const response = await apiClient.post<TriggerSyncResponse>('/integrations/limble/sync')
    return response.data
  },
}
