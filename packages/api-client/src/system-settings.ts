import { apiClient } from './assets'

export interface SystemSetting {
  definition: { key: string; group: string; label: string; kind: 'boolean' | 'secret' | 'number' | 'url'; description: string; default: string | null; min: number | null; max: number | null }
  value: string | null
  hasValue: boolean
  serverValue: string | null
  serverHasValue: boolean
  source: 'server' | 'settings'
  version: number | null
  updatedAt: string | null
}
export interface SystemSettings { workerAvailable: boolean; settings: SystemSetting[] }
export interface SystemSettingChange { key: string; value?: string; version: number | null; reset?: boolean }
export const systemSettingsService = {
  mapConfiguration: async () => (await apiClient.get<{ lightStyleUrl: string; darkStyleUrl: string }>('/maps/configuration')).data,
  get: async () => (await apiClient.get<SystemSettings>('/settings/system')).data,
  update: async (changes: SystemSettingChange[]) => (await apiClient.put<SystemSettings>('/settings/system', { changes })).data,
  testWeather: async () => (await apiClient.post<{ success: boolean; message: string }>('/settings/system/weather/test')).data,
}
