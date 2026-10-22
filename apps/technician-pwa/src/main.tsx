import React from 'react'
import ReactDOM from 'react-dom/client'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { QueryClient, onlineManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'
import { BrowserRouter } from 'react-router-dom'
import { Notifications } from '@mantine/notifications'
import App from './App'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './app.css'
import { theme } from './theme'
import { applyTextScale, getTextScale } from './textScale'
import { registerSW } from 'virtual:pwa-register'
import { startOutboxSync } from './db/sync'
import { installMockApi } from './dev/mockApi'

// Server data is saved to IndexedDB so lists and opened work orders stay readable offline
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7
const persister = createAsyncStoragePersister({
  storage: { getItem: key => get(key), setItem: (key, value) => set(key, value), removeItem: key => del(key) },
  key: 'cmms-pwa-query-cache',
  throttleTime: 1000,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, gcTime: CACHE_MAX_AGE },
    // Writes go through the on-device outbox (db/sync.ts), which saves first and sends when it can.
    // The default ('online') would pause every mutation while offline, so nothing would be queued.
    mutations: { networkMode: 'always' },
  },
})

// React Query assumes it is online until it sees an 'offline' event. Opening the app with no signal fires
// no event, so every query would fire, fail and flip to 'error', and the saved copy would be evicted.
onlineManager.setOnline(navigator.onLine)

if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') installMockApi()

applyTextScale(getTextScale())
startOutboxSync(queryClient)
registerSW()
if ('caches' in window) void caches.delete('api-cache')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: 'v1', // Keep anything that has data, even if a later refresh failed, so a flaky connection never wipes the saved copy
    dehydrateOptions: { shouldDehydrateQuery: query => query.state.data !== undefined && query.queryKey[0] !== 'attachment' } }}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications />
        <BrowserRouter basename="/pwa">
          <App />
        </BrowserRouter>
      </MantineProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
