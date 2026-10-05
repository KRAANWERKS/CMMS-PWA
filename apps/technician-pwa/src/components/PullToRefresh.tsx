import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Center, Loader } from '@mantine/core'
import { IconArrowDown } from '@tabler/icons-react'

const THRESHOLD = 70

/** Touch pull-down at the top of the page triggers onRefresh. Does nothing with a mouse. */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<unknown>; children: ReactNode }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pullRef = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    const onStart = (event: TouchEvent) => { startY.current = window.scrollY <= 0 && !busy.current ? event.touches[0].clientY : null }
    const onMove = (event: TouchEvent) => {
      if (startY.current === null) return
      const dy = event.touches[0].clientY - startY.current
      pullRef.current = dy > 0 && window.scrollY <= 0 ? Math.min(dy * 0.5, THRESHOLD + 20) : 0
      setPull(pullRef.current)
    }
    const onEnd = async () => {
      const triggered = pullRef.current >= THRESHOLD
      startY.current = null
      pullRef.current = 0
      setPull(0)
      if (!triggered) return
      busy.current = true
      setRefreshing(true)
      try { await onRefresh() } finally { busy.current = false; setRefreshing(false) }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [onRefresh])

  const height = refreshing ? 44 : pull
  return (
    <>
      <Center h={height} style={{ overflow: 'hidden', transition: pull ? undefined : 'height 150ms' }} aria-hidden>
        {refreshing ? <Loader size="sm" /> : height > 8 && <IconArrowDown size="1.375rem" style={{ opacity: Math.min(1, pull / THRESHOLD), transform: `rotate(${pull >= THRESHOLD ? 180 : 0}deg)`, transition: 'transform 150ms' }} />}
      </Center>
      {children}
    </>
  )
}
