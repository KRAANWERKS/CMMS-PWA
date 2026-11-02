import { apiClient } from './assets'

export interface SiteWeatherDto {
  siteId: string
  latitude: number | null
  longitude: number | null
  status: 'available' | 'stale' | 'unavailable' | 'not_configured' | 'no_coordinates' | 'disabled'
  reading: {
    temperatureC: number | null
    windKph: number | null
    humidity: number | null
    condition: string
    iconUrl: string | null
    updatedAt: string
    fetchedAt: string
  } | null
}

export async function getSiteWeather(siteIds: string[], signal?: AbortSignal): Promise<SiteWeatherDto[]> {
  const result: SiteWeatherDto[] = []
  for (let offset = 0; offset < siteIds.length; offset += 100) {
    const params = new URLSearchParams()
    siteIds.slice(offset, offset + 100).forEach(id => params.append('siteIds', id))
    const response = await apiClient.get<SiteWeatherDto[]>('/sites/weather', { params, signal })
    result.push(...response.data)
  }
  return result
}
