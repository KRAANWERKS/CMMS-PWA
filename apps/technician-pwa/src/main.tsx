import React from 'react'
import ReactDOM from 'react-dom/client'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider, defaultShouldDehydrateQuery, dehydrate, hydrate, onlineManager } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Notifications } from '@mantine/notifications'
import App from './App'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '../../../packages/ui/src/theme.css'
import './app.css'
import { theme } from './theme'
import { LanguageProvider } from './i18n'
import { applyTextScale, getTextScale } from './textScale'
import { registerSW } from 'virtual:pwa-register'
import { startOutboxSync } from './db/sync'
import { installMockApi } from './dev/mockApi'

// Persist server data so lists and opened work orders remain readable after a reload while offline.
// Attachments are intentionally excluded because image blobs can exceed browser storage limits.
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7
const CACHE_KEY = 'cmms-pwa-query-cache-v1'
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, gcTime: CACHE_MAX_AGE }, mutations: { networkMode: 'always' } },
})

// Avoid firing requests when the app opens with no signal.
onlineManager.setOnline(navigator.onLine)

try {
  const raw = localStorage.getItem(CACHE_KEY)
  if (raw) {
    const cached = JSON.parse(raw) as { savedAt: number; state: ReturnType<typeof dehydrate> }
    if (Date.now() - cached.savedAt <= CACHE_MAX_AGE) hydrate(queryClient, cached.state)
    else localStorage.removeItem(CACHE_KEY)
  }
} catch { /* storage unavailable or stale cache */ }

let persistTimer: number | undefined
queryClient.getQueryCache().subscribe(() => {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: query => defaultShouldDehydrateQuery(query) && query.queryKey[0] !== 'attachment',
      })
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), state }))
    } catch { /* storage quota or serialization failure */ }
  }, 1000)
})

if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') installMockApi()

applyTextScale(getTextScale())
startOutboxSync(queryClient)
registerSW()
if ('caches' in window) void caches.delete('api-cache')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <LanguageProvider>
        <Notifications />
        <BrowserRouter basename="/pwa">
          <App />
        </BrowserRouter>
        </LanguageProvider>
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
