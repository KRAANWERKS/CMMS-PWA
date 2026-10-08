import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Chip, Group, Pagination, Paper, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconCircleCheck, IconClipboardList, IconSearch, IconX } from '@tabler/icons-react'
import { Link, useSearchParams } from 'react-router-dom'
import { workOrderService } from '@cmms/api-client'
import { CMMSErrorState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'
import { ListSkeleton } from '../components/Skeletons'
import { WorkOrderCard } from '../components/WorkOrderCard'

const PAGE_SIZE = 25
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function AssignedWorkOrders() {
  const queryClient = useQueryClient()
  const { currentSiteId, currentSite } = useTechnicianSite()
  const [searchParams, setSearchParams] = useSearchParams()
  const assetId = searchParams.get('asset') ?? undefined
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<string | null>(null)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300)

  const filtered = !!(debouncedSearch || priority || overdueOnly || assetId)
  const filterKey = [debouncedSearch, priority, overdueOnly, assetId]
  useEffect(() => setPage(1), [debouncedSearch, priority, overdueOnly, assetId])

  const openQuery = useQuery({
    queryKey: ['technician-work-orders', currentSiteId, 'open', page, ...filterKey],
    queryFn: () => workOrderService.getWorkOrders({
      siteId: currentSiteId!, view: 'open', page, pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined, priority: priority ?? undefined, overdue: overdueOnly || undefined, assetId,
    }),
    enabled: !!currentSiteId,
    placeholderData: previous => previous,
    staleTime: 2 * 60 * 1000,
  })

  const completedQuery = useQuery({
    queryKey: ['technician-work-orders', currentSiteId, 'completed'],
    queryFn: () => workOrderService.getWorkOrders({ siteId: currentSiteId!, view: 'completed', page: 1, pageSize: 3 }),
    enabled: !!currentSiteId,
    staleTime: 2 * 60 * 1000,
  })

  // Save each listed work order's detail so it can be opened offline
  const listedIds = (openQuery.data?.items ?? []).map(wo => wo.id).join(',')
  useEffect(() => {
    if (!listedIds || !navigator.onLine) return
    for (const id of listedIds.split(',')) {
      void queryClient.prefetchQuery({ queryKey: ['work-order', id], queryFn: () => workOrderService.getWorkOrderById(id) })
    }
  }, [listedIds, queryClient])

  const clearFilters = () => {
    setSearch(''); setPriority(null); setOverdueOnly(false)
    if (assetId) setSearchParams({}, { replace: true })
  }

  if (!currentSiteId || (openQuery.isLoading && !openQuery.data)) return <ListSkeleton />
  if (openQuery.isPending && openQuery.fetchStatus === 'paused') return <CMMSErrorState message="You're offline and this hasn't been saved on this device yet. Reconnect to load it." />
  if (openQuery.error || completedQuery.error) {
    return <CMMSErrorState message="Failed to load assigned work orders. Check CMMS connectivity and try again." />
  }

  const openItems = openQuery.data?.items ?? []
  const completedItems = completedQuery.data?.items ?? []
  const openTotal = openQuery.data?.totalCount ?? 0
  const completedTotal = completedQuery.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(openTotal / PAGE_SIZE))
  const assetName = openItems[0]?.assetName

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={750} size="xl">My Work</Text>
          <Text size="sm" c="dimmed">{currentSite?.name ?? 'Current site'}</Text>
        </div>
        <Stack gap={6} align="flex-end">
          {!filtered && <Badge variant="light" color="gray">{openTotal + completedTotal} total</Badge>}
          <Button component={Link} to="/work-requests/new" size="xs" variant="light">Report issue</Button>
        </Stack>
      </Group>

      {!filtered && (
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
          <Paper p="md" radius={6} withBorder>
            <Group gap="md" wrap="nowrap">
              <IconClipboardList size="1.625rem" />
              <div>
                <Text size="xs" c="dimmed" mb={2}>Open</Text>
                <Text size="xl" fw={750} lh={1.1}>{openTotal}</Text>
              </div>
            </Group>
          </Paper>
          <Paper p="md" radius={6} withBorder>
            <Group gap="md" wrap="nowrap">
              <IconCircleCheck size="1.625rem" />
              <div>
                <Text size="xs" c="dimmed" mb={2}>Completed</Text>
                <Text size="xl" fw={750} lh={1.1}>{completedTotal}</Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      <Stack gap="xs">
        <TextInput
          placeholder="Search work orders…"
          aria-label="Search work orders"
          leftSection={<IconSearch size="1.25rem" />}
          rightSection={search ? <IconX size="1.25rem" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} /> : null}
          value={search}
          onChange={event => setSearch(event.currentTarget.value)}
        />
        <Group gap={6}>
          <Chip size="xs" checked={overdueOnly} onChange={setOverdueOnly} color="red" variant="light">Overdue</Chip>
          {PRIORITIES.map(value => (
            <Chip key={value} size="xs" checked={priority === value} onChange={checked => setPriority(checked ? value : null)} variant="light">
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </Chip>
          ))}
        </Group>
        {assetId && (
          <Group gap={6}>
            <Badge variant="light" color="gray" size="lg" rightSection={<IconX size="1rem" style={{ cursor: 'pointer' }} onClick={() => setSearchParams({}, { replace: true })} />}>
              Asset: {assetName ?? 'selected asset'}
            </Badge>
          </Group>
        )}
      </Stack>

      <Stack gap="xs">
        {openItems.length > 0 ? (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
            {openItems.map(wo => <WorkOrderCard key={wo.id} wo={wo} />)}
          </SimpleGrid>
        ) : (
          <Paper p="lg" radius={6} withBorder>
            <Stack gap="xs" align="center">
              <Text size="sm" c="dimmed" ta="center">
                {filtered ? 'No work orders match these filters.' : "You're all caught up — no open work orders at this site. Pull down to refresh."}
              </Text>
              {filtered && <Button variant="light" size="sm" onClick={clearFilters}>Clear filters</Button>}
            </Stack>
          </Paper>
        )}

        {totalPages > 1 && <Group justify="center" mt="xs"><Pagination value={page} onChange={setPage} total={totalPages} /></Group>}

        {!filtered && completedItems.length > 0 && (
          <>
            <Group justify="space-between" mt="md">
              <Text size="xs" c="dimmed" fw={650} tt="uppercase">Recently completed</Text>
              <Text size="xs" c="dimmed">Showing {completedItems.length} of {completedTotal}</Text>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
              {completedItems.map(wo => <WorkOrderCard key={wo.id} wo={wo} />)}
            </SimpleGrid>
          </>
        )}
      </Stack>
    </Stack>
  )
}

export default AssignedWorkOrders
