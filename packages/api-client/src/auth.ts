import axios from 'axios'
import { apiClient } from './assets'

export interface CurrentUser {
  useSiteRoles?: boolean
  grants?: string[]
  id: string
  displayName: string
  avatarUrl?: string
  hasAvatar?: boolean
  roles: string[]
  sites: string[]
}

export const hasPermission = (user: CurrentUser | undefined, permission: string, siteId?: string) => !!user && (
  user.roles.includes('ADMIN') || (user.useSiteRoles
    ? (user.grants ?? []).some(g => g.endsWith(`|${permission}`) && (!siteId || g.startsWith(`${siteId}|`)))
    : user.roles.includes('PLANNER')))
export const canUseAdmin = (user: CurrentUser) => user.roles.some(r => r === 'ADMIN' || r === 'PLANNER') || !!user.useSiteRoles && !!user.grants?.length
export const canUseEngineer = (user: CurrentUser) => user.roles.includes('TECHNICIAN') || !!user.useSiteRoles && !!user.grants?.some(g => g.endsWith('|work_orders.execute'))

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
  regionId?: string | null
  regionName?: string | null
  latitude?: number | null
  longitude?: number | null
  locationUpdatedAt?: string | null
}

export interface RegionDto {
  id: string
  code: string
  name: string
}

export interface UpdateSiteLocationRequest {
  regionId: string | null
  latitude: number | null
  longitude: number | null
}

export function getApiError(error: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; title?: string; message?: string; error?: string } | string | undefined
    if (typeof data === 'string') return data || error.message || fallback
    return data?.detail || data?.message || data?.error || data?.title || error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export const authService = {
  async methods(): Promise<{ local: boolean; entra: boolean; userManagementEnabled: boolean }> { return (await apiClient.get('/auth/methods')).data },
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
  async getAllSites(): Promise<SiteDto[]> {
    const sites: SiteDto[] = []
    for (let page = 1; ; page++) {
      const batch = (await apiClient.get<SiteDto[]>('/sites', { params: { page, pageSize: 500 } })).data
      sites.push(...batch)
      if (batch.length < 500) return [...new Map(sites.map(site => [site.id, site])).values()]
    }
  },
  async updateLocation(id: string, request: UpdateSiteLocationRequest): Promise<void> {
    await apiClient.put(`/sites/${id}/location`, request)
  },
  async getRegions(): Promise<RegionDto[]> {
    return (await apiClient.get<RegionDto[]>('/regions')).data
  },
  async createRegion(code: string, name: string): Promise<RegionDto> {
    return (await apiClient.post<RegionDto>('/regions', { code, name })).data
  },
}
