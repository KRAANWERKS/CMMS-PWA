import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core'
import { IconChevronRight, IconGauge } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { monitoringService, getApiError, type MonitoringItemDto } from '@cmms/api-client'
import { CMMSEmptyState, CMMSErrorState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'
import { ListSkeleton } from '../components/Skeletons'

interface AssetGroup { assetId: string; assetCode: string; assetName: string; points: MonitoringItemDto[] }

const freshnessLabel: Record<string, { label: string; color: string }> = {
  STALE: { label: 'Overdue', color: 'orange' },
  MISSING: { label: 'No reading yet', color: 'red' },
  FRESH: { label: 'Up to date', color: 'teal' },
}

const unitText = (unit?: string | null) => (unit && unit.toLowerCase() !== 'unspecified' ? ` ${unit}` : '')

export default function ReadingsDue() {
  const navigate = useNavigate()
  const { currentSiteId, currentSite } = useTechnicianSite()
  const query = useInfiniteQuery({
    queryKey: ['readings-due', currentSiteId],
    queryFn: ({ pageParam }) => monitoringService.getReadingsDue(currentSiteId!, pageParam),
    initialPageParam: 1,
    getNextPageParam: last => (last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined),
    enabled: !!currentSiteId,
    staleTime: 10 * 60_000,
  })

  // The server lists measurement points; technicians think in assets, so group points under their asset
  const groups = useMemo(() => {
    const byAsset = new Map<string, AssetGroup>()
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        // The server filters by status; anything it already considers fresh does not belong in a "due" list
        if (item.freshness === 'FRESH') continue
        const group = byAsset.get(item.assetId) ?? { assetId: item.assetId, assetCode: item.assetCode, assetName: item.assetName, points: [] }
        if (!group.points.some(point => point.id === item.id)) group.points.push(item)
        byAsset.set(item.assetId, group)
      }
    }
    return [...byAsset.values()]
  }, [query.data])

  if (!currentSiteId || query.isLoading) return <ListSkeleton />
  if (query.isPending && query.fetchStatus === 'paused') return <CMMSErrorState message="You're offline and this hasn't been saved on this device yet. Reconnect to load it." />
  if (query.error) return <CMMSErrorState message={getApiError(query.error, 'Failed to load readings due')} />

  const first = query.data?.pages[0]
  const total = first?.totalCount ?? 0
  const loaded = groups.reduce((count, group) => count + group.points.length, 0)

  return (
    <Stack gap="md">
      <div>
        <Text fw={750} size="xl">Readings due</Text>
        <Text size="sm" c="dimmed">{currentSite?.name ?? 'Current site'}</Text>
      </div>

      {total === 0 ? (
        <CMMSEmptyState title="Nothing is waiting for a reading" />
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {total} measurement point{total === 1 ? '' : 's'} need a fresh reading
            {first?.summary ? ` across ${first.summary.needsFreshReadingAssets} asset${first.summary.needsFreshReadingAssets === 1 ? '' : 's'}` : ''}.
            Tap an asset to open it. Readings are recorded from the work order that asks for them.
          </Text>
          <Stack gap="xs">
            {groups.map(group => (
              <Paper key={group.assetId} withBorder radius={6} p="sm" style={{ cursor: 'pointer' }} onClick={() => navigate(`/assets?search=${encodeURIComponent(group.assetCode ?? '')}&open=${group.assetId}`)}>
                <Group justify="space-between" wrap="nowrap" align="flex-start" mb={6}>
                  <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
                    <IconGauge size="1.25rem" color="var(--mantine-color-dimmed)" style={{ marginTop: 3, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600}>{group.assetCode}</Text>
                      <Text size="xs" c="dimmed">{group.assetName}</Text>
                    </div>
                  </Group>
                  <IconChevronRight size="1.25rem" color="var(--mantine-color-dimmed)" style={{ flexShrink: 0, marginTop: 3 }} />
                </Group>
                <Stack gap={6}>
                  {group.points.map(point => {
                    const fresh = freshnessLabel[point.freshness] ?? { label: point.freshness, color: 'gray' }
                    return (
                      <Group key={point.id} justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm">{point.measurement}{unitText(point.unit)}</Text>
                          <Text size="xs" c="dimmed">
                            {point.completedAt ? `Last read ${new Date(point.completedAt).toLocaleDateString()}${point.latestValue != null ? ` · ${point.latestValue}${unitText(point.unit)}` : ''}` : 'Never read'}
                          </Text>
                        </div>
                        <Badge size="xs" variant="light" color={fresh.color} style={{ flexShrink: 0 }}>{fresh.label}</Badge>
                      </Group>
                    )
                  })}
                </Stack>
              </Paper>
            ))}
          </Stack>
          {query.hasNextPage && (
            <Button variant="default" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Show more ({Math.max(0, total - loaded)} points remaining)</Button>
          )}
        </>
      )}
    </Stack>
  )
}
