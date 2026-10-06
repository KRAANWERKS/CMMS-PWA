import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Group, NumberInput, Paper, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconClipboardList, IconGauge, IconSearch, IconTool } from '@tabler/icons-react'
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
    queryFn: () => assetService.getAllAssets(currentSiteId!),
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
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs" style={{ gridAutoFlow: 'row dense' }}>
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
    // Cards in a row share one height with the buttons pinned to the bottom; an open meter form takes the full row
    <Paper p="sm" radius={6} withBorder style={{ display: 'flex', flexDirection: 'column', gridColumn: expanded ? '1 / -1' : undefined }}>
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
      <Group justify="space-between" gap="xs" mt="auto" pt="xs">
        <Button size="sm" h={44} variant="default" styles={{ section: { display: 'flex', alignItems: 'center' }, label: { lineHeight: 1 } }} leftSection={<IconClipboardList size="1.25rem" style={{ display: 'block' }} />} onClick={() => navigate(`/work-orders?asset=${asset.id}`)}>Work orders</Button>
        <Button size="sm" h={44} variant="subtle" onClick={() => navigate(`/work-requests/new?asset=${asset.id}`)}>Report issue</Button>
        {asset.meters?.length ? (
          <Button size="sm" h={44} color="yellow" c="#111827" fw={700} styles={{ section: { display: 'flex', alignItems: 'center' }, label: { lineHeight: 1 } }} leftSection={<IconGauge size="1.25rem" style={{ display: 'block' }} />} aria-expanded={expanded} onClick={onToggle}>{expanded ? 'Hide meters' : 'Record meter'}</Button>
        ) : null}
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
