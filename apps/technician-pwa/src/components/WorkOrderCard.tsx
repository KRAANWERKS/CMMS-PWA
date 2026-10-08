import { Group, Paper, Text, ThemeIcon } from '@mantine/core'
import { IconAlertTriangle, IconCalendarDue, IconCircleCheck, IconClock } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import type { WorkOrderDto } from '@cmms/api-client'
import { PriorityBadge, StatusBadge, priorityColor } from './Badges'

const statusIcon: Record<string, typeof IconClock> = { OPEN: IconClock, ASSIGNED: IconClock, IN_PROGRESS: IconAlertTriangle, COMPLETED: IconCircleCheck }

export const isOverdue = (wo: WorkOrderDto) => !!wo.scheduledEnd && wo.status !== 'COMPLETED' && new Date(wo.scheduledEnd).getTime() < Date.now()
const shortDate = (value: string) => new Date(value).toLocaleDateString([], { day: 'numeric', month: 'short' })

function dueLabel(value: string, overdue: boolean) {
  if (!overdue) return `Due ${shortDate(value)}`
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  return days < 1 ? `Overdue · due ${shortDate(value)}` : `Overdue by ${days} day${days === 1 ? '' : 's'} · ${shortDate(value)}`
}

export function WorkOrderCard({ wo }: { wo: WorkOrderDto }) {
  const navigate = useNavigate()
  const done = wo.status === 'COMPLETED'
  const overdue = isOverdue(wo)
  const Icon = statusIcon[wo.status] || IconClock
  const color = priorityColor(wo.priority)
  const open = () => navigate(`/work-orders/${wo.id}`)

  return (
    <Paper
      p="md"
      radius={6}
      withBorder
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open() } }}
      style={{ cursor: 'pointer', minHeight: 84 }}
    >
      <Group justify="space-between" mb={5} wrap="nowrap">
        <Group gap={7} wrap="nowrap">
          <ThemeIcon size="md" variant="light" color={done ? 'teal' : color}><Icon size={16} /></ThemeIcon>
          <Text fw={700} size="sm">{wo.number}</Text>
        </Group>
        <PriorityBadge priority={wo.priority} size="xs" />
      </Group>
      <Text size="sm" fw={550} lineClamp={2}>{wo.title}</Text>
      <Group justify="space-between" mt={5} wrap="nowrap">
        <Text size="xs" c="dimmed" truncate>{wo.assetName || wo.workType}</Text>
        <StatusBadge status={wo.status} size="xs" />
      </Group>
      {!done && wo.scheduledEnd && (
        <Group gap={6} mt={8} wrap="nowrap" align="center">
          <IconCalendarDue size="1.125rem" style={{ flexShrink: 0, display: 'block' }} color={overdue ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dimmed)'} />
          <Text size="xs" lh={1} style={{ position: 'relative', top: 1 }} fw={overdue ? 600 : 400} c={overdue ? 'red.7' : 'dimmed'}>{dueLabel(wo.scheduledEnd, overdue)}</Text>
        </Group>
      )}
    </Paper>
  )
}
