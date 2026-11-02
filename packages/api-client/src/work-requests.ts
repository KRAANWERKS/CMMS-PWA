import { apiClient } from './assets'

export type WorkRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface CreateWorkRequestPayload {
  siteId: string
  assetId?: string | null
  locationId?: string | null
  title: string
  description?: string | null
  priority?: WorkRequestPriority
}

export interface CreatedWorkRequest {
  id: string
}

export const workRequestService = {
  async create(payload: CreateWorkRequestPayload): Promise<CreatedWorkRequest> {
    const data = (await apiClient.post<CreatedWorkRequest | string>('/work-requests', payload)).data
    // Keep compatibility during rolling deployments where the older API returned a bare GUID.
    return typeof data === 'string' ? { id: data } : data
  },
}
