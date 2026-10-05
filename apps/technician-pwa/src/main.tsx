import React from 'react'
import ReactDOM from 'react-dom/client'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { QueryClient } from '@tanstack/react-query'
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
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, gcTime: CACHE_MAX_AGE } },
})

if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') installMockApi()

applyTextScale(getTextScale())
startOutboxSync(queryClient)
registerSW()
if ('caches' in window) void caches.delete('api-cache')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: 'v1' }}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications />
        <BrowserRouter basename="/pwa">
          <App />
        </BrowserRouter>
      </MantineProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
