import { Alert, AppShell, Avatar, Badge, Box, Burger, Button, Divider, Drawer, Group, Modal, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  IconBox,
  IconClipboardList,
  IconListDetails,
  IconMapPin,
  IconTool,
  IconUser,
} from '@tabler/icons-react'
import { TechnicianSiteProvider, useTechnicianSite } from '../context/TechnicianSiteContext'

const navItems = [
  { path: '/work-orders', label: 'My Work', icon: IconClipboardList },
  { path: '/assets', label: 'Assets', icon: IconTool },
  { path: '/parts', label: 'Parts', icon: IconListDetails },
  { path: '/profile', label: 'Profile', icon: IconUser },
]

function MobileLayoutContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpened, { open: openMenu, close: closeMenu }] = useDisclosure(false)
  const { currentSite, permittedSites, requiresSelection, loading, selectSite } = useTechnicianSite()

  const noSiteAccess = !loading && permittedSites.length === 0
  const profileRoute = location.pathname.startsWith('/profile')
  const go = (path: string) => { navigate(path); closeMenu() }

  return (
    <AppShell
      header={{ height: 104 }}
      footer={{ height: 68 }}
      padding={0}
      styles={{
        main: {
          paddingTop: 'var(--app-shell-header-height)',
          paddingBottom: 'calc(var(--app-shell-footer-height) + env(safe-area-inset-bottom))',
          background: 'var(--mantine-color-body)',
        },
      }}
    >
      <AppShell.Header p={0} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Group h={60} px={16} justify="space-between" wrap="nowrap">
          <Group gap={10} wrap="nowrap">
            <Burger aria-label="Open navigation" opened={menuOpened} onClick={openMenu} size="sm" />
            <ThemeIcon variant="filled" color="yellow" size={30} radius={6}>
              <IconBox size={18} stroke={2.2} color="#111827" />
            </ThemeIcon>
            <Text fw={800} size="md">CMMS</Text>
          </Group>
          <Avatar size={30} radius="xl" color="blue">U</Avatar>
        </Group>
        <Group h={44} px={16} gap={8} wrap="nowrap" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <IconMapPin size={15} color="#334155" />
          <Text size="12px" c="dimmed">Assigned site ·</Text>
          <Text size="12px" fw={700} truncate>{loading ? 'Loading…' : currentSite?.code || currentSite?.name || 'Not selected'}</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box px={16} py={14}>
          {noSiteAccess && !profileRoute ? (
            <Alert color="orange" title="No site access">Your account does not currently have access to a maintenance site. Ask an administrator to review your site access. You can still open Profile to sign out.</Alert>
          ) : (
            <Outlet />
          )}
        </Box>
      </AppShell.Main>

      <AppShell.Footer style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Group h="100%" grow gap={0} wrap="nowrap">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path)
            return (
              <UnstyledButton key={item.path} aria-label={item.label} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.path)} style={{ minHeight: 52, height: '100%' }}>
                <Stack gap={2} align="center" justify="center">
                  <item.icon size={21} stroke={active ? 2.1 : 1.7} color={active ? '#111827' : '#64748B'} />
                  <Text size="10px" fw={active ? 750 : 500} c={active ? '#111827' : 'dimmed'}>{item.label}</Text>
                </Stack>
              </UnstyledButton>
            )
          })}
        </Group>
      </AppShell.Footer>

      <Drawer opened={menuOpened} onClose={closeMenu} size="78%" title={<Group gap={8}><ThemeIcon variant="filled" color="yellow" size={26} radius={6}><IconBox size={16} color="#111827" /></ThemeIcon><Text fw={800}>CMMS</Text></Group>}>
        <Stack gap={4}>
          {navItems.map(item => <Button key={item.path} variant={location.pathname.startsWith(item.path) ? 'light' : 'subtle'} color="dark" justify="flex-start" leftSection={<item.icon size={18} />} onClick={() => go(item.path)}>{item.label}</Button>)}
          <Divider my="xs" />
          <Text size="xs" c="dimmed">Current site</Text>
          <Text size="sm" fw={650}>{currentSite?.name ?? 'Not selected'}</Text>
        </Stack>
      </Drawer>

      <Modal opened={requiresSelection && !profileRoute} onClose={() => undefined} closeOnClickOutside={false} closeOnEscape={false} withCloseButton={false} centered title="Choose your current site">
        <Stack>
          <Text size="sm" c="dimmed">Your account can work at more than one site. Choose the site for My Work. You can change it later from Profile.</Text>
          {permittedSites.map(site => (
            <Button key={site.id} variant="default" justify="space-between" onClick={() => selectSite(site.id)}>
              <span>{site.name}</span>{site.code && <Badge variant="light" color="gray">{site.code}</Badge>}
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
