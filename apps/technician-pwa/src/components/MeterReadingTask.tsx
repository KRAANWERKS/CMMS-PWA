import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, NumberInput, Stack } from '@mantine/core'
import { assetService, type WorkOrderDto } from '@cmms/api-client'

type Task = WorkOrderDto['tasks'][number]

interface Props {
  task: Task
  disabled: boolean
  loading: boolean
  onSave: (value: number) => void
}

// A checkbox instruction that is tied to a meter ("record the current hour meter reading"):
// the technician enters the reading, which is saved against the meter and the work order.
export function MeterReadingTask({ task, disabled, loading, onSave }: Props) {
  const meter = task.linkedMeter!
  const asset = useQuery({
    queryKey: ['asset', task.linkedAsset?.id],
    queryFn: () => assetService.getAssetById(task.linkedAsset!.id),
    enabled: !!task.linkedAsset,
    staleTime: 60_000,
    retry: false,
  })
  const current = asset.data?.meters?.find(item => item.id === meter.id)?.currentReading ?? null
  const [value, setValue] = useState<number | string>('')
  const tooLow = value !== '' && current !== null && Number(value) < current

  return (
    <Stack gap={8}>
      <NumberInput
        label={`${meter.name} reading (${meter.unit})`}
        description={current !== null ? `Last reading: ${current.toLocaleString()} ${meter.unit}` : undefined}
        value={value}
        onChange={setValue}
        min={current ?? 0}
        decimalScale={3}
        disabled={disabled}
        error={tooLow ? `Cannot be lower than the last reading (${current!.toLocaleString()})` : undefined}
        rightSection={meter.unit}
      />
      <Alert color="blue" variant="light" py={6}>Saving this instruction records the reading on {meter.name}.</Alert>
      <Button color="yellow" c="#111827" disabled={disabled || value === '' || tooLow} loading={loading} onClick={() => onSave(Number(value))}>Save reading & continue</Button>
    </Stack>
  )
}
