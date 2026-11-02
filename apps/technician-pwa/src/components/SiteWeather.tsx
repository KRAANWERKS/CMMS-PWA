import { useI18n } from '../i18n'
import { useQuery } from '@tanstack/react-query'
import { ActionIcon, Group, Popover, Stack, Text } from '@mantine/core'
import {
  IconCloud, IconCloudFog, IconCloudRain, IconCloudStorm, IconDroplet,
  IconInfoCircle, IconSnowflake, IconSun, IconTemperature, IconWind, type Icon,
} from '@tabler/icons-react'
import { getSiteWeather } from '@cmms/api-client'

// Use local icons so weather remains legible when offline.
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

/** Compact site conditions; condition and observation timestamp are details on demand. */
export function SiteWeather({ siteId }: { siteId: string }) {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: ['site-weather', siteId],
    queryFn: async () => (await getSiteWeather([siteId])).find(item => item.siteId === siteId) ?? null,
    staleTime: 15 * 60_000,
    retry: false,
  })
  const reading = data?.reading
  if (!reading) return null

  const WeatherIcon = iconFor(reading.condition)
  const updated = new Date(reading.updatedAt)
  const knownTime = !Number.isNaN(updated.getTime())
  const stale = knownTime && Date.now() - updated.getTime() > STALE_AFTER_MS
  const when = knownTime
    ? updated.toLocaleString([], stale
      ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' })
    : ''
  const updateLabel = knownTime ? t(stale ? 'Last reading' : 'Updated') + ' ' + when : t('Update time unavailable')
  const conditionLabel = t(reading.condition || 'Condition unavailable')

  return (
    <Stack gap={7} aria-label={t("Site weather")} style={{ minWidth: 0 }}>
      <Group justify="space-between" gap={5} wrap="nowrap" style={{ minWidth: 0 }}>
        <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
          <IconTemperature size={17} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
          <Text size="xs" fw={650} style={{ whiteSpace: 'nowrap' }}>{reading.temperatureC != null ? Math.round(reading.temperatureC) + '°C' : '—'}</Text>
        </Group>
        <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
          <IconWind size={17} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
          <Text size="xs" fw={650} style={{ whiteSpace: 'nowrap' }}>{reading.windKph != null ? Math.round(reading.windKph) + ' km/h' : '—'}</Text>
        </Group>
        <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
          <IconDroplet size={17} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
          <Text size="xs" fw={650} style={{ whiteSpace: 'nowrap' }}>{reading.humidity != null ? Math.round(reading.humidity) + '%' : '—'}</Text>
        </Group>
      </Group>
      <Group justify="space-between" gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: '1 1 0' }}>
          <WeatherIcon
            size={18}
            color="var(--mantine-color-dimmed)"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
          <Text size="xs" c="dimmed" truncate style={{ minWidth: 0 }}>
            {conditionLabel}
          </Text>
        </Group>
        <Popover position="bottom-end" width={210} withArrow shadow="md" withinPortal>
          <Popover.Target>
            <ActionIcon
              aria-label={t('Show weather update time')}
              title={updateLabel}
              color="gray"
              variant="subtle"
              size="sm"
              style={{ flexShrink: 0 }}
            >
              <IconInfoCircle size={18} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <Text size="xs" c={stale ? 'orange' : 'dimmed'}>{updateLabel}</Text>
          </Popover.Dropdown>
        </Popover>
      </Group>
    </Stack>
  )
}
