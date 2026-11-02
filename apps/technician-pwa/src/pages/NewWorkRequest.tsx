import { useI18n } from '../i18n'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, Group, Paper, Select, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { IconSend } from '@tabler/icons-react'
import { assetService, authService, getApiError, workRequestService, type AssetDto, type WorkRequestPriority } from '@cmms/api-client'
import { CMMSErrorState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'
import { useConnectionStatus } from '../hooks/useConnectionStatus'

const PRIORITIES: { value: WorkRequestPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

function flattenAssets(nodes: AssetDto[]): AssetDto[] {
  const result: AssetDto[] = []
  const visit = (items: AssetDto[]) => items.forEach(item => {
    result.push(item)
    if (item.children?.length) visit(item.children)
  })
  visit(nodes)
  return result
}

export default function NewWorkRequest() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { currentSiteId, currentSite } = useTechnicianSite()
  const online = useConnectionStatus().isOnline
  const user = useQuery({ queryKey: ['current-user'], queryFn: authService.me, staleTime: 60_000 })
  const assets = useQuery({
    queryKey: ['assetTree', currentSiteId],
    queryFn: () => assetService.getAssetTree(currentSiteId!),
    enabled: !!currentSiteId,
    staleTime: 5 * 60_000,
  })
  const [assetId, setAssetId] = useState<string | null>(searchParams.get('asset'))
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationNote, setLocationNote] = useState('')
  const [priority, setPriority] = useState<WorkRequestPriority>('MEDIUM')
  const assetOptions = useMemo(() => flattenAssets(assets.data ?? []).map(asset => ({
    value: asset.id,
    label: asset.name + ' · ' + asset.assetCode,
  })), [assets.data])

  const submit = useMutation({
    mutationFn: () => {
      const context = locationNote.trim()
      return workRequestService.create({
        siteId: currentSiteId!,
        assetId,
        title: title.trim(),
        description: context ? description.trim() + '\n\nLocation / additional context: ' + context : description.trim(),
        priority,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-requests'] }),
  })

  const reset = () => {
    setTitle('')
    setDescription('')
    setLocationNote('')
    setAssetId(null)
    setPriority('MEDIUM')
    submit.reset()
  }
  const cancel = () => { if (!submit.isPending) navigate('/work-orders') }

  if (user.error) return <CMMSErrorState message="Could not load your account" />

  return (
    <Box maw={780} mx="auto">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text fw={750} size="xl">{t("Submit a Work Request")}</Text>
            <Text size="sm" c="dimmed">{t("Send a maintenance request for review. It is not a Work Order until approved and converted.")}</Text>
          </Stack>
        </Group>
        <Paper withBorder radius={6} p={{ base: 'md', sm: 'lg' }}>
          {submit.isSuccess ? (
            <Stack gap="md">
              <Alert color="green" title="Work request submitted">
                {t('Your request has been recorded for maintenance review.')} {currentSite?.name || ''}
              </Alert>
              <Text size="xs" c="dimmed">{t('Request ID:')} {submit.data?.id}</Text>
              <Group justify="flex-end">
                <Button variant="default" onClick={reset}>{t("Submit another")}</Button>
                <Button color="cmms" onClick={cancel}>{t("Done")}</Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="md">
              {!online && <Alert color="yellow">{t("You're offline. Work requests can only be submitted while connected.")}</Alert>}
              <TextInput
                label={t("Site / location")}
                value={currentSite?.name ?? t('No operating site selected')}
                readOnly
                description={t("Automatically inherited from your current site in the sidebar.")}
              />
              <TextInput
                label={t("Title of the Work Request")}
                placeholder={t("Short summary of the issue")}
                value={title}
                onChange={event => setTitle(event.currentTarget.value)}
                maxLength={200}
                required
              />
              <Textarea
                label={t("How can we help?")}
                placeholder={t("Describe the problem, symptoms, impact, and anything already checked.")}
                value={description}
                onChange={event => setDescription(event.currentTarget.value)}
                minRows={5}
                autosize
                maxRows={10}
                required
              />
              <Select
                label={t("Where or what is having the problem?")}
                description={t("Optional. Select equipment when the issue relates to a specific asset.")}
                placeholder={t("Select related equipment when known")}
                data={assetOptions}
                value={assetId}
                onChange={setAssetId}
                disabled={!currentSiteId || assets.isLoading}
                searchable
                clearable
                nothingFoundMessage="No assets found"
                limit={50}
              />
              <TextInput
                label={t("Location / additional context")}
                placeholder={t("Deck, room, area, component, or other useful context")}
                value={locationNote}
                onChange={event => setLocationNote(event.currentTarget.value)}
              />
              <Select
                label={t("Priority")}
                value={priority}
                onChange={value => setPriority((value as WorkRequestPriority | null) ?? 'MEDIUM')}
                data={PRIORITIES.map(item => ({ ...item, label: t(item.label) }))}
                allowDeselect={false}
              />
              <Box p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">{t("Requested by")}</Text>
                <Text size="sm" fw={600}>{user.data?.displayName || t('Current user')}</Text>
                <Text size="xs" c="dimmed">{t("Requester identity is taken from your signed-in CMMS account.")}</Text>
              </Box>
              {submit.error && <Alert color="red">{getApiError(submit.error, t('Could not submit the work request'))}</Alert>}
              <Group justify="flex-end" gap="xs">
                <Button variant="default" onClick={cancel} disabled={submit.isPending}>{t("Cancel")}</Button>
                <Button
                  color="cmms"
                  leftSection={<IconSend size={16} />}
                  loading={submit.isPending}
                  disabled={!online || !currentSiteId || !user.data || !title.trim() || !description.trim()}
                  onClick={() => submit.mutate()}
                >
                  Submit request
                </Button>
              </Group>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Box>
  )
}
