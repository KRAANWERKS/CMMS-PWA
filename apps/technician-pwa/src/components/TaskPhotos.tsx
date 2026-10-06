import { useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { Alert, Box, Button, Group, Loader, Stack, Text } from '@mantine/core'
import { IconCamera } from '@tabler/icons-react'
import { getApiError, workOrderService, type TaskAttachmentDto, type WorkOrderDto } from '@cmms/api-client'
import { db } from '../db/schema'
import { applyEntry, submitChange } from '../db/sync'

const MAX_EDGE = 1600

// Phone photos are several MB; shrink them before upload so they send reliably on a weak connection
async function shrinkImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (!file.type.startsWith('image/')) return { blob: file, name: file.name }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (blob) return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' }
  } catch { /* fall back to the original file */ }
  return { blob: file, name: file.name }
}

function Thumb({ attachment }: { attachment: TaskAttachmentDto }) {
  const image = attachment.contentType ? attachment.contentType.startsWith('image/') : true
  // A photo still waiting to upload lives in the on-device outbox, not on the server
  const pendingId = attachment.id.startsWith('pending-') ? Number(attachment.id.slice('pending-'.length)) : null
  const pending = useLiveQuery(() => pendingId === null ? undefined : db.outbox.get(pendingId), [pendingId])
  // The blob itself is cached (never persisted: see main.tsx); the object URL is made and released per mount
  const { data: blob, isLoading } = useQuery({
    queryKey: ['attachment', attachment.id],
    queryFn: () => workOrderService.getAttachmentBlob(attachment.id),
    enabled: image && pendingId === null,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  })
  const source = pendingId === null ? blob : (pending?.payload.blob as Blob | undefined)
  const url = useMemo(() => source instanceof Blob ? URL.createObjectURL(source) : null, [source])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return (
    <Box w={72} h={72} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--mantine-color-default-border)', display: 'grid', placeItems: 'center' }}>
      {url ? <img src={url} alt={attachment.fileName ?? 'Task photo'} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: pendingId === null ? 1 : 0.6 }} />
        : isLoading && pendingId === null ? <Loader size="xs" /> : <Text size="xs" c="dimmed" ta="center" px={4} style={{ wordBreak: 'break-all' }}>{attachment.fileName ?? 'File'}</Text>}
    </Box>
  )
}

interface Props {
  workOrderId: string
  taskId: string
  attachments: TaskAttachmentDto[]
  minimum: number
  disabled?: boolean
}

export function TaskPhotos({ workOrderId, taskId, attachments, minimum, disabled }: Props) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { blob, name } = await shrinkImage(file)
      // Stored on the device first, so it survives a lost connection or a closed app
      return submitChange({ action: 'PHOTO', workOrderId, payload: { taskId, blob, fileName: name } }, saved => {
        queryClient.setQueryData<WorkOrderDto>(['work-order', workOrderId], current => current && applyEntry(current, saved))
      })
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] }) },
  })
  const missing = Math.max(0, minimum - attachments.length)

  return (
    <Stack gap={6}>
      {(minimum > 0 || attachments.length > 0) && (
        <Text size="xs" c={missing > 0 ? 'orange' : 'dimmed'} fw={missing > 0 ? 650 : 400}>
          {minimum > 0 ? `Photos: ${attachments.length} of ${minimum} required` : `Photos: ${attachments.length}`}
        </Text>
      )}
      {attachments.length > 0 && <Group gap={6}>{attachments.map(item => <Thumb key={item.id} attachment={item} />)}</Group>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={event => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) upload.mutate(file)
        }}
      />
      <Button variant="light" leftSection={<IconCamera size="1.25rem" />} loading={upload.isPending} disabled={disabled} onClick={() => input.current?.click()}>
        {attachments.length ? 'Add another photo' : 'Add photo'}
      </Button>
      {upload.data === 'queued' && <Text size="xs" c="dimmed">Saved on this device. It uploads automatically when you're back online.</Text>}
      {upload.error && <Alert color="red" p="xs">{getApiError(upload.error, 'Photo upload failed')}</Alert>}
    </Stack>
  )
}
