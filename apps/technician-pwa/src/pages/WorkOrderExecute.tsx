import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Accordion, Alert, Badge, Box, Button, Divider, Group, NumberInput, Paper, Progress, Select, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { IconCheck, IconChevronRight, IconClock, IconPackage, IconSend, IconTool } from '@tabler/icons-react'
import { getApiError, workOrderService } from '@cmms/api-client'
import { CMMSErrorState, CMMSLoadingState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'

function responseOptions(value?: string | null) {
  if (!value) return []
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String) } catch { /* plain-text options */ }
  return value.split(/[\r\n|,]+/).map(item => item.trim()).filter(Boolean)
}

export function WorkOrderExecute() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { currentSite } = useTechnicianSite()
  const [laborHours, setLaborHours] = useState(0)
  const [laborNote, setLaborNote] = useState('')
  const [completionNotes, setCompletionNotes] = useState('')
  const [taskResponses, setTaskResponses] = useState<Record<string, string>>({})
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [laborEdited, setLaborEdited] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const [openSections, setOpenSections] = useState<string[]>([])
  const completionNotesRef = useRef<HTMLTextAreaElement>(null)
  const sessionLaborLogged = useRef(false)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const query = useQuery({ queryKey: ['work-order', id], queryFn: () => workOrderService.getWorkOrderById(id!), enabled: !!id })
  const refresh = () => {
    setSavedAt(new Date())
    queryClient.invalidateQueries({ queryKey: ['work-order', id] })
    queryClient.invalidateQueries({ queryKey: ['work-orders'] })
    queryClient.invalidateQueries({ queryKey: ['technician-work-orders'] })
  }
  const statusMutation = useMutation({ mutationFn: (status: string) => workOrderService.changeStatus(id!, status), onSuccess: refresh })
  const taskMutation = useMutation({ mutationFn: ({ taskId, completed, responseValue }: { taskId: string; completed: boolean; responseValue?: string }) => workOrderService.setTaskCompleted(id!, taskId, completed, responseValue), onSuccess: refresh })
  const laborMutation = useMutation({ mutationFn: () => workOrderService.recordLabor(id!, laborHours, new Date().toISOString(), laborNote || undefined), onSuccess: () => { sessionLaborLogged.current = true; setLaborHours(0); setLaborEdited(false); setLaborNote(''); refresh() } })
  const completeMutation = useMutation({ mutationFn: async () => {
    if ((query.data?.totalLaborHours ?? 0) <= 0 && !sessionLaborLogged.current) {
      await workOrderService.recordLabor(id!, laborHours, new Date().toISOString(), laborNote || 'Auto-timed technician work')
      sessionLaborLogged.current = true
    }
    await workOrderService.complete(id!, completionNotes)
  }, onSuccess: () => { setCompletionNotes(''); refresh() } })

  const wo = query.data
  const mutations = [statusMutation, taskMutation, laborMutation, completeMutation]
  const mutationError = mutations.find(mutation => mutation.error)?.error
  const saving = mutations.some(mutation => mutation.isPending)
  const actionable = (wo?.tasks || []).filter(task => task.responseType !== 'INFORMATION')
  const completedCount = actionable.filter(task => task.status === 'COMPLETED').length
  const progress = actionable.length ? Math.round((completedCount / actionable.length) * 100) : 0
  const currentTask = actionable.find(task => task.status !== 'COMPLETED')
  const startTransition = (wo?.allowedTransitions || []).find(status => status === 'IN_PROGRESS')
  const otherTransitions = (wo?.allowedTransitions || []).filter(status => status !== 'COMPLETED' && status !== 'IN_PROGRESS')
  const canComplete = wo?.allowedTransitions?.includes('COMPLETED')
  const elapsedHours = wo?.actualStart ? Math.max(0.01, (clock - new Date(wo.actualStart).getTime()) / 3_600_000) : 0

  useEffect(() => {
    if (wo?.status !== 'IN_PROGRESS' || !wo.actualStart) return
    const timer = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [wo?.status, wo?.actualStart])

  useEffect(() => {
    if (wo?.status === 'IN_PROGRESS' && wo.totalLaborHours <= 0 && !laborEdited) setLaborHours(Number(elapsedHours.toFixed(2)))
  }, [elapsedHours, laborEdited, wo?.status, wo?.totalLaborHours])

  useEffect(() => {
    if (!canComplete || currentTask) return
    setOpenSections(current => current.includes('finish') ? current : [...current, 'finish'])
    window.setTimeout(() => { document.getElementById('finish-work')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); completionNotesRef.current?.focus() }, 0)
  }, [canComplete, currentTask])

  if (query.isLoading) return <CMMSLoadingState />
  if (query.error) return <CMMSErrorState message={getApiError(query.error, 'Failed to load work order')} />
  if (!wo) return <CMMSErrorState message="Work order not found" />

  const breadcrumb = `${currentSite?.code || currentSite?.name || 'Site'}${wo.assetName ? ` / ${wo.assetName}` : ''}`

  const continueInspection = () => {
    if (startTransition) {
      statusMutation.mutate(startTransition)
      return
    }
    const target = currentTask ? document.getElementById(`instruction-${currentTask.id}`) : document.getElementById('finish-work')
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <Stack gap={14} pb={8}>
      {!isOnline && <Alert color="yellow">Browser reports offline. Updates are disabled until network access returns; this does not imply a queued offline save.</Alert>}
      {mutationError && <Alert color="red">{getApiError(mutationError)}</Alert>}

      <Box>
        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
          <Box style={{ minWidth: 0 }}>
            <Text fw={780} size="20px" lh={1.2}>{wo.title}</Text>
            <Group gap={8} mt={6}><Text size="12px" c="dimmed">{wo.number}</Text><Badge variant="light" color={wo.status === 'IN_PROGRESS' ? 'blue' : wo.status === 'COMPLETED' ? 'green' : 'gray'} size="sm">{wo.status.replace(/_/g, ' ')}</Badge></Group>
            <Text size="12px" c="dimmed" mt={10}>{breadcrumb}</Text>
          </Box>
          {saving && <Text size="10px" c="dimmed">Saving…</Text>}
        </Group>
      </Box>

      {wo.description && <Text size="13px" c="dimmed">{wo.description}</Text>}

      <Box>
        <Group justify="space-between" mb={7}><Text fw={750} size="18px">Instructions</Text><Text size="12px" c="dimmed">{completedCount} of {actionable.length} complete</Text></Group>
        <Progress value={progress} color="blue" size={9} radius="xl" />
      </Box>

      <Stack gap={10}>
        {actionable.map((task) => {
          const done = task.status === 'COMPLETED'
          const active = currentTask?.id === task.id
          const response = taskResponses[task.id] ?? task.responseValue ?? ''

          if (done) {
            return (
              <Paper key={task.id} withBorder radius={6} px={12} py={10}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                    <Box w={18} h={18} bg="green.6" style={{ borderRadius: 4, display: 'grid', placeItems: 'center', flexShrink: 0 }}><IconCheck size={12} color="white" stroke={3} /></Box>
                    <Text size="13px" truncate>{task.description}</Text>
                  </Group>
                  <Button size="compact-xs" variant="subtle" color="gray" px={4} disabled={!isOnline || wo.status !== 'IN_PROGRESS' || taskMutation.isPending} onClick={() => taskMutation.mutate({ taskId: task.id, completed: false, responseValue: response })}>Edit</Button>
                </Group>
              </Paper>
            )
          }

          if (!active) {
            return (
              <Paper key={task.id} withBorder radius={6} px={12} py={10}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}><Box w={18} h={18} style={{ borderRadius: 999, border: '1.5px solid #64748B', flexShrink: 0 }} /><Text size="13px" truncate>{task.description}</Text></Group>
                  <IconChevronRight size={16} color="#64748B" />
                </Group>
              </Paper>
            )
          }

          return (
            <Paper id={`instruction-${task.id}`} key={task.id} withBorder radius={6} p={12}>
              <Group gap={10} wrap="nowrap" mb={10}><Box w={18} h={18} style={{ borderRadius: 999, border: '1.5px solid #334155', flexShrink: 0 }} /><Text size="13px" fw={650}>{task.description}</Text></Group>

              {task.responseType === 'CHECKBOX' ? (
                <Button fullWidth color="yellow" c="#111827" disabled={!isOnline || wo.status !== 'IN_PROGRESS' || taskMutation.isPending} loading={taskMutation.isPending} onClick={() => taskMutation.mutate({ taskId: task.id, completed: true })}>Mark complete</Button>
              ) : task.responseType === 'NUMBER' ? (
                <Stack gap={8}>
                  <NumberInput
                    label={`${task.description.replace(/^Record\s+/i, '')}${task.unit ? ` (${task.unit})` : ''}`}
                    value={response}
                    min={task.minimumValue ?? undefined}
                    max={task.maximumValue ?? undefined}
                    disabled={wo.status !== 'IN_PROGRESS' || !isOnline}
                    onChange={value => setTaskResponses(current => ({ ...current, [task.id]: String(value ?? '') }))}
                    rightSection={task.unit ? <Text size="xs" c="dimmed">{task.unit}</Text> : undefined}
                  />
                  {task.linkedMeter && <Alert color="blue" variant="light" py={6}>Saving this instruction also updates {task.linkedMeter.name}.</Alert>}
                  {(task.minimumValue != null || task.maximumValue != null) && <Text size="10px" c="dimmed">Allowed: {task.minimumValue ?? 'no minimum'} to {task.maximumValue ?? 'no maximum'}</Text>}
                  <Button color="yellow" c="#111827" disabled={!isOnline || wo.status !== 'IN_PROGRESS' || taskMutation.isPending || !response.trim()} loading={taskMutation.isPending} onClick={() => taskMutation.mutate({ taskId: task.id, completed: true, responseValue: response })}>Save & continue</Button>
                </Stack>
              ) : task.responseType === 'SELECT' ? (
                <Stack gap={8}>
                  <Select label="Select response" data={responseOptions(task.responseOptions)} value={response || null} onChange={value => setTaskResponses(current => ({ ...current, [task.id]: value ?? '' }))} disabled={wo.status !== 'IN_PROGRESS' || !isOnline} />
                  <Button color="yellow" c="#111827" disabled={!isOnline || wo.status !== 'IN_PROGRESS' || taskMutation.isPending || !response.trim()} loading={taskMutation.isPending} onClick={() => taskMutation.mutate({ taskId: task.id, completed: true, responseValue: response })}>Save & continue</Button>
                </Stack>
              ) : task.responseType === 'DATE' ? (
                <Stack gap={8}>
                  <TextInput type="date" label="Date" value={response} onChange={event => setTaskResponses(current => ({ ...current, [task.id]: event.currentTarget.value }))} disabled={wo.status !== 'IN_PROGRESS' || !isOnline} />
                  <Button color="yellow" c="#111827" disabled={!isOnline || wo.status !== 'IN_PROGRESS' || taskMutation.isPending || !response.trim()} loading={taskMutation.isPending} onClick={() => taskMutation.mutate({ taskId: task.id, completed: true, responseValue: response })}>Save & continue</Button>
                </Stack>
              ) : (
                <Stack gap={8}>
                  <Textarea label="Findings" placeholder="Add any findings, e.g. abnormal noise, leaks, wear…" value={response} minRows={3} maxLength={2000} disabled={wo.status !== 'IN_PROGRESS' || !isOnline} onChange={event => setTaskResponses(current => ({ ...current, [task.id]: event.currentTarget.value }))} />
                  <Button color="yellow" c="#111827" disabled={!isOnline || wo.status !== 'IN_PROGRESS' || taskMutation.isPending || !response.trim()} loading={taskMutation.isPending} onClick={() => taskMutation.mutate({ taskId: task.id, completed: true, responseValue: response })}>Save & continue</Button>
                </Stack>
              )}
            </Paper>
          )
        })}
        {!actionable.length && <Text size="sm" c="dimmed">No response instructions.</Text>}
      </Stack>

      <Group justify="flex-end" gap={6} mih={18}>
        {saving ? <Text size="11px" c="dimmed">Saving…</Text> : savedAt ? <Group gap={5}><Box w={15} h={15} bg="green.6" style={{ borderRadius: 999, display: 'grid', placeItems: 'center' }}><IconCheck size={9} color="white" stroke={3} /></Box><Text size="11px" c="dimmed">Saved {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></Group> : null}
      </Group>

      <Accordion variant="contained" radius={6} multiple value={openSections} onChange={setOpenSections}>
        <Accordion.Item value="labor">
          <Accordion.Control icon={<IconClock size={17} />}>Labor</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <NumberInput label="Hours" description={wo.status === 'IN_PROGRESS' && wo.actualStart ? `Running since ${new Date(wo.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}; editable before logging.` : undefined} value={laborHours} onChange={value => { setLaborEdited(true); setLaborHours(Number(value) || 0) }} min={0} max={24} step={0.01} decimalScale={2} disabled={!isOnline} />
              <Textarea label="Notes (optional)" value={laborNote} onChange={event => setLaborNote(event.currentTarget.value)} disabled={!isOnline} />
              <Button variant="light" leftSection={<IconSend size={14} />} disabled={wo.status !== 'IN_PROGRESS' || !isOnline || laborHours <= 0} loading={laborMutation.isPending} onClick={() => laborMutation.mutate()}>Log hours</Button>
              <Divider />
              <Text size="12px" fw={650}>Recorded labor: {wo.totalLaborHours} hours</Text>
              {(wo.labor || []).map(entry => <Text key={entry.id} size="11px" c="dimmed">{new Date(entry.workedAt).toLocaleString()} — {entry.hours}h {entry.notes}</Text>)}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="parts">
          <Accordion.Control icon={<IconPackage size={17} />}>Parts used</Accordion.Control>
          <Accordion.Panel>
            <Text size="11px" c="dimmed" mb="xs">Parts usage is read-only here. Material requests are unavailable until the Odoo contract is finalized.</Text>
            {(wo.usage || []).map((item, index) => <Group key={`${item.sparePartId || item.partNumber}-${index}`} justify="space-between"><Text size="12px">{item.partNumber || item.sparePartId || 'Part'}</Text><Text size="12px">×{item.quantity}</Text></Group>)}
            {!wo.usage?.length && <Text size="12px" c="dimmed">No confirmed parts usage.</Text>}
          </Accordion.Panel>
        </Accordion.Item>

        {(otherTransitions.length > 0 || canComplete) && <Accordion.Item value="finish">
          <Accordion.Control icon={<IconTool size={17} />}>Work status & completion</Accordion.Control>
          <Accordion.Panel>
            <Stack id="finish-work" gap="xs">
              {otherTransitions.map(status => <Button key={status} variant="default" disabled={!isOnline} loading={statusMutation.isPending} onClick={() => statusMutation.mutate(status)}>{status.replace(/_/g, ' ')}</Button>)}
              {canComplete && <>
                {wo.totalLaborHours <= 0 && <NumberInput label="Labor hours" description="Started automatically when this work order entered In Progress. Adjust if needed; it will be logged on completion." value={laborHours} onChange={value => { setLaborEdited(true); setLaborHours(Number(value) || 0) }} min={0.01} max={24} step={0.01} decimalScale={2} disabled={!isOnline} required />}
                <Textarea ref={completionNotesRef} label="Completion remarks" description="Summarize the work completed and any follow-up required." value={completionNotes} onChange={event => setCompletionNotes(event.currentTarget.value)} disabled={!isOnline} required />
                <Button color="green" leftSection={<IconCheck size={16} />} disabled={!isOnline || !completionNotes.trim() || (wo.totalLaborHours <= 0 && laborHours <= 0)} loading={completeMutation.isPending} onClick={() => completeMutation.mutate()}>Complete work order</Button>
              </>}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>}
      </Accordion>

      <Box pos="sticky" bottom={0} py={10} bg="var(--mantine-color-body)" style={{ zIndex: 2 }}>
        <Button fullWidth size="md" color="yellow" c="#111827" disabled={!isOnline || (!startTransition && !currentTask && !canComplete)} loading={statusMutation.isPending} onClick={continueInspection}>
          {startTransition ? 'Start inspection' : currentTask ? 'Continue inspection' : canComplete ? 'Review completion' : 'Inspection complete'}
        </Button>
      </Box>
    </Stack>
  )
}

export default WorkOrderExecute
