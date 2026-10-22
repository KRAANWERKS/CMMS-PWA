import { apiClient } from './assets'

export interface WeatherReadingDto {
  temperatureC?: number | null
  windKph?: number | null
  humidity?: number | null
  condition?: string | null
  /** A third-party CDN image. The PWA does not load it (it would fail offline); it picks a local icon instead. */
  iconUrl?: string | null
  updatedAt: string
  fetchedAt: string
}

export interface SiteWeatherDto {
  siteId: string
  latitude?: number | null
  longitude?: number | null
  /** `available`, or `no_coordinates` when an admin has not set the site's location. `reading` is null unless available. */
  status?: string | null
  reading?: WeatherReadingDto | null
}

export const weatherService = {
  async getForSites(siteIds: string[]): Promise<SiteWeatherDto[]> {
    // The server binds repeated `siteIds=a&siteIds=b`, not axios's default `siteIds[]=a`
    return (await apiClient.get<SiteWeatherDto[]>('/sites/weather', { params: { siteIds }, paramsSerializer: { indexes: null } })).data
  },
}
