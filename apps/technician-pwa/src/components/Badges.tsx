import { Badge, type BadgeProps } from '@mantine/core'

type Size = BadgeProps['size']

const statusStyle: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'gray' },
  ASSIGNED: { label: 'Assigned', color: 'violet' },
  IN_PROGRESS: { label: 'In progress', color: 'blue' },
  ON_HOLD: { label: 'On hold', color: 'orange' },
  COMPLETED: { label: 'Done', color: 'teal' },
}

const priorityStyle: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Critical', color: 'red' },
  HIGH: { label: 'High', color: 'orange' },
  MEDIUM: { label: 'Medium', color: 'yellow' },
  LOW: { label: 'Low', color: 'gray' },
}

export const priorityColor = (priority: string) => priorityStyle[priority]?.color ?? 'gray'

const humanize = (value: string) => {
  const text = value.replace(/_/g, ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Work order status. Dot style keeps it visually distinct from the priority badge. */
export function StatusBadge({ status, size = 'sm' }: { status: string; size?: Size }) {
  const style = statusStyle[status] ?? { label: humanize(status), color: 'gray' }
  return <Badge size={size} variant="dot" color={style.color} tt="none">{style.label}</Badge>
}

/** Work order priority. */
export function PriorityBadge({ priority, size = 'sm' }: { priority: string; size?: Size }) {
  const style = priorityStyle[priority] ?? { label: humanize(priority), color: 'gray' }
  return <Badge size={size} variant="light" color={style.color} tt="none">{style.label}</Badge>
}
