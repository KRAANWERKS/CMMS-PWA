import { Box, Group, Paper, Text, ThemeIcon } from '@mantine/core'
import { useI18n } from '../i18n'
import { IconAlertTriangle, IconCalendarDue, IconCircleCheck, IconClock } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import type { WorkOrderDto } from '@cmms/api-client'
import { PriorityBadge, StatusBadge, priorityColor } from './Badges'

const inactiveStatuses = new Set(['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'])
const statusIcon: Record<string, typeof IconClock> = { OPEN: IconClock, ASSIGNED: IconClock, IN_PROGRESS: IconAlertTriangle, COMPLETED: IconCircleCheck, VERIFIED: IconCircleCheck, CLOSED: IconCircleCheck }

// Use the site-local calendar due date returned by the API, matching the admin
// Work Orders view. A WO due today is not shown as past due mid-day.
function calendarDueDays(value?: string | null): number | null {
  if (!value) return null
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  const dueDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((dueDay - currentDay) / 86_400_000)
}

export const isOverdue = (wo: WorkOrderDto) => {
  if (inactiveStatuses.has(wo.status)) return false
  const days = calendarDueDays(wo.dueDate || wo.scheduledEnd)
  return days !== null && days < 0
}
const shortDate = (value: string) => new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString([], { day: 'numeric', month: 'short' })

function dueLabel(value: string, overdue: boolean, t: (key: string) => string) {
  const days = calendarDueDays(value)
  if (days === null) return t('Due date unavailable')
  if (overdue) {
    const count = Math.abs(days)
    return t('Past due') + ' · ' + count + ' day' + (count === 1 ? '' : 's') + ' · ' + shortDate(value)
  }
  if (days === 0) return t('Due today') + ' · ' + shortDate(value)
  return t('Due in') + ' ' + days + ' day' + (days === 1 ? '' : 's') + ' · ' + shortDate(value)
}

export function WorkOrderCard({ wo }: { wo: WorkOrderDto }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const done = inactiveStatuses.has(wo.status)
  const overdue = isOverdue(wo)
  const Icon = statusIcon[wo.status] || IconClock
  const color = priorityColor(wo.priority)
  const open = () => navigate('/work-orders/' + wo.id)

  return (
    <Paper
      p="md"
      radius={6}
      withBorder
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open() } }}
      style={{ cursor: 'pointer', minHeight: 84, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}
    >
      <Group justify="space-between" mb={5} gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
        <Group gap={7} wrap="nowrap" style={{ minWidth: 0, flex: '1 1 0' }}>
          <ThemeIcon size="md" variant="light" color={done ? 'teal' : color} style={{ flexShrink: 0 }}><Icon size={16} /></ThemeIcon>
          <Text fw={700} size="sm" truncate style={{ minWidth: 0 }}>{wo.number}</Text>
        </Group>
        <Box style={{ flexShrink: 0 }}><PriorityBadge priority={wo.priority} size="xs" /></Box>
      </Group>
      <Text size="sm" fw={550} lineClamp={2} style={{ minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        {wo.title}
      </Text>
      <Group justify="space-between" gap="xs" mt={5} wrap="nowrap" style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed" truncate style={{ minWidth: 0, flex: '1 1 0' }}>{wo.assetName || wo.workType}</Text>
        <Box style={{ flexShrink: 0 }}><StatusBadge status={wo.status} size="xs" /></Box>
      </Group>
      {!done && (wo.dueDate || wo.scheduledEnd) && (
        <Group gap={6} mt={8} wrap="nowrap" align="center">
          <IconCalendarDue size="1.125rem" style={{ flexShrink: 0, display: 'block' }} color={overdue ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dimmed)'} />
          <Text size="xs" lh={1.25} style={{ position: 'relative', top: 1, minWidth: 0, overflowWrap: 'anywhere' }} fw={overdue ? 600 : 400} c={overdue ? 'red.7' : 'dimmed'}>{dueLabel(wo.dueDate || wo.scheduledEnd!, overdue, t)}</Text>
        </Group>
      )}
    </Paper>
  )
}
