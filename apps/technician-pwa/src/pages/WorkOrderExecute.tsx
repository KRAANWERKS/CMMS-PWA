import { useI18n } from '../i18n'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { Accordion, Alert, Box, Button, Checkbox, Divider, Group, List, Modal, NumberInput, Paper, Progress, Select, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { IconAlertTriangle, IconCheck, IconChevronRight, IconClock, IconGauge, IconHistory, IconPackage, IconSend, IconTool, IconX } from '@tabler/icons-react'
import { getApiError, workOrderService, type WorkOrderDto } from '@cmms/api-client'
import { CMMSErrorState, formatDate, formatDateTime } from '@cmms/ui'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { DetailSkeleton } from '../components/Skeletons'
import { db } from '../db/schema'
import { submitChange, fetchWorkOrder, applyEntry, type NewEntry } from '../db/sync'
import { TaskPhotos } from '../components/TaskPhotos'
import { TaskReferences } from '../components/TaskReferences'
import { MeterReadingTask } from '../components/MeterReadingTask'
import { WorkOrderHistory } from '../components/WorkOrderHistory'
import { PastResponses } from '../components/PastResponses'
import { useTechnicianSite } from '../context/TechnicianSiteContext'

/** Labor is recorded in half-hour steps; one entry holds at most 24 h (server rule). */
const halfHours = (hours: number) => Math.min(24, Math.max(0.5, Math.round(hours * 2) / 2))

function responseOptions(value?: string | null) {
  if (!value) return []
  let options: string[]
  try {
    const parsed = JSON.parse(value)
    options = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch { /* plain-text options */
    options = value.split(/[\r\n|,]+/)
  }
  const seen = new Set<string>()
  return options.map(item => item.trim()).filter(item => {
    if (!item) return false
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function WorkOrderExecute() {
  const { t } = useI18n()
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
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeAnyway, setCompleteAnyway] = useState(false)
  const [completionLabor, setCompletionLabor] = useState(0)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
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

  // Server data plus anything queued on this device that the server has not received yet
  const query = useQuery({ queryKey: ['work-order', id], queryFn: () => fetchWorkOrder(id!), enabled: !!id })
  const pmOrigin = useQuery({
    queryKey: ['work-order-pm-origin', id],
    queryFn: () => workOrderService.getPmOrigin(id!),
    enabled: !!id && query.data?.source === 'PM' && isOnline,
    staleTime: 10 * 60_000,
    retry: false,
  })
  // Changes for this work order still waiting on this device (clears itself once they have synced)
  const queuedCount = useLiveQuery(() => db.outbox.where('workOrderId').equals(id ?? '').filter(entry => entry.status === 'PENDING').count(), [id], 0)
  // Saves locally first, shows the result immediately, then syncs when a connection is available
  const send = async (entry: NewEntry) => {
    await submitChange(entry, saved => {
      queryClient.setQueryData<WorkOrderDto>(['work-order', id], current => current && applyEntry(current, saved))
    })
    setSavedAt(new Date())
  }
  // The server rejected the change (or sending failed): drop the optimistic result
  const rollback = () => { queryClient.invalidateQueries({ queryKey: ['work-order', id] }) }
  const statusMutation = useMutation({ mutationFn: (status: string) => send({ action: 'STATUS', workOrderId: id!, payload: { status } }), onError: rollback })
  const cancelMutation = useMutation({ mutationFn: (reason: string) => send({ action: 'STATUS', workOrderId: id!, payload: { status: 'CANCELLED', reason } }), onSuccess: () => { setCancelOpen(false); setCancelReason('') }, onError: rollback })
  const taskMutation = useMutation({ mutationFn: ({ taskId, completed, responseValue }: { taskId: string; completed: boolean; responseValue?: string }) => send({ action: 'TASK', workOrderId: id!, payload: { taskId, completed, responseValue } }), onError: rollback })
  // Preserve QA's direct meter capture and work-order-linked reading evidence.
  const meterMutation = useMutation({ mutationFn: async ({ taskId, assetId, meterId, value }: { taskId: string; assetId: string; meterId: string; value: number }) => {
    await send({ action: 'METER', workOrderId: id!, assetId, payload: { meterId, value, readingAt: new Date().toISOString() } })
    await send({ action: 'TASK', workOrderId: id!, payload: { taskId, completed: true } })
  }, onError: rollback })
  const laborMutation = useMutation({ mutationFn: () => send({ action: 'LABOR', workOrderId: id!, payload: { hours: halfHours(laborHours), workedAt: new Date().toISOString(), note: laborNote || undefined } }), onSuccess: () => { sessionLaborLogged.current = true; setLaborHours(0); setLaborEdited(false); setLaborNote('') }, onError: rollback })
  const completeMutation = useMutation({ mutationFn: async () => {
    // The server needs at least one labor entry (each entry at most 24 h) before it accepts completion
    if ((query.data?.totalLaborHours ?? 0) <= 0 && !sessionLaborLogged.current) {
      await send({ action: 'LABOR', workOrderId: id!, payload: { hours: halfHours(completionLabor), workedAt: new Date().toISOString(), note: 'Recorded on completion' } })
      sessionLaborLogged.current = true
    }
    await send({ action: 'COMPLETE', workOrderId: id!, payload: { notes: completionNotes.trim(), allowPending: pendingTasks.length > 0 } })
  }, onSuccess: () => { setCompletionNotes(''); setCompleteOpen(false); setCompleteAnyway(false) }, onError: rollback })

  const wo = query.data
  const mutations = [statusMutation, cancelMutation, taskMutation, meterMutation, laborMutation, completeMutation]
  const mutationError = mutations.find(mutation => mutation.error)?.error
  const saving = mutations.some(mutation => mutation.isPending)
  const skippedChoiceTasks = (wo?.tasks || []).filter(task => task.status !== 'COMPLETED' && task.responseType === 'SELECT' && responseOptions(task.responseOptions).length === 0)
  const skippedChoiceTaskIds = new Set(skippedChoiceTasks.map(task => task.id))
  const actionable = (wo?.tasks || []).filter(task => !['INFORMATION', 'GROUP'].includes(task.responseType) && !skippedChoiceTaskIds.has(task.id))
  // Group instructions are not answered, but their names head the instructions inside them (as in the admin sheet).
  const groupNames = new Map((wo?.tasks || []).filter(task => task.responseType === 'GROUP' && task.instructionReferenceKey)
    .map(task => [task.instructionReferenceKey!, task.description]))
  const groupOf = (task: { parentInstructionReferenceKey?: string | null }) =>
    task.parentInstructionReferenceKey && groupNames.has(task.parentInstructionReferenceKey) ? task.parentInstructionReferenceKey : null
  const groupHeading = (index: number) => {
    const group = groupOf(actionable[index])
    if (!group || (index > 0 && groupOf(actionable[index - 1]) === group)) return null
    return <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt={index > 0 ? 8 : 0} mb={-2}>{groupNames.get(group)}</Text>
  }
  const completedCount = actionable.filter(task => task.status === 'COMPLETED').length
  const progress = actionable.length ? Math.round((completedCount / actionable.length) * 100) : 0
  // Instructions can be filled in any order: the open one is the one the engineer tapped, else the first pending
  const currentTask = actionable.find(task => task.id === openTaskId && task.status !== 'COMPLETED') ?? actionable.find(task => task.status !== 'COMPLETED')
  const startTransition = (wo?.allowedTransitions || []).find(status => status === 'IN_PROGRESS')
  const otherTransitions = (wo?.allowedTransitions || []).filter(status => !['COMPLETED', 'IN_PROGRESS', 'CANCELLED'].includes(status))
  const canCancel = !!wo?.allowedTransitions?.includes('CANCELLED')
  const canComplete = wo?.allowedTransitions?.includes('COMPLETED')
  const pendingTasks = actionable.filter(task => task.status !== 'COMPLETED')
  // One labor entry may hold at most 24 h; longer jobs are logged per day in the Labor section
  const elapsedHours = wo?.actualStart ? halfHours((clock - new Date(wo.actualStart).getTime()) / 3_600_000) : 0
  const needsLabor = (wo?.totalLaborHours ?? 0) <= 0 && !sessionLaborLogged.current

  useEffect(() => {
    if (wo?.status !== 'IN_PROGRESS' || !wo.actualStart) return
    const timer = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [wo?.status, wo?.actualStart])

  useEffect(() => {
    if (wo?.status === 'IN_PROGRESS' && wo.totalLaborHours <= 0 && !laborEdited) setLaborHours(elapsedHours)
  }, [elapsedHours, laborEdited, wo?.status, wo?.totalLaborHours])


  if (query.isPending && query.fetchStatus === 'paused') return <CMMSErrorState message="You're offline and this hasn't been saved on this device yet. Reconnect to load it." />
  if (query.isLoading) return <DetailSkeleton />
  if (query.error) return <CMMSErrorState message={getApiError(query.error, 'Failed to load work order')} />
  if (!wo) return <CMMSErrorState message="Work order not found" />

  const breadcrumb = `${currentSite?.code || currentSite?.name || 'Site'}${wo.assetName ? ` / ${wo.assetName}` : ''}`

  const continueInspection = () => {
    if (startTransition) {
      statusMutation.mutate(startTransition)
      return
    }
    if (currentTask) document.getElementById(`instruction-${currentTask.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const openComplete = () => {
    setCompletionLabor(elapsedHours || 0.5)
    setCompleteAnyway(false)
    completeMutation.reset()
    setCompleteOpen(true)
  }

  // After saving, continue with the next pending instruction below the saved one (wrapping to the top)
  const advanceFrom = (taskId: string) => {
    const index = actionable.findIndex(task => task.id === taskId)
    const pending = (task: typeof actionable[number]) => task.status !== 'COMPLETED' && task.id !== taskId
    const next = actionable.slice(index + 1).find(pending) ?? actionable.find(pending)
    setOpenTaskId(next?.id ?? null)
    if (next) window.setTimeout(() => document.getElementById(`instruction-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }
  const saveTask = (taskId: string, responseValue?: string) =>
    taskMutation.mutate({ taskId, completed: true, responseValue }, { onSuccess: () => advanceFrom(taskId) })

  const openTask = (taskId: string) => {
    setOpenTaskId(taskId)
    window.setTimeout(() => document.getElementById(`instruction-${taskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const goToTask = (taskId: string) => {
    setCompleteOpen(false)
    setOpenTaskId(taskId)
    window.setTimeout(() => document.getElementById(`instruction-${taskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }

  return (
    <Stack gap={14} pb={8}>
      {!isOnline && <Alert color="yellow">{t("You're offline. Changes are saved on this device and sent automatically when you reconnect.")}</Alert>}
      {isOnline && queuedCount > 0 && <Alert color="blue">{t("Some changes are saved on this device and will sync as soon as the server is reachable.")}</Alert>}
      {mutationError && <Alert color="red">{getApiError(mutationError)}</Alert>}

      <Box>
        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
          <Box style={{ minWidth: 0 }}>
            <Text fw={780} size="xl" lh={1.2}>{wo.title}</Text>
            <Group gap={8} mt={6}><Text size="sm" c="dimmed">{wo.number}</Text><StatusBadge status={wo.status} /><PriorityBadge priority={wo.priority} /></Group>
            <Text size="sm" c="dimmed" mt={10}>{breadcrumb}</Text>
          </Box>
          
        </Group>
      </Box>

      {pmOrigin.data && <Alert color="blue" variant="light" py={6}>{t('Preventive maintenance:')} {pmOrigin.data.pmPlanName} · {t('cycle')} {pmOrigin.data.cycleNumber}</Alert>}

      {wo.description && <Text size="sm" c="dimmed">{wo.description}</Text>}
      {skippedChoiceTasks.length > 0 && <Alert color="orange" variant="light" icon={<IconAlertTriangle size="1.25rem" />} title={t('Choice instructions with no valid options')}>
        <Text size="sm" mb={6}>{['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)
          ? t('These instructions were skipped at completion and recorded in the work-order history.')
          : t('These instructions will be skipped when you complete this work order and recorded in its history.')}</Text>
        <List size="sm" spacing={2}>{skippedChoiceTasks.map(task => <List.Item key={task.id}>{task.description}</List.Item>)}</List>
      </Alert>}

      <Box>
        <Group justify="space-between" mb={7}><Text fw={750} size="xl">{t("Instructions")}</Text><Text size="sm" c="dimmed">{completedCount} / {actionable.length} {t('complete')}</Text></Group>
        <Progress value={progress} color="blue" size={9} radius="xl" />
      </Box>

      <Stack gap={10}>
        {actionable.map((task, taskIndex) => <Fragment key={task.id}>{groupHeading(taskIndex)}{(() => {
          const done = task.status === 'COMPLETED'
          const active = currentTask?.id === task.id
          // Once this instruction holds a reading, the meter's current value may be that same reading, so fall back to
          // the value at generation; the server still rejects anything below the previous real reading.
          const hasMeterResponse = !!task.linkedMeter && task.responseValue != null && task.responseValue !== ''
          const minimumValue = task.linkedMeasurementPoint
            ? null
            : task.linkedMeter?.currentReading == null || hasMeterResponse
              ? task.minimumValue ?? null
              : Math.max(task.minimumValue ?? task.linkedMeter.currentReading, task.linkedMeter.currentReading)
          const meterMax = !hasMeterResponse ? task.linkedMeter?.maxAllowed ?? null : null
          const maximumValue = task.maximumValue != null && meterMax != null ? Math.min(task.maximumValue, meterMax) : task.maximumValue ?? meterMax
          // Never pre-fill meter readings: typed digits merged into the pre-filled value (25160 became 2500125160).
          const response = taskResponses[task.id] ?? task.responseValue ?? ''
          const choices = task.responseType === 'SELECT' ? responseOptions(task.responseOptions) : []
          const photoCount = task.attachments?.length ?? 0
          const photosMissing = (task.minimumPhotoCount ?? 0) > photoCount
          const numeric = response.trim() ? Number(response) : Number.NaN
          const rangeError = task.responseType === 'NUMBER' && !task.linkedMeasurementPoint && response.trim() !== '' && (
            !Number.isFinite(numeric) ||
            (minimumValue != null && numeric < minimumValue) ||
            (maximumValue != null && numeric > maximumValue)
          ) ? (meterMax != null && numeric > meterMax && Number.isFinite(numeric)
            ? `${t('Unusually large increase. The most this meter can read now is')} ${meterMax.toLocaleString()}${task.unit ? ` ${task.unit}` : ''}. ${t('Check for a typing slip.')}`
            : `${t('Must be between')} ${minimumValue ?? t('no minimum')} ${t('and')} ${maximumValue ?? t('no maximum')}`) : undefined
          // Measurement points may carry a normal range: advisory only, the technician can still record the value
          const point = task.linkedMeasurementPoint
          const normalText = point && (point.normalMinimum != null || point.normalMaximum != null)
            ? `normal ${point.normalMinimum ?? 'any'} to ${point.normalMaximum ?? 'any'} ${point.unit}` : undefined
          const outsideNormal = !!point && task.responseType === 'NUMBER' && response.trim() !== '' && Number.isFinite(numeric) && (
            (point.normalMinimum != null && numeric < point.normalMinimum) || (point.normalMaximum != null && numeric > point.normalMaximum))

          if (done) {
            return (
              <Paper key={task.id} withBorder radius={6} px={12} py={10}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                    <Box w={26} h={26} bg="green.6" style={{ borderRadius: 4, display: 'grid', placeItems: 'center', flexShrink: 0 }}><IconCheck size="1rem" color="white" stroke={3} /></Box>
                    <Text size="sm">{task.description}</Text>
                  </Group>
                  <Button size="md" variant="light" color="gray" mih={44} style={{ flexShrink: 0 }} disabled={wo.status !== 'IN_PROGRESS' || taskMutation.isPending} onClick={() => taskMutation.mutate({ taskId: task.id, completed: false, responseValue: response }, { onSuccess: () => openTask(task.id) })}>{t("Edit")}</Button>
                </Group>
                {task.responseType !== 'CHECKBOX' && task.responseValue && task.responseValue !== 'true' && (
                  <Text size="xs" c="dimmed" mt={4} ml={36} lineClamp={2}>{t('Recorded:')} {task.responseType === 'DATE' ? formatDate(task.responseValue) : task.responseValue}{task.responseType === 'NUMBER' && (task.unit ?? task.linkedMeasurementPoint?.unit) ? ` ${task.unit ?? task.linkedMeasurementPoint?.unit}` : ''}</Text>
                )}
                {photoCount > 0 && <Box mt={6} ml={36}><TaskPhotos workOrderId={wo.id} taskId={task.id} attachments={task.attachments ?? []} minimum={0} readOnly /></Box>}
                {(task.measurementRecords ?? []).map(record => <Text key={record.id} size="xs" c="dimmed" mt={4}>{t('Recorded measurement:')} {record.value} {record.unit} · {new Date(record.recordedAt).toLocaleString()}</Text>)}
              </Paper>
            )
          }

          if (!active) {
            return (
              <Paper key={task.id} id={`instruction-row-${task.id}`} withBorder radius={6} px={12} py={10} role="button" tabIndex={0} aria-label={`${t('Open instruction')}: ${task.description}`}
                style={{ cursor: 'pointer' }} onClick={() => openTask(task.id)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTask(task.id) } }}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}><Box w={26} h={26} style={{ borderRadius: 999, border: '1.5px solid var(--mantine-color-dimmed)', flexShrink: 0 }} /><Text size="sm">{task.description}</Text></Group>
                  <IconChevronRight size="1.25rem" color="var(--mantine-color-dimmed)" />
                </Group>
              </Paper>
            )
          }

          return (
            <Paper id={`instruction-${task.id}`} key={task.id} withBorder radius={6} p={12}>
              <Group gap={10} wrap="nowrap" mb={10}><Box w={26} h={26} style={{ borderRadius: 999, border: '1.5px solid var(--mantine-color-text)', flexShrink: 0 }} /><Text size="sm" fw={650}>{task.description}</Text></Group>
              {point && <Text size="xs" c="dimmed" mb={8}>{point.measurementType.charAt(0) + point.measurementType.slice(1).toLowerCase().replace(/_/g, ' ')} · {point.name}{normalText ? ` · ${normalText}` : ''}</Text>}
              {['CHECKBOX', 'NUMBER', 'TEXT', 'SELECT', 'DATE'].includes(task.responseType) && <Group justify="flex-end" mt={-6} mb={6}><PastResponses workOrderId={wo.id} task={task} /></Group>}
              <TaskReferences items={task.referenceAttachments ?? []} />

              {task.responseType === 'CHECKBOX' && task.linkedMeter && task.linkedAsset ? (
                <MeterReadingTask task={task} disabled={wo.status !== 'IN_PROGRESS' || photosMissing} loading={meterMutation.isPending} onSave={value => meterMutation.mutate({ taskId: task.id, assetId: task.linkedAsset!.id, meterId: task.linkedMeter!.id, value }, { onSuccess: () => advanceFrom(task.id) })} />
              ) : task.responseType === 'CHECKBOX' ? (
                <Button fullWidth color="yellow" disabled={wo.status !== 'IN_PROGRESS' || photosMissing || taskMutation.isPending} loading={taskMutation.isPending} onClick={() => saveTask(task.id)}>{t("Mark complete")}</Button>              ) : task.responseType === 'NUMBER' ? (
                <Stack gap={8}>
                  <NumberInput
                    label={`${task.description.replace(/^Record\s+/i, '')}${task.unit ? ` (${task.unit})` : ''}`}
                    value={response}
                    min={minimumValue ?? undefined}
                    max={maximumValue ?? undefined}
                    placeholder={task.linkedMeter?.currentReading != null ? `${t('Last reading:')} ${task.linkedMeter.currentReading.toLocaleString()}` : undefined}
                    clampBehavior="none"
                    trimLeadingZeroesOnBlur={false}
                    error={rangeError}
                    disabled={wo.status !== 'IN_PROGRESS'}
                    onChange={value => setTaskResponses(current => ({ ...current, [task.id]: String(value ?? '') }))}
                    rightSection={task.unit ? <Text size="xs" c="dimmed">{task.unit}</Text> : undefined}
                  />
                  {outsideNormal && !rangeError && <Alert color="orange" variant="light" py={6}>{t('Outside normal range:')} {normalText}. {t('You can still save a verified reading.')}</Alert>}
                  {task.linkedMeter && <Alert color="blue" variant="light" py={6}>{t('Saving this instruction also updates')} {task.linkedMeter.name}.</Alert>}
                  {(minimumValue != null || maximumValue != null) && <Text size="xs" c="dimmed">{t('Allowed:')} {minimumValue ?? t('no minimum')} {t('to')} {maximumValue ?? t('no maximum')}</Text>}
                  <Button color="yellow" disabled={wo.status !== 'IN_PROGRESS' || photosMissing || taskMutation.isPending || !response.trim() || !!rangeError} loading={taskMutation.isPending} onClick={() => saveTask(task.id, response)}>{t("Save & continue")}</Button>
                </Stack>
              ) : task.responseType === 'SELECT' ? (
                <Stack gap={8}>
                  {choices.length > 0
                    ? <Select label={t("Select response")} data={choices} value={response || null} onChange={value => setTaskResponses(current => ({ ...current, [task.id]: value ?? '' }))} disabled={wo.status !== 'IN_PROGRESS'} />
                    : <Alert color="orange" variant="light" py={6}>{t('This instruction has no valid choices. Ask a planner to correct it.')}</Alert>}
                  <Button color="yellow" disabled={wo.status !== 'IN_PROGRESS' || photosMissing || taskMutation.isPending || !choices.length || !response.trim()} loading={taskMutation.isPending} onClick={() => saveTask(task.id, response)}>{t("Save & continue")}</Button>
                </Stack>
              ) : task.responseType === 'DATE' ? (
                <Stack gap={8}>
                  <TextInput type="date" label={t("Date")} value={response} onChange={event => { const value = event.currentTarget.value; setTaskResponses(current => ({ ...current, [task.id]: value })) }} disabled={wo.status !== 'IN_PROGRESS'} />
                  <Button color="yellow" disabled={wo.status !== 'IN_PROGRESS' || photosMissing || taskMutation.isPending || !response.trim()} loading={taskMutation.isPending} onClick={() => saveTask(task.id, response)}>{t("Save & continue")}</Button>
                </Stack>
              ) : (
                <Stack gap={8}>
                  <Textarea label={t("Findings")} placeholder={t('Add any findings, e.g. abnormal noise, leaks, wear…')} value={response} minRows={3} maxLength={2000} disabled={wo.status !== 'IN_PROGRESS'} onChange={event => { const value = event.currentTarget.value; setTaskResponses(current => ({ ...current, [task.id]: value })) }} />
                  <Button color="yellow" disabled={wo.status !== 'IN_PROGRESS' || photosMissing || taskMutation.isPending || !response.trim()} loading={taskMutation.isPending} onClick={() => saveTask(task.id, response)}>{t("Save & continue")}</Button>
                </Stack>
              )}
              {photosMissing && wo.status === 'IN_PROGRESS' && (
                <Alert color="orange" variant="light" py={6} mt={8}>
                  {t('Add')} {(task.minimumPhotoCount ?? 0) - photoCount} {t((task.minimumPhotoCount ?? 0) - photoCount === 1 ? 'photo before saving this instruction.' : 'photos before saving this instruction.')}
                </Alert>
              )}
              <Box mt={10}>
                <TaskPhotos workOrderId={wo.id} taskId={task.id} attachments={task.attachments ?? []} minimum={task.minimumPhotoCount ?? 0} disabled={wo.status !== 'IN_PROGRESS'} />
              </Box>
            </Paper>
          )
        })()}</Fragment>)}
        {!actionable.length && <Text size="sm" c="dimmed">{t("No response instructions.")}</Text>}
      </Stack>

      <Group justify="flex-end" gap={6} mih={18}>
        {saving ? <Text size="xs" c="dimmed">{t("Saving…")}</Text> : savedAt ? <Group gap={5}><Box w={22} h={22} bg="green.6" style={{ borderRadius: 999, display: 'grid', placeItems: 'center' }}><IconCheck size="1rem" color="white" stroke={3} /></Box><Text size="xs" c="dimmed">{t('Saved')} {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></Group> : null}
      </Group>

      <Accordion
        variant="contained"
        radius={6}
        multiple
        value={openSections}
        onChange={setOpenSections}
      >
        <Accordion.Item value="labor">
          <Accordion.Control icon={<IconClock size="1.375rem" />}>{t("Labor")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <NumberInput label={t("Hours")} description={wo.status === 'IN_PROGRESS' && wo.actualStart ? `Running since ${new Date(wo.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}; editable before logging.` : undefined} value={laborHours} onChange={value => { setLaborEdited(true); setLaborHours(Math.min(24, Number(value) || 0)) }} onBlur={() => laborHours > 0 && setLaborHours(halfHours(laborHours))} min={0} max={24} clampBehavior="strict" step={0.5} decimalScale={1} suffix=" h" />
              <Textarea label={t("Notes (optional)")} value={laborNote} onChange={event => setLaborNote(event.currentTarget.value)} />
              <Button variant="light" leftSection={<IconSend size="1.125rem" />} disabled={wo.status !== 'IN_PROGRESS' || laborHours <= 0} loading={laborMutation.isPending} onClick={() => laborMutation.mutate()}>{t("Log hours")}</Button>
              <Divider />
              <Text size="sm" fw={650}>{t('Recorded labor:')} {wo.totalLaborHours} {t('hours')}</Text>
              {(wo.labor || []).map(entry => <Text key={entry.id} size="xs" c="dimmed">{formatDateTime(entry.workedAt)} — {entry.hours}h {entry.notes}</Text>)}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="parts">
          <Accordion.Control icon={<IconPackage size="1.375rem" />}>{t("Parts used")}</Accordion.Control>
          <Accordion.Panel>
            <Text size="xs" c="dimmed" mb="xs">{t("Parts usage is read-only here. Stock movements are confirmed in Odoo and synced to the work order.")}</Text>
            {(wo.usage || []).map((item, index) => <Group key={`${item.sparePartId || item.partNumber}-${index}`} justify="space-between"><Text size="sm" >{item.partNumber || item.sparePartId || t('Part')}</Text><Text size="sm">×{item.quantity}</Text></Group>)}
            {!wo.usage?.length && <Text size="sm" c="dimmed">{t('No confirmed parts usage.')}</Text>}
          </Accordion.Panel>
        </Accordion.Item>

        {!!wo.measurementEvidence?.length && <Accordion.Item value="readings">
          <Accordion.Control icon={<IconGauge size="1.375rem" />}>{t("Readings recorded")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap={6}>
              {[...wo.measurementEvidence].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map(reading => (
                <Group key={reading.id} justify="space-between" wrap="nowrap" align="flex-start">
                  <Text size="xs" c="dimmed">{formatDateTime(reading.recordedAt)}</Text>
                  <Text size="sm" fw={600}>{reading.value == null ? '—' : `${reading.value.toLocaleString()} ${reading.unit ?? ''}`}</Text>
                </Group>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>}

        <Accordion.Item value="history">
          <Accordion.Control icon={<IconHistory size="1.375rem" />}>{t("History")}</Accordion.Control>
          <Accordion.Panel><WorkOrderHistory workOrderId={wo.id} online={isOnline} open={openSections.includes('history')} /></Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="finish">
          <Accordion.Control icon={<IconTool size="1.375rem" />}>{t("Work status")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Group justify="space-between"><Text size="sm" c="dimmed">{t("Status")}</Text><StatusBadge status={wo.status} /></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">{t("Instructions")}</Text><Text size="sm" fw={600}>{completedCount} / {actionable.length} {t('complete')}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">{t("Recorded labor:")}</Text><Text size="sm" fw={600}>{wo.totalLaborHours} {t('hours')}</Text></Group>
              {otherTransitions.map(status => <Button key={status} variant="default" loading={statusMutation.isPending} onClick={() => statusMutation.mutate(status)}>{t(status.replace(/_/g, ' '))}</Button>)}
              {canCancel && <>
                <Divider />
                <Button variant="outline" color="red" leftSection={<IconX size="1.125rem" />} onClick={() => { cancelMutation.reset(); setCancelOpen(true) }}>{t("Cancel work order")}</Button>
              </>}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Box pos="sticky" bottom="calc(var(--app-shell-footer-offset, 0px) + env(safe-area-inset-bottom))" py={10} bg="var(--mantine-color-body)" style={{ zIndex: 2 }}>
        <Stack gap={8}>
          {canComplete && (
            <Button fullWidth size="lg" mih={54} color={pendingTasks.length ? 'gray' : 'green'} variant={pendingTasks.length ? 'default' : 'filled'} leftSection={<IconCheck size="1.25rem" />} onClick={openComplete}>
              {pendingTasks.length ? `${pendingTasks.length} ${t(pendingTasks.length === 1 ? 'instruction left' : 'instructions left')}` : t("Complete work order")}
            </Button>
          )}
          {(startTransition || currentTask || !canComplete) && (
            <Button fullWidth size="lg" h="auto" mih={54} py={8} styles={{ inner: { minHeight: 54 }, label: { whiteSpace: 'normal', lineHeight: 1.15, textAlign: 'center' } }} color="yellow" disabled={!startTransition && !currentTask} loading={statusMutation.isPending} onClick={continueInspection}>
              {t(startTransition ? 'Start inspection' : currentTask ? 'Continue inspection' : 'Inspection complete')}
            </Button>
          )}
        </Stack>
      </Box>

      <Modal opened={completeOpen} onClose={() => !completeMutation.isPending && setCompleteOpen(false)} title={<Text fw={750} size="lg">{t("Complete work order")}</Text>} centered size="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">{wo.number} · {wo.title}</Text>
          {pendingTasks.length > 0 ? (
            <Alert color="orange" variant="light" icon={<IconAlertTriangle size="1.25rem" />} title={`${pendingTasks.length} ${t(pendingTasks.length === 1 ? 'instruction is not complete yet' : 'instructions are not complete yet')}`}>
              <Text size="sm" mb={8}>{t("You can finish these now, or complete the work order and record them as unanswered.")}</Text>
              <List size="sm" spacing={4}>
                {pendingTasks.slice(0, 6).map(task => (
                  <List.Item key={task.id}>
                    <Button variant="subtle" size="compact-sm" color="orange" px={4} h="auto" py={2} onClick={() => goToTask(task.id)} styles={{ label: { whiteSpace: 'normal', textAlign: 'left' } }}>{task.description}</Button>
                  </List.Item>
                ))}
              </List>
              {pendingTasks.length > 6 && <Text size="xs" mt={6}>+{pendingTasks.length - 6} {t("more")}</Text>}
              <Checkbox mt={10} checked={completeAnyway} onChange={event => setCompleteAnyway(event.currentTarget.checked)}
                label={t(pendingTasks.length === 1 ? 'Complete with this instruction unanswered' : 'Complete with these instructions unanswered')} />
            </Alert>
          ) : (
            <Alert color="green" variant="light" icon={<IconCheck size="1.25rem" />}>{t("All answerable instructions are complete.")} ({actionable.length})</Alert>
          )}
          {skippedChoiceTasks.length > 0 && <Alert color="orange" variant="light">{skippedChoiceTasks.length} {t(skippedChoiceTasks.length === 1
            ? 'instruction without valid choices will be skipped and recorded in history.'
            : 'instructions without valid choices will be skipped and recorded in history.')}</Alert>}
          {needsLabor ? (
            <NumberInput label={t("Labor hours")} description={t("No labor is logged yet. This time is recorded when you complete (up to 24 h; log longer work per day in the Labor section).")}
              value={completionLabor} onChange={value => setCompletionLabor(Math.min(24, Number(value) || 0))} onBlur={() => completionLabor > 0 && setCompletionLabor(halfHours(completionLabor))} min={0.5} max={24} clampBehavior="strict" step={0.5} decimalScale={1} suffix=" h" required />
          ) : (
            <Group justify="space-between"><Text size="sm" c="dimmed">{t("Recorded labor:")}</Text><Text size="sm" fw={600}>{wo.totalLaborHours} {t('hours')}</Text></Group>
          )}
          <Textarea label={t("Completion remarks")} description={t("Summarize the work completed and any follow-up required.")} value={completionNotes} minRows={3} maxLength={2000} autosize
            onChange={event => { const value = event.currentTarget.value; setCompletionNotes(value) }} required data-autofocus />
          {completeMutation.error && <Alert color="red">{getApiError(completeMutation.error)}</Alert>}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setCompleteOpen(false)} disabled={completeMutation.isPending}>{t("Back")}</Button>
            <Button color="green" leftSection={<IconCheck size="1.125rem" />} loading={completeMutation.isPending}
              disabled={(pendingTasks.length > 0 && !completeAnyway) || !completionNotes.trim() || (needsLabor && completionLabor <= 0)} onClick={() => completeMutation.mutate()}>
              {t("Complete work order")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={cancelOpen} onClose={() => !cancelMutation.isPending && setCancelOpen(false)}
        title={<Group gap={8}><IconAlertTriangle size="1.25rem" color="var(--mantine-color-red-6)" /><Text fw={750} size="lg">{t("Cancel work order?")}</Text></Group>} centered>
        <Stack gap="md">
          <Alert color="red" variant="light">{t("A cancelled work order cannot be restarted from the app. Recorded instructions, readings and labor are kept.")}</Alert>
          <Textarea label={t("Reason for cancelling")} placeholder={t("e.g. duplicate work order, equipment out of service…")} value={cancelReason} minRows={3} maxLength={1000} autosize required data-autofocus
            onChange={event => { const value = event.currentTarget.value; setCancelReason(value) }} />
          {cancelMutation.error && <Alert color="red">{getApiError(cancelMutation.error)}</Alert>}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setCancelOpen(false)} disabled={cancelMutation.isPending}>{t("Keep work order")}</Button>
            <Button color="red" leftSection={<IconX size="1.125rem" />} loading={cancelMutation.isPending} disabled={!cancelReason.trim()} onClick={() => cancelMutation.mutate(cancelReason.trim())}>{t("Cancel work order")}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

export default WorkOrderExecute
