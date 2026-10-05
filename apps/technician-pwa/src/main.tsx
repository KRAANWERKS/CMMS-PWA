import React from 'react'
import ReactDOM from 'react-dom/client'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Notifications } from '@mantine/notifications'
import App from './App'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { theme } from './theme'
import { registerSW } from 'virtual:pwa-register'
import { installMockApi } from './dev/mockApi'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 60 * 24 } },
})

if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true') installMockApi()

registerSW()
if ('caches' in window) void caches.delete('api-cache')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications />
        <BrowserRouter basename="/pwa">
          <App />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
