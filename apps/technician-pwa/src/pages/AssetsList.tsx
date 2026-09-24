import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Stack, Text, Paper, Group, Badge, Button, NumberInput, TextInput } from '@mantine/core'
import { IconSearch, IconTool } from '@tabler/icons-react'
import { useState } from 'react'
import { assetService, getApiError, type AssetMeterDto } from '@cmms/api-client'
import { CMMSLoadingState, CMMSErrorState, CMMSEmptyState } from '@cmms/ui'

export default function AssetsList() {
  const [search, setSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetService.getAssets({ pageSize: 500 }),
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) return <CMMSLoadingState />
  if (error) return <CMMSErrorState message="Failed to load assets" />

  const items = data?.items || []
  const filtered = search
    ? items.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.assetCode.toLowerCase().includes(search.toLowerCase())
      )
    : items

  return (
    <Stack gap="md">
      <Text fw={700} size="xl">Assets</Text>

      <TextInput
        placeholder="Search assets..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        size="sm"
      />

      {filtered.length === 0 ? (
        <CMMSEmptyState title="No assets found" />
      ) : (
        <Stack gap="xs">
          {filtered.map((asset) => (
            <Paper key={asset.id} p="sm" radius="sm" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <IconTool size={16} color="var(--mantine-color-dimmed)" />
                  <div>
                    <Text size="sm" fw={500}>{asset.assetCode}</Text>
                    <Text size="xs" c="dimmed">{asset.name}</Text>
                  </div>
                </Group>
                <Group gap="xs"><Badge size="xs" variant="light" color={
                  asset.status === 'ACTIVE' ? 'teal' :
                  asset.status === 'MAINTENANCE' ? 'yellow' : 'gray'
                }>
                  {asset.status}
                </Badge>{asset.meters?.length ? <Button size="compact-xs" variant="light" onClick={() => setSelectedAssetId(current => current === asset.id ? null : asset.id)}>{selectedAssetId === asset.id ? 'Hide meters' : 'Record meter'}</Button> : null}</Group>
              </Group>
              {selectedAssetId === asset.id && <Stack gap="xs" mt="sm">{asset.meters?.map(meter => <MeterRecorder key={meter.id} assetId={asset.id} meter={meter} />)}</Stack>}
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

function MeterRecorder({ assetId, meter }: { assetId: string; meter: AssetMeterDto }) {
  const qc = useQueryClient()
  const [value, setValue] = useState<number | string>(meter.currentReading ?? '')
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: () => assetService.recordMeterReading(assetId, meter.id, Number(value), note),
    onSuccess: () => { setNote(''); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['technician-work-orders'] }) },
  })
  return <Paper p="xs" radius="sm" bg="var(--mantine-color-gray-light)">
    <Text size="sm" fw={600}>{meter.name}</Text>
    <Text size="xs" c="dimmed" mb="xs">Current: {meter.currentReading?.toLocaleString() ?? 'No reading'} {meter.unit}</Text>
    <NumberInput label="New reading" value={value} onChange={setValue} min={meter.currentReading ?? 0} suffix={` ${meter.unit}`} decimalScale={3} />
    <TextInput label="Note (optional)" value={note} onChange={event => setNote(event.currentTarget.value)} maxLength={500} mt="xs" />
    <Button fullWidth mt="xs" loading={save.isPending} disabled={value === '' || Number(value) < (meter.currentReading ?? 0)} onClick={() => save.mutate()}>Save meter reading</Button>
    {save.error && <Alert color="red" mt="xs">{getApiError(save.error)}</Alert>}
  </Paper>
}
