import { useI18n } from '../i18n'
import { ActionIcon, Alert, AppShell, Avatar, Box, Burger, Button, Container, Divider, Drawer, Group, Menu, Modal, NavLink, Select, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { authService } from '@cmms/api-client'
import { PullToRefresh } from '../components/PullToRefresh'
import { SiteWeather } from '../components/SiteWeather'
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

function Brand({ hideWordOnPhone = false }: { hideWordOnPhone?: boolean }) {
  return (
    <Group gap={10} wrap="nowrap">
      <ThemeIcon variant="filled" color="yellow" size={38} radius={8}>
        <IconBox size="1.375rem" stroke={2.2} color="#111827" />
      </ThemeIcon>
      <Text fw={800} size="lg" className={hideWordOnPhone ? 'phone-hide' : undefined}>CMMS</Text>
    </Group>
  )
}

function CurrentSitePanel() {
  const { t } = useI18n()
  const { currentSite, currentSiteId, canSwitchSite, permittedSites, selectSite } = useTechnicianSite()
  return (
    <Box p="sm" mb="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
      <Group gap={7} mb={8}>
        <IconMapPin size={17} color="var(--mantine-color-dimmed)" />
        <Text size="xs" fw={750} tt="uppercase" c="dimmed">{t("Current site")}</Text>
      </Group>
      {canSwitchSite ? (
        <Select
          aria-label={t("Current site")}
          size="sm"
          value={currentSiteId}
          onChange={value => value && selectSite(value)}
          allowDeselect={false}
          comboboxProps={{ withinPortal: false, position: 'bottom' }}
          data={permittedSites.map(site => ({ value: site.id, label: site.code ? site.name + ' · ' + site.code : site.name }))}
        />
      ) : (
        <Stack gap={2}>
          <Text size="sm" fw={700}>{currentSite?.name ?? t('Not selected')}</Text>
          {currentSite?.code && <Text size="xs" c="dimmed">{currentSite.code}</Text>}
        </Stack>
      )}
      {currentSiteId && (
        <>
          <Divider my="sm" />
          <SiteWeather siteId={currentSiteId} />
        </>
      )}
    </Box>
  )
}

function MobileLayoutContent() {
  const { t } = useI18n()
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
      navbar={{ width: 278, breakpoint: 'md', collapsed: { mobile: true } }}
      footer={{ height: 76, collapsed: !!isDesktop }}
      padding={0}
      styles={{ main: { background: 'var(--mantine-color-body)', minWidth: 0, maxWidth: '100%', overflowX: 'clip' } }}
    >
      <AppShell.Header px={16} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap={10} wrap="nowrap">
            {!isDesktop && <Burger aria-label={t("Open navigation")} opened={menuOpened} onClick={openMenu} size="md" style={{ minWidth: 44, minHeight: 44 }} />}
            <Brand hideWordOnPhone />
          </Group>
          <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
            {!isDesktop && (
              <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                <IconMapPin size="1.125rem" color="var(--mantine-color-dimmed)" />
                <Text size="sm" fw={700} truncate maw={120}>{siteLabel}</Text>
              </Group>
            )}
            <ConnectionIndicator />
            <ActionIcon variant="subtle" color="gray" size={44} className="narrow-hide" aria-label={t("Refresh data")} disabled={!isOnline || refreshing} onClick={refresh}>
              <IconRefresh size="1.375rem" className={refreshing ? 'spin' : undefined} />
            </ActionIcon>
            <Menu position="bottom-end" width={200} withinPortal>
              <Menu.Target>
                <UnstyledButton aria-label={t("Account menu")}>
                  <Avatar size={40} radius="xl" color="blue">{user?.displayName?.slice(0, 1).toUpperCase() ?? 'U'}</Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.displayName ?? t('Technician')}</Menu.Label>
                <Menu.Item leftSection={<IconUser size="1.25rem" />} onClick={() => navigate('/profile')}>{t('Profile')}</Menu.Item>
                <Menu.Item color="red" leftSection={<IconLogout size="1.25rem" />} onClick={async () => { await signOut() }}>{t('Sign out')}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs" style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
        <CurrentSitePanel />
        <Stack gap={2}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              label={t(item.label)}
              leftSection={<item.icon size="1.375rem" />}
              active={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              variant="light"
              color="dark"
              style={{ borderRadius: 6, minHeight: 48 }}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {!isOnline && <Alert color="yellow" radius={0} py={8}>{t('Offline: showing saved data.')} {formatSynced(lastSyncedAt)}. {t('Changes will sync when you reconnect.')}</Alert>}
        {signOutError && <Alert color="red" radius={0} py={8} withCloseButton={false}>{signOutError}</Alert>}
        <PullToRefresh onRefresh={refresh}>
          <Container size={1320} px={16} py={14} style={{ minWidth: 0, maxWidth: '100%' }}>
            {noSiteAccess && !profileRoute ? (
              <Alert color="orange" title={t("No site access")}>{t("Your account does not currently have access to a maintenance site. Ask an administrator to review your site access. You can still open Profile to sign out.")}</Alert>
            ) : (
              <Outlet />
            )}
          </Container>
        </PullToRefresh>
      </AppShell.Main>

      {!isDesktop && <AppShell.Footer style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
      }}>
        <Group h="100%" gap={0} wrap="nowrap" style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path)
            return (
              <UnstyledButton
                key={item.path}
                aria-label={t(item.label)}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(item.path)}
                style={{ flex: '1 1 0', width: 0, minWidth: 0, height: '100%', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Stack gap={2} align="center" justify="center" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
                  <item.icon size="1.5rem" stroke={active ? 2.1 : 1.7} color={active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)'} />
                  <Text size="xs" fw={active ? 800 : 600} c={active ? undefined : 'dimmed'} truncate style={{ maxWidth: '100%', fontSize: '0.7rem' }}>{t(item.label)}</Text>
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
        <CurrentSitePanel />
        <Stack gap={4}>
          {navItems.map(item => (
            <Button key={item.path} h={52} variant={location.pathname.startsWith(item.path) ? 'light' : 'subtle'} color="dark" justify="flex-start" leftSection={<item.icon size="1.375rem" />} onClick={() => { navigate(item.path); closeMenu() }}>{t(item.label)}</Button>
          ))}
        </Stack>
      </Drawer>

      <Modal opened={requiresSelection && !profileRoute} onClose={() => undefined} closeOnClickOutside={false} closeOnEscape={false} withCloseButton={false} centered title={t("Choose your current site")}>
        <Stack>
          <Text size="sm" c="dimmed">{t("Your account can work at more than one site. Choose the site for My Work. You can change it later from the sidebar or Profile.")}</Text>
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
