import { useQuery } from '@tanstack/react-query'
import { Badge, Group, Loader, Stack, Text } from '@mantine/core'
import { workOrderService } from '@cmms/api-client'

export function WorkOrderHistory({ workOrderId, enabled }: { workOrderId: string; enabled: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['work-order-history', workOrderId],
    queryFn: () => workOrderService.getHistory(workOrderId),
    enabled,
    staleTime: 30_000,
    retry: false,
  })
  if (isLoading) return <Loader size="xs" />
  if (error) return <Text size="sm" c="dimmed">History is unavailable right now.</Text>
  if (!data?.length) return <Text size="sm" c="dimmed">No history yet.</Text>
  return (
    <Stack gap="sm">
      {[...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(entry => (
        <Stack key={entry.id} gap={2}>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed">{new Date(entry.createdAt).toLocaleString()}</Text>
            {entry.kind && <Badge size="xs" variant="light" color="gray">{entry.kind.replace(/_/g, ' ')}</Badge>}
          </Group>
          <Text size="sm">{entry.comment.replace(/^\[[A-Z_]+\]\s*/, '')}</Text>
          {entry.authorDisplayName && <Text size="xs" c="dimmed">{entry.authorDisplayName}</Text>}
        </Stack>
      ))}
    </Stack>
  )
}
