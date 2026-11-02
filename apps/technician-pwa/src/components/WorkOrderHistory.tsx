import { useI18n } from '../i18n'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, FileButton, Group, Loader, Stack, Text, Textarea } from '@mantine/core'
import { IconCamera } from '@tabler/icons-react'
import { getApiError, workOrderService } from '@cmms/api-client'
import { AttachmentThumb } from './TaskPhotos'

export function WorkOrderHistory({ workOrderId, enabled }: { workOrderId: string; enabled: boolean }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['work-order-history', workOrderId],
    queryFn: () => workOrderService.getHistory(workOrderId),
    enabled,
    staleTime: 30_000,
    retry: false,
  })
  const submit = useMutation({
    mutationFn: ({ message, files }: { message: string; files: File[] }) => workOrderService.postComment(workOrderId, message, files),
    onSuccess: () => {
      setDraft('')
      setPhotos([])
      setPhotoError(null)
      void queryClient.invalidateQueries({ queryKey: ['work-order-history', workOrderId] })
      void queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
    },
  })
  const attachPhotos = (files: File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const valid = files.filter(file => allowed.includes(file.type.toLowerCase()) && file.size > 0 && file.size <= 15 * 1024 * 1024)
    setPhotoError(valid.length !== files.length ? 'Use JPEG, PNG, WebP, HEIC or HEIF photos under 15 MB each.' : photos.length + valid.length > 4 ? 'Maximum 4 photos per comment.' : null)
    setPhotos(current => [...current, ...valid].slice(0, 4))
  }

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Textarea label={t('Add comment')} placeholder={t('Add an update or handover note…')} minRows={2} maxLength={2000}
          value={draft} onChange={event => setDraft(event.currentTarget.value)} disabled={!enabled || submit.isPending} />
        <Group gap="xs" wrap="wrap">
          <FileButton multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={attachPhotos}>
            {props => <Button {...props} size="xs" variant="light" leftSection={<IconCamera size={16} />}
              disabled={!enabled || submit.isPending || photos.length >= 4}>{t("Attach photos")}</Button>}
          </FileButton>
          <Text size="xs" c="dimmed">{t("Up to 4 photos · 15 MB each")}</Text>
        </Group>
        {photos.map((file, index) => <Group key={index} justify="space-between" wrap="nowrap">
          <Text size="xs" lineClamp={1}>{file.name}</Text>
          <Button size="compact-xs" variant="subtle" color="red" disabled={submit.isPending}
            onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}>{t("Remove")}</Button>
        </Group>)}
        {photoError && <Alert color="orange" p="xs">{photoError}</Alert>}
        {!enabled && <Text size="xs" c="dimmed">{t("Connect to the internet to post comments and photos.")}</Text>}
        {submit.error && <Alert color="red" p="xs">{getApiError(submit.error, t('Could not post comment'))}</Alert>}
        <Button fullWidth color="yellow" c="#111827" loading={submit.isPending}
          disabled={!enabled || (!draft.trim() && photos.length === 0)}
          onClick={() => submit.mutate({ message: draft.trim(), files: photos })}>{t("Post comment")}</Button>
      </Stack>
      {isLoading ? <Loader size="xs" />
        : error ? <Text size="sm" c="dimmed">{t("History is unavailable right now.")}</Text>
        : !data?.length ? <Text size="sm" c="dimmed">{t("No history yet.")}</Text>
        : <Stack gap="sm">
          {[...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(entry => (
            <Stack key={entry.id} gap={2}>
              <Group gap={6} wrap="nowrap">
                <Text size="xs" c="dimmed">{new Date(entry.createdAt).toLocaleString()}</Text>
                {entry.kind && <Badge size="xs" variant="light" color="gray">{entry.kind.replace(/_/g, ' ')}</Badge>}
              </Group>
              {entry.comment && <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{entry.comment.replace(/^\[[A-Z_]+\]\s*/, '')}</Text>}
              {(entry.attachments?.length ?? 0) > 0 && <Group gap={6} wrap="wrap">{entry.attachments!.map(photo => <AttachmentThumb key={photo.id} attachment={photo} />)}</Group>}
              {entry.authorDisplayName && <Text size="xs" c="dimmed">{entry.authorDisplayName}</Text>}
            </Stack>
          ))}
        </Stack>}
    </Stack>
  )
}
