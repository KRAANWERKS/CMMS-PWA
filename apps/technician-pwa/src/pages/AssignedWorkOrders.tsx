import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Group,
  Pagination,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClipboardList,
  IconClock,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workOrderService } from '@cmms/api-client'
import { CMMSLoadingState, CMMSErrorState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'

const PAGE_SIZE = 25

const priorityColor: Record<string, string> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'yellow',
  LOW: 'gray',
}

const statusIcon: Record<string, typeof IconClock> = {
  OPEN: IconClock,
  ASSIGNED: IconClock,
  IN_PROGRESS: IconAlertTriangle,
  COMPLETED: IconCircleCheck,
}

export function AssignedWorkOrders() {
  const navigate = useNavigate()
  const { currentSiteId, currentSite } = useTechnicianSite()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const openQuery = useQuery({
    queryKey: ['technician-work-orders', currentSiteId, 'open', page],
    queryFn: () => workOrderService.getWorkOrders({
      siteId: currentSiteId!,
      view: 'open',
      page,
      pageSize: PAGE_SIZE,
    }),
    enabled: !!currentSiteId,
    placeholderData: previous => previous,
    staleTime: 2 * 60 * 1000,
  })

  const completedQuery = useQuery({
    queryKey: ['technician-work-orders', currentSiteId, 'completed'],
    queryFn: () => workOrderService.getWorkOrders({
      siteId: currentSiteId!,
      view: 'completed',
      page: 1,
      pageSize: 3,
    }),
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

  if (!currentSiteId) return <CMMSLoadingState />
  if (openQuery.isPending && openQuery.fetchStatus === 'paused') return <CMMSErrorState message="You're offline and this hasn't been saved on this device yet. Reconnect to load it." />
  if (openQuery.isLoading || completedQuery.isLoading) return <CMMSLoadingState />
  if (openQuery.error || completedQuery.error) {
    return <CMMSErrorState message="Failed to load assigned work orders. Check CMMS connectivity and try again." />
  }

  const openItems = openQuery.data?.items ?? []
  const completedItems = completedQuery.data?.items ?? []
  const openTotal = openQuery.data?.totalCount ?? 0
  const completedTotal = completedQuery.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(openTotal / PAGE_SIZE))

  return (
    <Stack gap="md">
      <div>
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={750} size="xl">My Work</Text>
            <Text size="sm" c="dimmed">{currentSite?.name ?? 'Current site'}</Text>
          </div>
          <Badge variant="light" color="gray">{openTotal + completedTotal} total</Badge>
        </Group>
      </div>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
        <Paper p="md" radius={6} withBorder>
          <Group gap="md" wrap="nowrap">
            <IconClipboardList size={22} />
            <div>
              <Text size="xs" c="dimmed" mb={2}>Open</Text>
              <Text size="xl" fw={750} lh={1.1}>{openTotal}</Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius={6} withBorder>
          <Group gap="md" wrap="nowrap">
            <IconCircleCheck size={22} />
            <div>
              <Text size="xs" c="dimmed" mb={2}>Completed</Text>
              <Text size="xl" fw={750} lh={1.1}>{completedTotal}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <Stack gap="xs">
        {openItems.length > 0 ? (
          openItems.map((wo) => {
            const Icon = statusIcon[wo.status] || IconClock
            return (
              <Paper
                key={wo.id}
                p="md"
                radius={6}
                withBorder
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  navigate(`/work-orders/${wo.id}`)
                }}
                style={{ cursor: 'pointer', minHeight: 84 }}
              >
                <Group justify="space-between" mb={5} wrap="nowrap">
                  <Group gap={7} wrap="nowrap">
                    <ThemeIcon size="md" variant="light" color={priorityColor[wo.priority] || 'gray'}>
                      <Icon size={16} />
                    </ThemeIcon>
                    <Text fw={700} size="sm">{wo.number}</Text>
                  </Group>
                  <Badge size="xs" variant="light" color={priorityColor[wo.priority] || 'gray'}>{wo.priority}</Badge>
                </Group>
                <Text size="sm" fw={550} lineClamp={2}>{wo.title}</Text>
                <Group justify="space-between" mt={5} wrap="nowrap">
                  <Text size="xs" c="dimmed">{wo.assetName || wo.workType}</Text>
                  <Badge size="xs" variant="outline" color="gray">{wo.status.replace('_', ' ')}</Badge>
                </Group>
              </Paper>
            )
          })
        ) : (
          <Paper p="lg" radius={6} withBorder>
            <Text size="sm" c="dimmed" ta="center">No open assigned work orders at this site.</Text>
          </Paper>
        )}

        {totalPages > 1 && <Group justify="center" mt="xs"><Pagination value={page} onChange={setPage} total={totalPages} /></Group>}

        {completedItems.length > 0 && (
          <>
            <Group justify="space-between" mt="md">
              <Text size="xs" c="dimmed" fw={650} tt="uppercase">Recently completed</Text>
              <Text size="xs" c="dimmed">Showing {completedItems.length} of {completedTotal}</Text>
            </Group>
            {completedItems.map((wo) => (
              <Paper
                key={wo.id}
                p="sm"
                radius={6}
                withBorder
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  navigate(`/work-orders/${wo.id}`)
                }}
                style={{ cursor: 'pointer' }}
              >
                <Group justify="space-between">
                  <Group gap={6}>
                    <IconCircleCheck size={14} />
                    <Text size="sm" fw={600}>{wo.number}</Text>
                  </Group>
                  <Badge size="xs" color="teal" variant="light">Done</Badge>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>{wo.title}</Text>
              </Paper>
            ))}
          </>
        )}
      </Stack>
    </Stack>
  )
}

export default AssignedWorkOrders
