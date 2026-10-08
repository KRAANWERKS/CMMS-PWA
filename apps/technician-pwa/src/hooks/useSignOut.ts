import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authService, getApiError } from '@cmms/api-client'
import { db } from '../db/schema'
import { flushOutbox } from '../db/sync'

/** Signs out, but never discards changes that have not reached the server. */
export function useSignOut() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string>()

  const signOut = async () => {
    setError(undefined)
    try {
      await flushOutbox()
      const pending = await db.outbox.where('status').equals('PENDING').count()
      if (pending > 0) {
        setError(`${pending} change${pending === 1 ? ' has' : 's have'} not synced yet. Reconnect and try again so nothing is lost.`)
        return
      }
      await authService.logout()
      await db.outbox.clear()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch (cause) {
      setError(getApiError(cause, 'Sign out failed'))
    }
  }

  return { signOut, error }
}
