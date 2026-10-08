import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Button, SegmentedControl, Select, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { assetService, authService, getApiError, workOrderService } from '@cmms/api-client'
import { CMMSErrorState } from '@cmms/ui'
import { useTechnicianSite } from '../context/TechnicianSiteContext'
import { useConnectionStatus } from '../hooks/useConnectionStatus'

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

export default function NewWorkRequest() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentSiteId, currentSite } = useTechnicianSite()
  const online = useConnectionStatus().isOnline
  const user = useQuery({ queryKey: ['current-user'], queryFn: authService.me, staleTime: 60_000 })
  const assets = useQuery({ queryKey: ['assets', currentSiteId], queryFn: () => assetService.getAllAssets(currentSiteId!), enabled: !!currentSiteId, staleTime: 10 * 60_000 })
  const [assetId, setAssetId] = useState<string | null>(searchParams.get('asset'))
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const assetOptions = useMemo(() => (assets.data?.items ?? []).map(asset => ({ value: asset.id, label: `${asset.assetCode} · ${asset.name}` })), [assets.data])

  const submit = useMutation({
    mutationFn: () => workOrderService.createWorkRequest({
      siteId: currentSiteId!, requestedBy: user.data!.id, assetId: assetId ?? undefined,
      title: title.trim(), description: description.trim() || undefined, priority,
    }),
  })

  if (user.error) return <CMMSErrorState message="Could not load your account" />

  if (submit.isSuccess) return (
    <Stack gap="md">
      <Alert color="teal" title="Request sent">A supervisor will review it and can turn it into a work order.</Alert>
      <Button onClick={() => navigate('/work-orders')}>Back to My Work</Button>
    </Stack>
  )

  return (
    <Stack gap="md">
      <div>
        <Text fw={750} size="xl">Report an issue</Text>
        <Text size="sm" c="dimmed">{currentSite?.name ?? 'Current site'}</Text>
      </div>
      {!online && <Alert color="yellow">You're offline. Requests can only be sent while connected.</Alert>}
      <Select label="Asset (optional)" placeholder="Search by code or name" data={assetOptions} value={assetId} onChange={setAssetId} searchable clearable nothingFoundMessage="No assets found" limit={50} />
      <TextInput label="What is wrong?" placeholder="Short summary" value={title} onChange={event => setTitle(event.currentTarget.value)} maxLength={200} required />
      <Textarea label="Details (optional)" minRows={3} value={description} onChange={event => setDescription(event.currentTarget.value)} maxLength={2000} />
      <div>
        <Text size="sm" fw={500} mb={4}>Priority</Text>
        <SegmentedControl fullWidth value={priority} onChange={setPriority} data={PRIORITIES} />
      </div>
      {submit.error && <Alert color="red">{getApiError(submit.error, 'Could not send the request')}</Alert>}
      <Button size="lg" color="yellow" c="#111827" loading={submit.isPending} disabled={!online || !title.trim() || !user.data || !currentSiteId} onClick={() => submit.mutate()}>Send request</Button>
    </Stack>
  )
}
