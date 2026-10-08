import { Box, Button, Group, Popover, Stack, Text, UnstyledButton } from '@mantine/core'
import { db } from '../db/schema'
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
  const { state, lastSyncedAt, pendingCount, failed } = useConnectionStatus()
  const { label, color, detail } = display[state]
  const shownLabel = pendingCount > 0 ? `${label} · ${pendingCount} to sync` : label

  return (
    <Popover width={280} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton aria-label={`Connection status: ${shownLabel}`} px={12} py={8} style={{ borderRadius: 999, border: '1px solid var(--mantine-color-default-border)' }}>
          <Group gap={6} wrap="nowrap">
            <Box w={12} h={12} style={{ borderRadius: 999, background: color, flexShrink: 0 }} />
            <Text size="sm" fw={700} visibleFrom="sm">{shownLabel}</Text>
          </Group>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm" fw={650}>{label}</Text>
        <Text size="xs" c="dimmed" mt={2}>{detail}</Text>
        <Text size="xs" mt="xs">{formatSynced(lastSyncedAt)}</Text>
        {pendingCount > 0 && <Text size="xs" mt={4} fw={600}>{pendingCount} change{pendingCount === 1 ? '' : 's'} saved on this device, waiting to sync.</Text>}
        {failed.length > 0 && (
          <Stack gap={6} mt="sm">
            <Text size="xs" fw={700} c="red">{failed.length} change{failed.length === 1 ? ' was' : 's were'} rejected by the server</Text>
            {failed.map(entry => (
              <Group key={entry.id} justify="space-between" wrap="nowrap" align="flex-start">
                <Text size="xs" c="dimmed">{entry.action.toLowerCase()}: {entry.error}</Text>
                <Button size="sm" variant="subtle" color="gray" onClick={() => db.outbox.delete(entry.id!)}>Dismiss</Button>
              </Group>
            ))}
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  )
}
