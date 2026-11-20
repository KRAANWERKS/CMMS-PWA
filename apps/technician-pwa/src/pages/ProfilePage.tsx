import { useI18n } from '../i18n'
import { formatDate } from '@cmms/ui'
import { Alert, Stack, Text, Paper, Group, Avatar, Button, Badge, SegmentedControl, Select, useMantineColorScheme, FileButton } from '@mantine/core'
import { IconLogout, IconWifi, IconWifiOff } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useMediaQuery } from '@mantine/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, authService, getApiError } from '@cmms/api-client'
import { useSignOut } from '../hooks/useSignOut'
import { getTextScale, setTextScale, type TextScale } from '../textScale'
import { useTechnicianSite } from '../context/TechnicianSiteContext'

export function ProfilePage() {
  const { language, setLanguage, t } = useI18n()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: authService.me })
  const queryClient = useQueryClient()
  const avatar = useMutation({ mutationFn: async (file: File) => { const body = new FormData(); body.append('file', file); await apiClient.put('/auth/avatar', body) }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }) })
  const { signOut, error: logoutError } = useSignOut()
  const { currentSiteId, currentSite, permittedSites, canSwitchSite, selectSite } = useTechnicianSite()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  // Three labels no longer fit side by side on the smallest phones, especially at the larger text sizes
  const narrow = useMediaQuery('(max-width: 380px)') ?? false
  const [textScale, setScale] = useState<TextScale>(getTextScale)

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

  return (
    <Stack gap="md">
      <Text fw={750} size="xl">{t("Profile")}</Text>
      {logoutError && <Alert color="red">{logoutError}</Alert>}

      <Paper p="md" radius={6} withBorder>
        <Group>
          <Avatar size="lg" color="cmms" src={user?.avatarUrl}>{user?.displayName?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'E'}</Avatar>
          <div>
            <Text fw={650}>{user?.displayName || t('CMMS Engineer')}</Text>
            <Text size="sm" c="dimmed">{user?.roles.map(role => role === 'TECHNICIAN' ? 'CMMS Engineer' : role).join(', ')}</Text>
          </div>
        </Group>
        <Group mt="sm"><FileButton accept="image/png,image/jpeg,image/webp" onChange={file => file && avatar.mutate(file)}>{props => <Button {...props} size="xs" variant="light" loading={avatar.isPending}>Update picture</Button>}</FileButton><Text size="xs" c="dimmed">PNG, JPEG or WebP · max 500 KB</Text></Group>
        {avatar.error && <Text size="xs" c="red" mt="xs">{getApiError(avatar.error)}</Text>}
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="xs">{t("Current site")}</Text>
        <Text size="sm" mb={canSwitchSite ? 'sm' : 0}>{currentSite?.name ?? t('No site selected')}</Text>
        {canSwitchSite && (
          <Select
            label={t("Switch site")}
            description={t('Only sites permitted for your account are listed.')}
            value={currentSiteId}
            onChange={value => value && selectSite(value)}
            data={permittedSites.map(site => ({ value: site.id, label: site.code ? `${site.name} · ${site.code}` : site.name }))}
          />
        )}
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">{t('Language')}</Text>
        <SegmentedControl
          fullWidth size="lg"
          value={language}
          onChange={value => setLanguage(value as 'en' | 'id')}
          data={[{ value: 'en', label: 'English' }, { value: 'id', label: 'Bahasa' }]}
        />
        <Text mt="xs" size="xs" c="dimmed">
          {language === 'id' ? 'Menu dan formulir menggunakan Bahasa Indonesia. Instruksi pekerjaan tetap dalam bahasa asli.' : 'Menus and forms use your language choice. Work instructions stay in their original language.'}
        </Text>
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">{t("Text size")}</Text>
        <SegmentedControl
          fullWidth
          size="lg"
          orientation={narrow ? 'vertical' : 'horizontal'}
          styles={{ label: { padding: '10px 4px' } }}
          value={textScale}
          onChange={value => { setScale(value as TextScale); setTextScale(value as TextScale) }}
          data={[
            { value: 'standard', label: t('Standard') },
            { value: 'large', label: t('Large') },
            { value: 'xlarge', label: t('Largest') },
          ]}
        />
        <Text mt="sm">{t("The quick brown fox: this is how text will look.")}</Text>
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">{t("Appearance")}</Text>
        <SegmentedControl
          fullWidth
          size="lg"
          orientation={narrow ? 'vertical' : 'horizontal'}
          styles={{ label: { padding: '10px 4px' } }}
          value={colorScheme}
          onChange={value => setColorScheme(value as 'auto' | 'light' | 'dark')}
          data={[
            { value: 'auto', label: t('System') },
            { value: 'light', label: t('Light') },
            { value: 'dark', label: t('Dark') },
          ]}
        />
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">{t("Browser connectivity")}</Text>
        <Group justify="space-between" align="flex-start">
          <Group gap="xs">
            {isOnline
              ? <IconWifi size="1.25rem" color="var(--mantine-color-teal-6)" />
              : <IconWifiOff size="1.25rem" color="var(--mantine-color-red-6)" />}
            <div>
              <Text size="sm">{t(isOnline ? 'Network appears available' : 'Browser reports offline')}</Text>
              <Text size="xs" c="dimmed">{t('This indicator does not confirm that the CMMS server is reachable.')}</Text>
            </div>
          </Group>
          <Badge color={isOnline ? 'teal' : 'red'} variant="light" size="sm">
            {t(isOnline ? 'Online hint' : 'Offline')}
          </Badge>
        </Group>
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">{t("App Info")}</Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{t("Version")}</Text>
            <Text size="sm">1.0.0</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{t("Build")}</Text>
            <Text size="sm">{formatDate(new Date())}</Text>
          </Group>
        </Stack>
      </Paper>

      <Button
        variant="light"
        color="red"
        leftSection={<IconLogout size="1.25rem" />}
        fullWidth
        onClick={signOut}
      >
        Sign Out
      </Button>
    </Stack>
  )
}

export default ProfilePage
