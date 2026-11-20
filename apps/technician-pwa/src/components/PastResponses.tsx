import { useState } from 'react'
import { formatDate, formatDateTime } from '@cmms/ui'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ActionIcon, Badge, Button, Group, Loader, Modal, Stack, Text } from '@mantine/core'
import { IconChevronRight, IconHistory } from '@tabler/icons-react'
import { getApiError, workOrderService, type WorkOrderDto } from '@cmms/api-client'
import { useI18n } from '../i18n'

type Instruction = WorkOrderDto['tasks'][number]

/** "View past responses" for the open instruction: earlier answers and readings, each linked to its work order. */
export function PastResponses({ workOrderId, task }: { workOrderId: string, task: Instruction }) {
  const { t } = useI18n()
  const [opened, setOpened] = useState(false)
  const online = typeof navigator === 'undefined' || navigator.onLine
  const history = useQuery({
    queryKey: ['work-order', workOrderId, 'past-responses', task.id],
    queryFn: () => workOrderService.getPastResponses(workOrderId, task.id, {
      meterId: task.linkedMeter?.id, measurementPointId: task.linkedMeasurementPoint?.id,
    }),
    enabled: opened && online,
    staleTime: 60_000,
  })
  const items = history.data ?? []

  return <>
    <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconHistory size={13} />} onClick={() => setOpened(true)}>
      {t('Past responses')}
    </Button>
    <Modal opened={opened} onClose={() => setOpened(false)} title={<Text fw={650} size="sm">{t('Past responses')}</Text>} size="md">
      <Text size="xs" c="dimmed" mb="xs">{task.description}</Text>
      {!online && <Text size="sm" c="dimmed">{t('Past responses need a connection.')}</Text>}
      {history.isLoading && <Group justify="center" p="sm"><Loader size="sm" /></Group>}
      {history.error && <Text size="sm" c="red">{getApiError(history.error)}</Text>}
      {history.isSuccess && items.length === 0 && <Text size="sm" c="dimmed">{t('No earlier responses for this instruction.')}</Text>}
      <Stack gap={0}>
        {items.map((item, index) => <Group key={`${item.at}-${index}`} justify="space-between" wrap="nowrap" gap="xs" py={8}
          style={{ borderTop: index === 0 ? undefined : '1px solid var(--mantine-color-default-border)' }}>
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={650}>{task.responseType === 'DATE' ? formatDate(item.value) : item.value}{item.unit ? ` ${item.unit}` : ''}</Text>
            <Text size="xs" c="dimmed">
              {formatDateTime(item.at)}
              {item.recordedBy ? ` · ${item.recordedBy}` : ''}
              {item.workOrderNumber ? ` · ${item.workOrderNumber}` : ''}
            </Text>
          </div>
          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            {item.source === 'LIMBLE' && <Badge size="xs" variant="light" color="grape">Limble</Badge>}
            {item.workOrderId && item.workOrderId !== workOrderId && <ActionIcon component={Link} to={`/work-orders/${item.workOrderId}`} onClick={() => setOpened(false)}
              size="md" variant="subtle" aria-label={`${t('Open work order')} ${item.workOrderNumber ?? ''}`}>
              <IconChevronRight size={16} />
            </ActionIcon>}
          </Group>
        </Group>)}
      </Stack>
    </Modal>
  </>
}
