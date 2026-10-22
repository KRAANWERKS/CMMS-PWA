import { useQuery } from '@tanstack/react-query'
import { Group, Text } from '@mantine/core'
import { IconCloud, IconCloudFog, IconCloudRain, IconCloudStorm, IconSnowflake, IconSun, IconTemperature, IconWind, type Icon } from '@tabler/icons-react'
import { weatherService } from '@cmms/api-client'

// Local icons chosen from the condition text: the server's icon is a third-party CDN image that cannot load offline
const iconFor = (condition?: string | null): Icon => {
  const text = (condition ?? '').toLowerCase()
  if (/thunder|storm/.test(text)) return IconCloudStorm
  if (/rain|drizzle|shower/.test(text)) return IconCloudRain
  if (/snow|sleet|ice|blizzard/.test(text)) return IconSnowflake
  if (/fog|mist|haze/.test(text)) return IconCloudFog
  if (/cloud|overcast/.test(text)) return IconCloud
  if (/sun|clear/.test(text)) return IconSun
  return IconTemperature
}

const STALE_AFTER_MS = 3 * 60 * 60 * 1000

/** Current conditions at the site. Informational only; renders nothing when the site has no weather. */
export function SiteWeather({ siteId }: { siteId: string }) {
  const { data } = useQuery({
    queryKey: ['site-weather', siteId],
    queryFn: async () => (await weatherService.getForSites([siteId])).find(item => item.siteId === siteId) ?? null,
    staleTime: 15 * 60_000,
    retry: false,
  })
  const reading = data?.reading
  if (!reading) return null

  const Icon = iconFor(reading.condition)
  const updated = new Date(reading.updatedAt)
  const knownTime = !Number.isNaN(updated.getTime())
  const stale = knownTime && Date.now() - updated.getTime() > STALE_AFTER_MS

  const when = knownTime ? updated.toLocaleString([], stale ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' }) : ''
  // Two compact lines: the numbers a technician scans first, then the detail
  const detail = [reading.condition || null, reading.humidity != null ? `${reading.humidity}% humidity` : null].filter(Boolean).join(' · ')

  return (
    <div aria-label="Site weather" style={{ marginTop: -4 }}>
      <Group gap="md" wrap="nowrap">
        {reading.temperatureC != null && (
          <Group gap={4} wrap="nowrap"><Icon size="1.125rem" color="var(--mantine-color-dimmed)" /><Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>{Math.round(reading.temperatureC)}°C</Text></Group>
        )}
        {reading.windKph != null && (
          <Group gap={4} wrap="nowrap"><IconWind size="1.125rem" color="var(--mantine-color-dimmed)" /><Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>{Math.round(reading.windKph)} km/h</Text></Group>
        )}
      </Group>
      <Group gap="0 6px" wrap="wrap">
        {detail && <Text size="xs" c="dimmed">{detail}</Text>}
        {knownTime && <Text size="xs" c={stale ? 'orange' : 'dimmed'}>{stale ? 'Last reading ' : 'Updated '}{when}</Text>}
      </Group>
    </div>
  )
}
