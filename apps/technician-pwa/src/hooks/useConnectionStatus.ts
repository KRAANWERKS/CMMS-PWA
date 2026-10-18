import { useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useIsFetching, useIsMutating, useQueryClient } from '@tanstack/react-query'

import { db } from '../db/schema'

/** Failed send attempts after which a queued change is shown as not sending */
const STUCK_AFTER = 3

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

  // Counting by index avoids reading queued photo blobs into memory on every change
  const pendingCount = useLiveQuery(() => db.outbox.where('status').equals('PENDING').count(), [], 0)
  const failed = useLiveQuery(() => db.outbox.where('status').equals('FAILED').toArray(), [], [])
  // Still queued but failing again and again (e.g. a server error on one record): tell the technician
  const stuck = useLiveQuery(() => db.outbox.where('attempts').aboveOrEqual(STUCK_AFTER).and(entry => entry.status === 'PENDING').toArray(), [], [])

  const state: ConnectionState = !isOnline ? 'offline' : failedCount > 0 && fetching === 0 ? 'unreachable' : fetching > 0 ? 'syncing' : 'online'
  return { state, isOnline, lastSyncedAt: lastSyncedAt || null, pendingCount, failed, stuck }
}
