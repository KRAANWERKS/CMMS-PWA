import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Group, NumberInput, Paper, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconClipboardList, IconSearch, IconTool } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { assetService, getApiError, type AssetDto, type AssetMeterDto, type GetAssetsResponse } from '@cmms/api-client'
import { CMMSEmptyState, CMMSErrorState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'
import { ListSkeleton } from '../components/Skeletons'
import { applyMeterEntry, submitChange } from '../db/sync'

const PAGE_STEP = 20
const statusColor = (status: string) => status === 'ACTIVE' ? 'teal' : status === 'MAINTENANCE' ? 'yellow' : 'gray'
const healthColor: Record<string, string> = { GOOD: 'teal', WATCH: 'yellow', BAD: 'red' }

export default function AssetsList() {
  const { currentSiteId } = useTechnicianSite()
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search.trim().toLowerCase(), 250)
  const [visible, setVisible] = useState(PAGE_STEP)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  const { data, isLoading, isPending, fetchStatus, error } = useQuery({
    queryKey: ['assets', currentSiteId],
    queryFn: () => assetService.getAssets({ siteId: currentSiteId!, pageSize: 500 }),
    enabled: !!currentSiteId,
    staleTime: 10 * 60 * 1000,
  })
  useEffect(() => setVisible(PAGE_STEP), [debounced])

  if (!currentSiteId || isLoading) return <ListSkeleton />
  if (isPending && fetchStatus === 'paused') return <CMMSErrorState message="You're offline and this hasn't been saved on this device yet. Reconnect to load it." />
  if (error) return <CMMSErrorState message="Failed to load assets" />

  const items = data?.items || []
  const filtered = debounced ? items.filter(a => `${a.name} ${a.assetCode}`.toLowerCase().includes(debounced)) : items
  const shown = filtered.slice(0, visible)

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={750} size="xl">Assets</Text>
        <Text size="xs" c="dimmed">{filtered.length} asset{filtered.length === 1 ? '' : 's'}</Text>
      </Group>

      <TextInput
        placeholder="Search assets..."
        aria-label="Search assets"
        leftSection={<IconSearch size="1.25rem" />}
        value={search}
        onChange={e => setSearch(e.currentTarget.value)}
      />

      {filtered.length === 0 ? (
        <CMMSEmptyState title={debounced ? 'No assets match your search' : 'No assets at this site'} />
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs" style={{ alignItems: 'start' }}>
            {shown.map(asset => <AssetCard key={asset.id} asset={asset} expanded={selectedAssetId === asset.id} onToggle={() => setSelectedAssetId(current => current === asset.id ? null : asset.id)} />)}
          </SimpleGrid>
          {filtered.length > shown.length && (
            <Button variant="default" onClick={() => setVisible(count => count + PAGE_STEP)}>Show more ({filtered.length - shown.length} remaining)</Button>
          )}
        </>
      )}
    </Stack>
  )
}

function AssetCard({ asset, expanded, onToggle }: { asset: AssetDto; expanded: boolean; onToggle: () => void }) {
  const navigate = useNavigate()
  const condition = asset.health?.conditionStatus
  const details = [asset.manufacturer, asset.model].filter(Boolean).join(' · ')
  return (
    <Paper p="sm" radius={6} withBorder>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          <IconTool size="1.25rem" color="var(--mantine-color-dimmed)" style={{ marginTop: 3, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={500}>{asset.assetCode}</Text>
            <Text size="xs" c="dimmed">{asset.name}</Text>
            {details && <Text size="xs" c="dimmed">{details}</Text>}
          </div>
        </Group>
        <Stack gap={4} align="flex-end">
          <Badge size="xs" variant="light" color={statusColor(asset.status)}>{asset.status}</Badge>
          {condition && condition !== 'NO_DATA' && <Badge size="xs" variant="dot" color={healthColor[condition] ?? 'gray'}>{condition}</Badge>}
        </Stack>
      </Group>
      <Group gap="xs" mt="xs">
        <Button size="md" variant="subtle" color="gray" leftSection={<IconClipboardList size="1.125rem" />} onClick={() => navigate(`/work-orders?asset=${asset.id}`)}>Work orders</Button>
        {asset.meters?.length ? <Button size="md" variant="light" onClick={onToggle}>{expanded ? 'Hide meters' : 'Record meter'}</Button> : null}
      </Group>
      {expanded && <Stack gap="xs" mt="sm">{asset.meters?.map(meter => <MeterRecorder key={meter.id} assetId={asset.id} meter={meter} />)}</Stack>}
    </Paper>
  )
}

function MeterRecorder({ assetId, meter }: { assetId: string; meter: AssetMeterDto }) {
  const qc = useQueryClient()
  const [value, setValue] = useState<number | string>(meter.currentReading ?? '')
  const [note, setNote] = useState('')
  const [queued, setQueued] = useState(false)
  const save = useMutation({
    mutationFn: async () => {
      const outcome = await submitChange({ action: 'METER', assetId, payload: { meterId: meter.id, value: Number(value), note, readingAt: new Date().toISOString() } }, saved => {
        qc.setQueriesData<GetAssetsResponse>({ queryKey: ['assets'] }, current => applyMeterEntry(current, saved))
      })
      setQueued(outcome === 'queued')
    },
    onSuccess: () => setNote(''),
    onError: () => { void qc.invalidateQueries({ queryKey: ['assets'] }) },
  })
  return <Paper p="xs" radius="sm" bg="var(--mantine-color-gray-light)">
    <Text size="sm" fw={600}>{meter.name}</Text>
    <Text size="xs" c="dimmed" mb="xs">Current: {meter.currentReading?.toLocaleString() ?? 'No reading'} {meter.unit}</Text>
    <NumberInput label="New reading" value={value} onChange={setValue} min={meter.currentReading ?? 0} suffix={` ${meter.unit}`} decimalScale={3} />
    <TextInput label="Note (optional)" value={note} onChange={event => setNote(event.currentTarget.value)} maxLength={500} mt="xs" />
    <Button fullWidth mt="xs" loading={save.isPending} disabled={value === '' || Number(value) < (meter.currentReading ?? 0)} onClick={() => save.mutate()}>Save meter reading</Button>
    {save.isSuccess && queued && <Alert color="blue" mt="xs">Saved on this device. It will sync when you're back online.</Alert>}
    {save.error && <Alert color="red" mt="xs">{getApiError(save.error)}</Alert>}
  </Paper>
}
