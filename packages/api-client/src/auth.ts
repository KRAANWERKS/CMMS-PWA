import axios from 'axios'
import { apiClient } from './assets'

export interface CurrentUser {
  id: string
  displayName: string
  roles: string[]
  sites: string[]
}

export interface IdentityUser {
  isActive: boolean
  siteIds: string[]
  id: string
  displayName: string
  roles?: string[]
}

export interface SiteDto {
  id: string
  organizationId: string
  organizationName: string
  name: string
  code: string
  timeZone: string
  isActive: boolean
  imoNumber?: string | null
  flagState?: string | null
  vesselName?: string | null
  siteType: string
  assetCount: number
  openWorkOrderCount: number
  overdueWorkOrderCount: number
  pmPlanCount: number
}

export function getApiError(error: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; title?: string; message?: string } | string | undefined
    if (typeof data === 'string') return data || error.message || fallback
    return data?.detail || data?.message || data?.title || error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export const authService = {
  async login(username: string, password: string): Promise<void> {
    await apiClient.post('/auth/login', { username, password })
  },
  async me(): Promise<CurrentUser> {
    return (await apiClient.get<CurrentUser>('/auth/me')).data
  },
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },
}

export const identityService = {
  async getUsers(): Promise<IdentityUser[]> {
    return (await apiClient.get<IdentityUser[]>('/identity/users')).data
  },
}

export const siteService = {
  async getSites(): Promise<SiteDto[]> {
    return (await apiClient.get<SiteDto[]>('/sites')).data
  },
}
