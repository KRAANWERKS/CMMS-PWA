import { Group, Paper, Skeleton, Stack } from '@mantine/core'

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack gap="xs" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Paper key={index} p="md" radius={6} withBorder>
          <Group justify="space-between" mb={8}><Skeleton h={14} w="35%" /><Skeleton h={14} w={56} /></Group>
          <Skeleton h={12} w="80%" mb={6} />
          <Skeleton h={10} w="40%" />
        </Paper>
      ))}
    </Stack>
  )
}

export function DetailSkeleton() {
  return (
    <Stack gap="md" aria-busy="true" aria-label="Loading">
      <Skeleton h={26} w="70%" />
      <Skeleton h={14} w="40%" />
      <Skeleton h={10} radius="xl" />
      <ListSkeleton rows={3} />
    </Stack>
  )
}
