import { Alert, AppShell, Avatar, Badge, Box, Burger, Button, Container, Divider, Drawer, Group, Modal, NavLink, Select, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
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

function Brand() {
  return (
    <Group gap={10} wrap="nowrap">
      <ThemeIcon variant="filled" color="yellow" size={30} radius={6}>
        <IconBox size={18} stroke={2.2} color="#111827" />
      </ThemeIcon>
      <Text fw={800} size="md">CMMS</Text>
    </Group>
  )
}

function MobileLayoutContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpened, { open: openMenu, close: closeMenu }] = useDisclosure(false)
  const isDesktop = useMediaQuery('(min-width: 62em)')
  const { currentSite, currentSiteId, canSwitchSite, permittedSites, requiresSelection, loading, selectSite } = useTechnicianSite()

  const noSiteAccess = !loading && permittedSites.length === 0
  const profileRoute = location.pathname.startsWith('/profile')
  const siteLabel = loading ? 'Loading…' : currentSite?.code || currentSite?.name || 'Not selected'

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: 'md', collapsed: { mobile: true } }}
      footer={{ height: 64, collapsed: !!isDesktop }}
      padding={0}
      styles={{ main: { background: 'var(--mantine-color-body)' } }}
    >
      <AppShell.Header px={16} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap={10} wrap="nowrap">
            {!isDesktop && <Burger aria-label="Open navigation" opened={menuOpened} onClick={openMenu} size="sm" />}
            <Brand />
          </Group>
          <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
            <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconMapPin size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" fw={600} truncate maw={140}>{siteLabel}</Text>
            </Group>
            <UnstyledButton aria-label="Open profile" onClick={() => navigate('/profile')}>
              <Avatar size={30} radius="xl" color="blue">U</Avatar>
            </UnstyledButton>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs" style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
        <Stack gap={2}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              variant="light"
              color="dark"
              style={{ borderRadius: 6 }}
            />
          ))}
        </Stack>
        <Box mt="auto" p="xs">
          <Text size="xs" c="dimmed">Current site</Text>
          <Text size="sm" fw={650} truncate>{currentSite?.name ?? 'Not selected'}</Text>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size={960} px={16} py={14}>
          {noSiteAccess && !profileRoute ? (
            <Alert color="orange" title="No site access">Your account does not currently have access to a maintenance site. Ask an administrator to review your site access. You can still open Profile to sign out.</Alert>
          ) : (
            <Outlet />
          )}
        </Container>
      </AppShell.Main>

      {!isDesktop && <AppShell.Footer style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Group h="100%" grow gap={0} wrap="nowrap">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path)
            return (
              <UnstyledButton key={item.path} aria-label={item.label} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.path)} style={{ minHeight: 52, height: '100%' }}>
                <Stack gap={2} align="center" justify="center">
                  <item.icon size={21} stroke={active ? 2.1 : 1.7} color={active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)'} />
                  <Text size="10px" fw={active ? 700 : 500} c={active ? undefined : 'dimmed'}>{item.label}</Text>
                </Stack>
              </UnstyledButton>
            )
          })}
        </Group>
      </AppShell.Footer>}

      <Drawer
        opened={menuOpened && !isDesktop}
        onClose={closeMenu}
        size={280}
        title={<Brand />}
        styles={{
          content: { display: 'flex', flexDirection: 'column' },
          body: { flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' },
        }}
      >
        <Stack gap={4}>
          {navItems.map(item => (
            <Button key={item.path} variant={location.pathname.startsWith(item.path) ? 'light' : 'subtle'} color="dark" justify="flex-start" leftSection={<item.icon size={18} />} onClick={() => { navigate(item.path); closeMenu() }}>{item.label}</Button>
          ))}
        </Stack>
        <Box mt="auto">
          <Divider mb="sm" />
          {canSwitchSite ? (
            <Select
              label="Current site"
              value={currentSiteId}
              onChange={value => value && selectSite(value)}
              allowDeselect={false}
              comboboxProps={{ withinPortal: false, position: 'top' }}
              data={permittedSites.map(site => ({ value: site.id, label: site.code ? `${site.name} · ${site.code}` : site.name }))}
            />
          ) : (
            <>
              <Text size="xs" c="dimmed">Current site</Text>
              <Text size="sm" fw={650}>{currentSite?.name ?? 'Not selected'}</Text>
            </>
          )}
        </Box>
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
