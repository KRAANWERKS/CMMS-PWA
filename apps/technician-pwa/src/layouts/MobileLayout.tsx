import { ActionIcon, Alert, AppShell, Avatar, Box, Burger, Button, Container, Divider, Drawer, Group, Menu, Modal, NavLink, Select, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { authService } from '@cmms/api-client'
import { PullToRefresh } from '../components/PullToRefresh'
import { flushOutbox } from '../db/sync'
import { useSignOut } from '../hooks/useSignOut'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  IconBox,
  IconClipboardList,
  IconListDetails,
  IconLogout,
  IconMapPin,
  IconRefresh,
  IconTool,
  IconUser,
} from '@tabler/icons-react'
import { ConnectionIndicator, formatSynced } from '../components/ConnectionIndicator'
import { useConnectionStatus } from '../hooks/useConnectionStatus'
import { TechnicianSiteProvider, useTechnicianSite } from '../context/TechnicianSiteContext'

const navItems = [
  { path: '/work-orders', label: 'My Work', icon: IconClipboardList },
  { path: '/assets', label: 'Assets', icon: IconTool },
  { path: '/parts', label: 'Parts', icon: IconListDetails },
  { path: '/profile', label: 'Profile', icon: IconUser },
]

function Brand() {
  return (
    <Group gap={10} wrap="nowrap">
      <ThemeIcon variant="filled" color="yellow" size={38} radius={8}>
        <IconBox size="1.375rem" stroke={2.2} color="#111827" />
      </ThemeIcon>
      <Text fw={800} size="lg">CMMS</Text>
    </Group>
  )
}

function SiteSelector() {
  const { currentSite, currentSiteId, canSwitchSite, permittedSites, selectSite } = useTechnicianSite()
  if (!canSwitchSite) {
    return (
      <>
        <Text size="xs" fw={600} mb={8}>Current site</Text>
        <Text size="sm" fw={650}>{currentSite?.name ?? 'Not selected'}</Text>
      </>
    )
  }
  return (
    <Select
      label="Current site"
      size="md"
      styles={{ input: { fontSize: 'var(--mantine-font-size-xs)', paddingInline: 10, paddingRight: 28 }, option: { fontSize: 'var(--mantine-font-size-xs)' }, label: { marginBottom: 8, fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-text)', fontWeight: 600 } }}
      value={currentSiteId}
      onChange={value => value && selectSite(value)}
      allowDeselect={false}
      comboboxProps={{ withinPortal: false, position: 'top' }}
      data={permittedSites.map(site => ({ value: site.id, label: site.code ? `${site.name} · ${site.code}` : site.name }))}
    />
  )
}

function MobileLayoutContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpened, { open: openMenu, close: closeMenu }] = useDisclosure(false)
  const isDesktop = useMediaQuery('(min-width: 62em)')
  const { currentSite, permittedSites, requiresSelection, loading, selectSite } = useTechnicianSite()

  const { isOnline, lastSyncedAt } = useConnectionStatus()
  const queryClient = useQueryClient()
  const refreshing = useIsFetching() > 0
  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: authService.me, staleTime: 60_000 })
  const { signOut, error: signOutError } = useSignOut()
  const refresh = async () => { await flushOutbox(); await queryClient.invalidateQueries() }
  const noSiteAccess = !loading && permittedSites.length === 0
  const profileRoute = location.pathname.startsWith('/profile')
  const siteLabel = loading ? 'Loading…' : currentSite?.code || currentSite?.name || 'Not selected'

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{ width: 270, breakpoint: 'md', collapsed: { mobile: true } }}
      footer={{ height: 76, collapsed: !!isDesktop }}
      padding={0}
      styles={{ main: { background: 'var(--mantine-color-body)' } }}
    >
      <AppShell.Header px={16} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap={10} wrap="nowrap">
            {!isDesktop && <Burger aria-label="Open navigation" opened={menuOpened} onClick={openMenu} size="md" />}
            <Brand />
          </Group>
          <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
            <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconMapPin size="1.125rem" color="var(--mantine-color-dimmed)" />
              <Text size="sm" fw={700} truncate maw={150}>{siteLabel}</Text>
            </Group>
            <ConnectionIndicator />
            <ActionIcon variant="subtle" color="gray" size={44} aria-label="Refresh data" disabled={!isOnline || refreshing} onClick={refresh}>
              <IconRefresh size="1.375rem" className={refreshing ? 'spin' : undefined} />
            </ActionIcon>
            <Menu position="bottom-end" width={200} withinPortal>
              <Menu.Target>
                <UnstyledButton aria-label="Account menu">
                  <Avatar size={40} radius="xl" color="blue">{user?.displayName?.slice(0, 1).toUpperCase() ?? 'U'}</Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.displayName ?? 'Technician'}</Menu.Label>
                <Menu.Item leftSection={<IconUser size="1.25rem" />} onClick={() => navigate('/profile')}>Profile</Menu.Item>
                <Menu.Item color="red" leftSection={<IconLogout size="1.25rem" />} onClick={async () => { await signOut() }}>Sign out</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs" style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
        <Stack gap={2}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size="1.375rem" />}
              active={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              variant="light"
              color="dark"
              style={{ borderRadius: 6, minHeight: 48 }}
            />
          ))}
        </Stack>
        <Box mt="auto" p="xs">
          <SiteSelector />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        {!isOnline && <Alert color="yellow" radius={0} py={8}>You're offline. Showing saved data · {formatSynced(lastSyncedAt)}. Changes are disabled until you reconnect.</Alert>}
        {signOutError && <Alert color="red" radius={0} py={8} withCloseButton={false}>{signOutError}</Alert>}
        <PullToRefresh onRefresh={refresh}>
        <Container size={960} px={16} py={14}>
          {noSiteAccess && !profileRoute ? (
            <Alert color="orange" title="No site access">Your account does not currently have access to a maintenance site. Ask an administrator to review your site access. You can still open Profile to sign out.</Alert>
          ) : (
            <Outlet />
          )}
        </Container>
        </PullToRefresh>
      </AppShell.Main>

      {!isDesktop && <AppShell.Footer style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Group h="100%" grow gap={0} wrap="nowrap">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path)
            return (
              <UnstyledButton key={item.path} aria-label={item.label} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.path)} style={{ minHeight: 56, height: '100%' }}>
                <Stack gap={2} align="center" justify="center">
                  <item.icon size="1.5rem" stroke={active ? 2.1 : 1.7} color={active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)'} />
                  <Text size="xs" fw={active ? 800 : 600} c={active ? undefined : 'dimmed'}>{item.label}</Text>
                </Stack>
              </UnstyledButton>
            )
          })}
        </Group>
      </AppShell.Footer>}

      <Drawer
        opened={menuOpened && !isDesktop}
        onClose={closeMenu}
        size={310}
        title={<Brand />}
        styles={{
          content: { display: 'flex', flexDirection: 'column' },
          body: { flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' },
        }}
      >
        <Stack gap={4}>
          {navItems.map(item => (
            <Button key={item.path} h={52} variant={location.pathname.startsWith(item.path) ? 'light' : 'subtle'} color="dark" justify="flex-start" leftSection={<item.icon size="1.375rem" />} onClick={() => { navigate(item.path); closeMenu() }}>{item.label}</Button>
          ))}
        </Stack>
        <Box mt="auto">
          <Divider mb="sm" />
          <SiteSelector />
        </Box>
      </Drawer>

      <Modal opened={requiresSelection && !profileRoute} onClose={() => undefined} closeOnClickOutside={false} closeOnEscape={false} withCloseButton={false} centered title="Choose your current site">
        <Stack>
          <Text size="sm" c="dimmed">Your account can work at more than one site. Choose the site for My Work. You can change it later from Profile.</Text>
          {permittedSites.map(site => (
            <Button
              key={site.id}
              variant="default"
              h="auto"
              py="md"
              px="md"
              justify="flex-start"
              styles={{ inner: { justifyContent: 'flex-start' }, label: { display: 'block', whiteSpace: 'normal', textAlign: 'left', width: '100%', height: 'auto' } }}
              onClick={() => selectSite(site.id)}
            >
              <Stack gap={8} align="flex-start" style={{ width: '100%' }}>
                <Text fw={700} lh={1.3} ta="left">{site.name}</Text>
                {site.code && <Text size="sm" c="dimmed" fw={500} lh={1.3} ta="left">Site code: {site.code}</Text>}
              </Stack>
            </Button>
          ))}
        </Stack>
      </Modal>
    </AppShell>
  )
}

export function MobileLayout() {
  return <TechnicianSiteProvider><MobileLayoutContent /></TechnicianSiteProvider>
}
