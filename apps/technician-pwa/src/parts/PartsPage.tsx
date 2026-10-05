import { useQuery } from '@tanstack/react-query'
import { Badge, SimpleGrid, Stack, Text, Paper, Group, TextInput } from '@mantine/core'
import { IconSearch, IconPackage } from '@tabler/icons-react'
import { useState } from 'react'
import { sparePartService } from '@cmms/api-client'
import { CMMSLoadingState, CMMSErrorState, CMMSEmptyState } from '@cmms/ui'

export default function PartsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['spare-parts'],
    queryFn: () => sparePartService.getSpareParts({ pageSize: 100 }),
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) return <CMMSLoadingState />
  if (error) return <CMMSErrorState message="Failed to load parts" />

  const items = data?.items || []
  const filtered = search
    ? items.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.partNumber.toLowerCase().includes(search.toLowerCase())
      )
    : items

  return (
    <Stack gap="md">
      <Text fw={750} size="xl">Parts</Text>

      <TextInput
        placeholder="Search parts..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        size="sm"
      />

      {filtered.length === 0 ? (
        <CMMSEmptyState title="No parts found" />
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs" style={{ alignItems: 'start' }}>
          {filtered.map((part) => (
            <Paper key={part.id} p="sm" radius={6} withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <IconPackage size={16} color="var(--mantine-color-dimmed)" />
                  <div>
                    <Text size="sm" fw={500}>{part.partNumber}</Text>
                    <Text size="xs" c="dimmed">{part.name}</Text>
                    {part.manufacturer && <Text size="xs" c="dimmed">{part.manufacturer}</Text>}
                  </div>
                </Group>
                <Stack gap={4} align="flex-end">
                  <Badge size="xs" variant="light" color={part.verificationStatus === 'VERIFIED' ? 'teal' : part.verificationStatus === 'OBSOLETE' ? 'red' : 'gray'}>{part.verificationStatus}</Badge>
                  <Text size="xs" c="dimmed">{part.uom}</Text>
                </Stack>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
