import { useSyncExternalStore } from 'react'
import { useIsFetching, useIsMutating, useQueryClient } from '@tanstack/react-query'

export type ConnectionState = 'offline' | 'unreachable' | 'syncing' | 'online'

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

const isNetworkError = (error: unknown) =>
  !!error && typeof error === 'object' && !('response' in error && (error as { response?: unknown }).response)

/**
 * Browser connectivity plus what React Query has observed:
 * - offline: the browser reports no network
 * - unreachable: browser is online but a request failed without any server response
 * - syncing: requests are in flight
 * lastSyncedAt is the most recent successful fetch of any cached query (persisted across reloads).
 */
export function useConnectionStatus() {
  const queryClient = useQueryClient()
  const cache = queryClient.getQueryCache()
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const fetching = useIsFetching() + useIsMutating()

  const lastSyncedAt = useSyncExternalStore(
    callback => cache.subscribe(callback),
    () => cache.getAll().reduce((latest, query) => Math.max(latest, query.state.dataUpdatedAt), 0),
  )
  const failedCount = useSyncExternalStore(
    callback => cache.subscribe(callback),
    () => cache.getAll().filter(query => query.state.status === 'error' && query.state.fetchStatus !== 'fetching' && isNetworkError(query.state.error)).length,
  )

  const state: ConnectionState = !isOnline ? 'offline' : failedCount > 0 && fetching === 0 ? 'unreachable' : fetching > 0 ? 'syncing' : 'online'
  return { state, isOnline, lastSyncedAt: lastSyncedAt || null }
}
