import { Center, Paper, Text, Group, Stack } from '@mantine/core'
import { IconAlertCircle, IconInbox } from '@tabler/icons-react'
import loadingGearUrl from '../assets/loading-gear-v0.svg'

interface CMMSLoadingStateProps {
  label?: string
  minHeight?: number | string
  overlay?: boolean
}

export function CMMSLoadingState({
  label = 'Loading data…',
  minHeight = 220,
  overlay = true,
}: CMMSLoadingStateProps) {
  return (
    <Center
      mih={overlay ? undefined : minHeight}
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        width: '100%',
        position: overlay ? 'fixed' : 'relative',
        inset: overlay ? 0 : undefined,
        zIndex: overlay ? 3000 : undefined,
        minHeight: overlay ? undefined : minHeight,
        background: overlay ? 'rgba(8, 14, 18, 0.28)' : 'rgba(8, 14, 18, 0.06)',
        backdropFilter: overlay ? 'blur(2.5px)' : 'blur(1px)',
      }}
    >
      <Stack align="center" gap={6}>
        <img
          src={loadingGearUrl}
          width={88}
          height={88}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{
            display: 'block',
            filter: overlay ? 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.28))' : undefined,
          }}
        />
        <Text size="xs" c={overlay ? 'white' : 'dimmed'} fw={500}>
          {label}
        </Text>
      </Stack>
    </Center>
  )
}

export function CMMSErrorState({ message = 'Failed to load data' }: { message?: string }) {
  return (
    <Paper p="xl" radius="sm" withBorder style={{ textAlign: 'center', borderColor: 'var(--mantine-color-red-3)' }}>
      <Group justify="center" mb="xs">
        <IconAlertCircle size={32} color="var(--mantine-color-red-6)" />
      </Group>
      <Text fw={600} size="md" c="red">Error</Text>
      <Text size="sm" c="dimmed">{message}</Text>
    </Paper>
  )
}

export function CMMSEmptyState({ title = 'No data found', description = 'Try adjusting your search or filters' }: { title?: string; description?: string }) {
  return (
    <Paper p="xl" radius="sm" withBorder style={{ textAlign: 'center' }}>
      <Group justify="center" mb="xs">
        <IconInbox size={32} color="var(--mantine-color-dimmed)" />
      </Group>
      <Text fw={600} size="md">{title}</Text>
      <Text size="sm" c="dimmed">{description}</Text>
    </Paper>
  )
}
