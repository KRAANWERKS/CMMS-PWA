import { Box, Group, Popover, Text, UnstyledButton } from '@mantine/core'
import { useConnectionStatus, type ConnectionState } from '../hooks/useConnectionStatus'

const display: Record<ConnectionState, { label: string; color: string; detail: string }> = {
  online: { label: 'Online', color: 'var(--mantine-color-teal-6)', detail: 'Connected. Data is up to date.' },
  syncing: { label: 'Syncing', color: 'var(--mantine-color-blue-6)', detail: 'Refreshing data from the server.' },
  unreachable: { label: 'No server', color: 'var(--mantine-color-orange-6)', detail: 'Your device has a network, but the CMMS server did not respond. Showing saved data.' },
  offline: { label: 'Offline', color: 'var(--mantine-color-red-6)', detail: 'No network. Showing saved data; changes are disabled until you reconnect.' },
}

export function formatSynced(timestamp: number | null) {
  if (!timestamp) return 'Not synced yet'
  const date = new Date(timestamp)
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toDateString() === new Date().toDateString() ? `Last synced ${time}` : `Last synced ${date.toLocaleDateString()} ${time}`
}

export function ConnectionIndicator() {
  const { state, lastSyncedAt } = useConnectionStatus()
  const { label, color, detail } = display[state]

  return (
    <Popover width={240} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton aria-label={`Connection status: ${label}`} px={8} py={4} style={{ borderRadius: 999, border: '1px solid var(--mantine-color-default-border)' }}>
          <Group gap={6} wrap="nowrap">
            <Box w={8} h={8} style={{ borderRadius: 999, background: color, flexShrink: 0 }} />
            <Text size="xs" fw={600} visibleFrom="sm">{label}</Text>
          </Group>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm" fw={650}>{label}</Text>
        <Text size="xs" c="dimmed" mt={2}>{detail}</Text>
        <Text size="xs" mt="xs">{formatSynced(lastSyncedAt)}</Text>
      </Popover.Dropdown>
    </Popover>
  )
}
