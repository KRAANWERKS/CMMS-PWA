import { useI18n } from '../i18n'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Chip, Group, Pagination, Paper, ScrollArea, SimpleGrid, Stack, Table, Tabs, Text, TextInput } from '@mantine/core'
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks'
import { IconArrowsExchange, IconLayoutGrid, IconSearch, IconSend, IconTable, IconX } from '@tabler/icons-react'
import { Link, useSearchParams } from 'react-router-dom'
import { workOrderService, type WorkOrderDto } from '@cmms/api-client'
import { CMMSErrorState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'
import { ListSkeleton } from '../components/Skeletons'
import { WorkOrderCard, isOverdue } from '../components/WorkOrderCard'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { usePrefetchOpenWorkOrders } from '../hooks/usePrefetchOpenWorkOrders'

const PAGE_SIZE = 25
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
type WorkView = 'open' | 'completed' | 'all'
type LayoutMode = 'cards' | 'table'
const COMPLETED_STATUSES = new Set(['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'])
const VIEW_VALUES: WorkView[] = ['open', 'completed', 'all']

function dateLabel(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

function WorkOrderTable({ items }: { items: WorkOrderDto[] }) {
  const { t } = useI18n()
  return (
    <Paper withBorder radius={6} style={{ overflow: 'hidden' }}>
      <ScrollArea type="auto" offsetScrollbars>
        <Table miw={920} highlightOnHover verticalSpacing="sm" horizontalSpacing="md" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("WO / Title")}</Table.Th>
              <Table.Th>{t("Asset")}</Table.Th>
              <Table.Th>{t("Status")}</Table.Th>
              <Table.Th>{t("Priority")}</Table.Th>
              <Table.Th>{t("Due")}</Table.Th>
              <Table.Th>{t("Latest activity")}</Table.Th>
              <Table.Th>{t("Assignee")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map(wo => {
              const due = wo.dueDate || wo.scheduledEnd
              const overdue = isOverdue(wo)
              const inactive = COMPLETED_STATUSES.has(wo.status)
              return (
                <Table.Tr key={wo.id}>
                  <Table.Td>
                    <Stack gap={1}>
                      <Text component={Link} to={'/work-orders/' + wo.id} c="blue" fw={700} size="sm" lineClamp={2} style={{ textDecoration: 'none' }}>{wo.title}</Text>
                      <Text size="xs" c="dimmed">{wo.number}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td><Text size="xs" lineClamp={2}>{wo.assetName || '—'}</Text></Table.Td>
                  <Table.Td><StatusBadge status={wo.status} size="xs" /></Table.Td>
                  <Table.Td><PriorityBadge priority={wo.priority} size="xs" /></Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="xs" c={overdue ? 'red' : undefined} fw={overdue ? 700 : 500}>{t(overdue ? 'Overdue' : inactive ? 'Due date' : 'Due')}</Text>
                      <Text size="xs" c="dimmed">{dateLabel(due)}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={1}>
                      <Text size="xs" lineClamp={2} >{wo.latestActivity?.label || t('No activity')}</Text>
                      <Text size="xs" c="dimmed">{dateLabel(wo.latestActivity?.at)}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td><Text size="xs" lineClamp={2}>{wo.assignees?.map(user => user.displayName).join(', ') || t('Unassigned')}</Text></Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  )
}

export function AssignedWorkOrders() {
  const { t } = useI18n()
  const { currentSiteId } = useTechnicianSite()
  const [searchParams, setSearchParams] = useSearchParams()
  const assetId = searchParams.get('asset') ?? undefined
  const requestedView = searchParams.get('view')
  const view: WorkView = VIEW_VALUES.includes(requestedView as WorkView) ? requestedView as WorkView : 'open'
  const isWide = useMediaQuery('(min-width: 48em)')
  const [preferredLayout, setPreferredLayout] = useState<LayoutMode | null>(null)
  const layout: LayoutMode = isWide ? (preferredLayout ?? 'table') : 'cards'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<string | null>(null)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300)
  const filtered = !!(debouncedSearch || priority || overdueOnly || assetId)

  useEffect(() => setPage(1), [currentSiteId, view, debouncedSearch, priority, overdueOnly, assetId])

  const workOrders = useQuery({
    queryKey: ['technician-work-orders', currentSiteId, view, page, debouncedSearch, priority, overdueOnly, assetId],
    queryFn: () => workOrderService.getWorkOrders({
      siteId: currentSiteId!, view, page, pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      priority: priority ?? undefined,
      overdue: view === 'open' && overdueOnly ? true : undefined,
      assetId,
    }),
    enabled: !!currentSiteId,
    staleTime: 2 * 60 * 1000,
  })

  const counts = useQuery({
    queryKey: ['technician-work-order-counts', currentSiteId],
    queryFn: async () => {
      const [open, completed, all] = await Promise.all(VIEW_VALUES.map(selected =>
        workOrderService.getWorkOrders({ siteId: currentSiteId!, view: selected, page: 1, pageSize: 1 }),
      ))
      return { open: open.totalCount, completed: completed.totalCount, all: all.totalCount }
    },
    enabled: !!currentSiteId,
    staleTime: 60_000,
  })

  // Preserve the existing offline work-order detail prefetch for the active site.
  usePrefetchOpenWorkOrders(currentSiteId)

  const selectView = (next: string | null) => {
    if (!next || !VIEW_VALUES.includes(next as WorkView)) return
    const params = new URLSearchParams(searchParams)
    if (next === 'open') params.delete('view')
    else params.set('view', next)
    setSearchParams(params)
    setOverdueOnly(false)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setPriority(null)
    setOverdueOnly(false)
    if (assetId) {
      const params = new URLSearchParams(searchParams)
      params.delete('asset')
      setSearchParams(params, { replace: true })
    }
  }

  if (!currentSiteId || (workOrders.isLoading && !workOrders.data)) return <ListSkeleton />
  if (workOrders.isPending && workOrders.fetchStatus === 'paused') return <CMMSErrorState message="You're offline and this list hasn't been saved on this device yet. Reconnect to load it." />
  if (workOrders.error && !workOrders.data) return <CMMSErrorState message="Failed to load work orders. Check CMMS connectivity and try again." />

  const items = workOrders.data?.items ?? []
  const totalCount = workOrders.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Stack gap={2}>
          <Text fw={750} size="xl">{t("My Work")}</Text>
          <Text size="xs" c="dimmed">{t("Work orders at your current site")}</Text>
        </Stack>
        <Button
          component={Link}
          to="/work-requests/new"
          color="yellow"
          c="#111827"
          fullWidth={!isWide}
          size={isWide ? 'sm' : 'lg'}
          h={isWide ? 40 : 48}
          leftSection={<IconSend size={18} />}
          style={{ flexShrink: 0 }}
        >
          Submit Work Request
        </Button>
      </Group>

      <Stack gap={8} style={{ minWidth: 0, width: '100%' }}>
        <Tabs value={view} onChange={selectView} style={{ minWidth: 0, width: '100%' }}>
          <Tabs.List grow className="technician-work-tabs" style={{ flexWrap: 'nowrap', width: '100%', minWidth: 0 }}>
            {VIEW_VALUES.map(value => (
              <Tabs.Tab key={value} value={value} style={{ flex: '1 1 0', minWidth: 0, paddingInline: 3 }}>
                <Stack gap={0} align="center" style={{ minWidth: 0 }}>
                  <Text size="xs" fw={650} style={{ whiteSpace: 'nowrap', fontSize: 'clamp(0.64rem, 2.8vw, 0.82rem)' }}>
                    {t(value === 'open' ? 'OPEN' : value === 'completed' ? 'COMPLETED' : 'ALL')}
                  </Text>
                  {counts.data && <Text size="xs" c="dimmed" style={{ fontSize: '0.72rem' }}>({counts.data[value]})</Text>}
                </Stack>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
        {isWide && (
          <Group justify="flex-end" gap="xs">
            <Button
              aria-label={t(layout === 'cards' ? 'Switch to table view' : 'Switch to card view')}
              aria-pressed={layout === 'table'}
              variant="default"
              color="gray"
              size="sm"
              h={36}
              leftSection={layout === 'cards' ? <IconLayoutGrid size={17} /> : <IconTable size={17} />}
              rightSection={<IconArrowsExchange size={15} />}
              onClick={() => setPreferredLayout(layout === 'cards' ? 'table' : 'cards')}
            >
              {t(layout === 'cards' ? 'Cards' : 'Table')}
            </Button>
          </Group>
        )}
      </Stack>

      <Stack gap="xs">
        <TextInput
          placeholder={t("Search work orders…")}
          aria-label={t("Search work orders")}
          leftSection={<IconSearch size={18} />}
          rightSection={search ? <IconX size={18} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} /> : null}
          value={search}
          maxLength={250}
          onChange={event => setSearch(event.currentTarget.value)}
        />
        <Group gap={6}>
          {view === 'open' && <Chip size="xs" checked={overdueOnly} onChange={setOverdueOnly} color="red" variant="light">{t("Overdue")}</Chip>}
          {PRIORITIES.map(value => (
            <Chip key={value} size="xs" checked={priority === value} onChange={checked => setPriority(checked ? value : null)} variant="light">
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </Chip>
          ))}
          {filtered && <Button size="compact-xs" variant="subtle" color="gray" onClick={clearFilters}>{t("Clear filters")}</Button>}
        </Group>
        {assetId && <Badge variant="light" color="gray" size="lg">{t("Filtered by asset")}</Badge>}
      </Stack>

      {workOrders.error && workOrders.data && <Alert color="orange">{t("Could not refresh the list. Showing the last saved results.")}</Alert>}

      <Group justify="space-between">
        <Text size="xs" c="dimmed">{totalCount} {t('Work orders')}{filtered ? ' matching filters' : ''}</Text>
        <Text size="xs" c="dimmed">{totalCount ? t('Page') + ' ' + page + ' / ' + totalPages : ''}</Text>
      </Group>
      {items.length > 0 ? (
        layout === 'cards' ? (
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="sm">
            {items.map(wo => <WorkOrderCard key={wo.id} wo={wo} />)}
          </SimpleGrid>
        ) : (
          <WorkOrderTable items={items} />
        )
      ) : (
        <Paper p="xl" radius={6} withBorder>
          <Stack align="center" gap="xs">
            <Text size="sm" c="dimmed" ta="center">{filtered ? t('No work orders match these filters.') : t('No work orders at this site.')}</Text>
            {filtered && <Button variant="light" size="sm" onClick={clearFilters}>{t("Clear filters")}</Button>}
          </Stack>
        </Paper>
      )}

      {totalPages > 1 && <Group justify="center" mt="xs"><Pagination value={page} onChange={setPage} total={totalPages} /></Group>}
    </Stack>
  )
}

export default AssignedWorkOrders
