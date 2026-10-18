import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Group, Image, Modal, Stack, Text } from '@mantine/core'
import { IconFileText, IconPhoto } from '@tabler/icons-react'
import { getApiError, workOrderService, type TaskAttachmentDto } from '@cmms/api-client'

const isImage = (item: TaskAttachmentDto) =>
  item.contentType ? item.contentType.startsWith('image/') : /\.(png|jpe?g|gif|webp)$/i.test(item.fileName ?? '')

/** Reference material a planner attached to an instruction (how-to photos, manuals). Read only. */
export function TaskReferences({ items }: { items: TaskAttachmentDto[] }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  if (!items.length) return null

  const open = async (item: TaskAttachmentDto) => {
    setBusy(item.id)
    setError(undefined)
    try {
      const blob = await queryClient.fetchQuery({ queryKey: ['attachment', item.id], queryFn: () => workOrderService.getAttachmentBlob(item.id), staleTime: Infinity })
      const url = URL.createObjectURL(blob)
      if (isImage(item)) {
        setPreview({ url, name: item.fileName ?? 'Reference' })
      } else {
        // Documents are handed to the device instead of opened in a popup, which phones often block after an async fetch
        const link = document.createElement('a')
        link.href = url
        link.download = item.fileName ?? 'reference'
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch (cause) {
      setError(getApiError(cause, 'Could not open this file. It may need a connection.'))
    } finally {
      setBusy(null)
    }
  }
  const closePreview = () => { if (preview) URL.revokeObjectURL(preview.url); setPreview(null) }

  return (
    <Stack gap={6} mb={10}>
      <Text size="xs" fw={650} c="dimmed" tt="uppercase">Reference</Text>
      <Group gap={6}>
        {items.map(item => (
          <Button key={item.id} size="sm" h={44} variant="default" loading={busy === item.id} styles={{ label: { overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65vw' } }} leftSection={isImage(item) ? <IconPhoto size="1.25rem" /> : <IconFileText size="1.25rem" />} onClick={() => open(item)}>
            {item.fileName ?? 'Reference'}
          </Button>
        ))}
      </Group>
      {error && <Alert color="red" p="xs">{error}</Alert>}
      <Modal opened={!!preview} onClose={closePreview} title={preview?.name} size="lg" centered>
        {preview && <Image src={preview.url} alt={preview.name} fit="contain" />}
      </Modal>
    </Stack>
  )
}
