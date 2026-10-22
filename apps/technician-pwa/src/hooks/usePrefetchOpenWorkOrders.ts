import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { workOrderService } from '@cmms/api-client'
import { fetchWorkOrder, flushOutbox } from '../db/sync'

const PAGE = 100
const MAX_PAGES = 2 // up to 200 work orders: more than a technician works at once, without draining data or battery
const CONCURRENCY = 3

/**
 * Saves every open work order of the site (not just the visible page) so each one can be opened offline.
 * Runs when the list opens and again whenever the connection comes back.
 */
export function usePrefetchOpenWorkOrders(siteId: string | null | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    let running = false

    const run = async () => {
      // Respect the device's data saver setting; the list and any opened work order still work
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
      if (running || !navigator.onLine || saveData) return
      running = true
      try {
        // Let queued changes reach the server first, so a fetch cannot save a copy that is missing them
        await flushOutbox()
        const ids = new Set<string>()
        for (let page = 1; page <= MAX_PAGES && !cancelled; page++) {
          const result = await workOrderService.getWorkOrders({ siteId, view: 'open', page, pageSize: PAGE })
          result.items.forEach(item => ids.add(item.id))
          if (result.items.length < PAGE) break
        }
        const queue = [...ids]
        // A few at a time, so a weak connection is not saturated. staleTime skips ones that are already fresh.
        const worker = async () => {
          for (let id = queue.shift(); id && !cancelled; id = queue.shift()) {
            await queryClient.prefetchQuery({ queryKey: ['work-order', id], queryFn: () => fetchWorkOrder(id!), staleTime: 2 * 60_000 }).catch(() => undefined)
          }
        }
        await Promise.all(Array.from({ length: CONCURRENCY }, worker))
      } catch { /* offline or server unreachable: try again on the next reconnect */ } finally { running = false }
    }

    void run()
    window.addEventListener('online', run)
    return () => { cancelled = true; window.removeEventListener('online', run) }
  }, [siteId, queryClient])
}
