import { useI18n } from '../i18n'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, NumberInput, Stack, Text } from '@mantine/core'
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
  const { t } = useI18n()
  const meter = task.linkedMeter!
  const asset = useQuery({
    queryKey: ['asset', task.linkedAsset?.id],
    queryFn: () => assetService.getAssetById(task.linkedAsset!.id),
    enabled: !!task.linkedAsset,
    staleTime: 60_000,
    retry: false,
  })
  const current = meter.currentReading ?? asset.data?.meters?.find(item => item.id === meter.id)?.currentReading ?? null
  // Left empty on purpose: pre-filling the last reading let typed digits merge into it (25160 became 2500125160).
  const [value, setValue] = useState<number | string>('')
  const maxAllowed = meter.maxAllowed ?? null
  const tooLow = value !== '' && current !== null && Number(value) < current
  const tooHigh = value !== '' && maxAllowed !== null && Number(value) > maxAllowed

  return (
    <Stack gap={8}>
      <NumberInput
        label={`${meter.name} ${t('reading')}`}
        description={current !== null ? `${t('Last reading:')} ${current.toLocaleString()} ${meter.unit}` : undefined}
        value={value}
        onChange={setValue}
        placeholder={current !== null ? `${t('Above')} ${current.toLocaleString()}` : undefined}
        min={current ?? 0}
        max={maxAllowed ?? undefined}
        clampBehavior="none"
        decimalScale={3}
        disabled={disabled}
        error={tooLow ? `Cannot be lower than the last reading (${current!.toLocaleString()})`
          : tooHigh ? `${t('Unusually large increase. The most this meter can read now is')} ${maxAllowed!.toLocaleString()} ${meter.unit}. ${t('Check for a typing slip.')}` : undefined}
        hideControls
        rightSectionWidth={80}
        rightSectionPointerEvents="none"
        rightSection={<Text size="xs" c="dimmed" ta="right" w="100%" pr="sm">{meter.unit}</Text>}
      />
      <Alert color="blue" variant="light" py={6}>Saving this instruction records the reading on {meter.name}.</Alert>
      <Button color="yellow" disabled={disabled || value === '' || tooLow || tooHigh} loading={loading} onClick={() => onSave(Number(value))}>{t('Save reading & continue')}</Button>
    </Stack>
  )
}
