import { Alert, Stack, Text, Paper, Group, Avatar, Button, Badge, SegmentedControl, Select, useMantineColorScheme } from '@mantine/core'
import { IconLogout, IconWifi, IconWifiOff } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authService } from '@cmms/api-client'
import { useSignOut } from '../hooks/useSignOut'
import { getTextScale, setTextScale, type TextScale } from '../textScale'
import { useTechnicianSite } from '../context/TechnicianSiteContext'

export function ProfilePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: authService.me })
  const { signOut, error: logoutError } = useSignOut()
  const { currentSiteId, currentSite, permittedSites, canSwitchSite, selectSite } = useTechnicianSite()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
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
      <Text fw={750} size="xl">Profile</Text>
      {logoutError && <Alert color="red">{logoutError}</Alert>}

      <Paper p="md" radius={6} withBorder>
        <Group>
          <Avatar size="lg" color="cmms">{user?.displayName?.slice(0, 1) || 'T'}</Avatar>
          <div>
            <Text fw={650}>{user?.displayName || 'Technician'}</Text>
            <Text size="sm" c="dimmed">{user?.roles.join(', ')}</Text>
          </div>
        </Group>
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="xs">Current site</Text>
        <Text size="sm" mb={canSwitchSite ? 'sm' : 0}>{currentSite?.name ?? 'No site selected'}</Text>
        {canSwitchSite && (
          <Select
            label="Switch site"
            description="Only sites permitted for your account are listed."
            value={currentSiteId}
            onChange={value => value && selectSite(value)}
            data={permittedSites.map(site => ({ value: site.id, label: site.code ? `${site.name} · ${site.code}` : site.name }))}
          />
        )}
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">Text size</Text>
        <SegmentedControl
          fullWidth
          size="lg"
          value={textScale}
          onChange={value => { setScale(value as TextScale); setTextScale(value as TextScale) }}
          data={[
            { value: 'standard', label: 'Standard' },
            { value: 'large', label: 'Large' },
            { value: 'xlarge', label: 'Extra large' },
          ]}
        />
        <Text mt="sm">The quick brown fox: this is how text will look.</Text>
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">Appearance</Text>
        <SegmentedControl
          fullWidth
          size="lg"
          value={colorScheme}
          onChange={value => setColorScheme(value as 'auto' | 'light' | 'dark')}
          data={[
            { value: 'auto', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">Browser connectivity</Text>
        <Group justify="space-between" align="flex-start">
          <Group gap="xs">
            {isOnline
              ? <IconWifi size="1.25rem" color="var(--mantine-color-teal-6)" />
              : <IconWifiOff size="1.25rem" color="var(--mantine-color-red-6)" />}
            <div>
              <Text size="sm">{isOnline ? 'Network appears available' : 'Browser reports offline'}</Text>
              <Text size="xs" c="dimmed">This indicator does not confirm that the CMMS server is reachable.</Text>
            </div>
          </Group>
          <Badge color={isOnline ? 'teal' : 'red'} variant="light" size="sm">
            {isOnline ? 'Online hint' : 'Offline'}
          </Badge>
        </Group>
      </Paper>

      <Paper p="md" radius={6} withBorder>
        <Text fw={700} mb="sm">App Info</Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Version</Text>
            <Text size="sm">1.0.0</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Build</Text>
            <Text size="sm">{new Date().toISOString().split('T')[0]}</Text>
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
