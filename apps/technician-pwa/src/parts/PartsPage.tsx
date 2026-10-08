import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconPackage, IconSearch } from '@tabler/icons-react'
import { sparePartService } from '@cmms/api-client'
import { CMMSEmptyState, CMMSErrorState } from '@cmms/ui'
import { ListSkeleton } from '../components/Skeletons'

const PAGE_STEP = 20

export default function PartsPage() {
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search.trim().toLowerCase(), 250)
  const [visible, setVisible] = useState(PAGE_STEP)

  const { data, isLoading, isPending, fetchStatus, error } = useQuery({
    queryKey: ['spare-parts'],
    queryFn: () => sparePartService.getAllSpareParts(),
    staleTime: 10 * 60 * 1000,
  })
  // Stock is a nice-to-have: the list still works if balances are unavailable
  const balances = useQuery({ queryKey: ['spare-part-balances'], queryFn: sparePartService.getBalances, staleTime: 5 * 60 * 1000, retry: false })
  const stockByPart = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of balances.data ?? []) map.set(row.partNumber, (map.get(row.partNumber) ?? 0) + row.quantityOnHand - row.quantityReserved)
    return map
  }, [balances.data])
  useEffect(() => setVisible(PAGE_STEP), [debounced])

  if (isLoading) return <ListSkeleton />
  if (isPending && fetchStatus === 'paused') return <CMMSErrorState message="You're offline and this hasn't been saved on this device yet. Reconnect to load it." />
  if (error) return <CMMSErrorState message="Failed to load parts" />

  const items = data?.items || []
  const filtered = debounced ? items.filter(p => `${p.name} ${p.partNumber} ${p.manufacturer ?? ''}`.toLowerCase().includes(debounced)) : items
  const shown = filtered.slice(0, visible)

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={750} size="xl">Parts</Text>
        <Text size="xs" c="dimmed">{filtered.length} part{filtered.length === 1 ? '' : 's'}</Text>
      </Group>

      <TextInput
        placeholder="Search parts..."
        aria-label="Search parts"
        leftSection={<IconSearch size="1.25rem" />}
        value={search}
        onChange={e => setSearch(e.currentTarget.value)}
      />

      {filtered.length === 0 ? (
        <CMMSEmptyState title={debounced ? 'No parts match your search' : 'No parts available'} />
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
            {shown.map(part => {
              const stock = stockByPart.get(part.partNumber)
              const known = stock !== undefined
              const out = known && stock <= 0
              const low = known && !out && part.reorderPoint > 0 && stock <= part.reorderPoint
              return (
                <Paper key={part.id} p="sm" radius={6} withBorder>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
                      <IconPackage size="1.25rem" color="var(--mantine-color-dimmed)" style={{ marginTop: 3, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500}>{part.partNumber}</Text>
                        <Text size="xs" c="dimmed">{part.name}</Text>
                        {part.manufacturer && <Text size="xs" c="dimmed">{part.manufacturer}</Text>}
                      </div>
                    </Group>
                    <Stack gap={4} align="flex-end">
                      <Badge size="xs" variant="light" color={part.verificationStatus === 'VERIFIED' ? 'teal' : part.verificationStatus === 'OBSOLETE' ? 'red' : 'gray'}>{part.verificationStatus}</Badge>
                      {known && <Badge size="xs" variant="light" color={out ? 'red' : low ? 'orange' : 'teal'}>{out ? 'Out of stock' : low ? `Low · ${stock} ${part.uom}` : `${stock} ${part.uom} in stock`}</Badge>}
                      {!known && <Text size="xs" c="dimmed">{part.uom}</Text>}
                    </Stack>
                  </Group>
                </Paper>
              )
            })}
          </SimpleGrid>
          {filtered.length > shown.length && (
            <Button variant="default" onClick={() => setVisible(count => count + PAGE_STEP)}>Show more ({filtered.length - shown.length} remaining)</Button>
          )}
        </>
      )}
    </Stack>
  )
}
