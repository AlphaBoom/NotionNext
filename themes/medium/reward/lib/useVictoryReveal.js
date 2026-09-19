import { useEffect, useRef, useState } from 'react'

// The unlock is saved before the countdown; revealing the theme is cancellable.
export function useVictoryReveal(phase, claim, onRevealed) {
  const callbacks = useRef({ claim, onRevealed })
  callbacks.current = { claim, onRevealed }
  const task = useRef(null)
  const retry = useRef(null)
  const [state, setState] = useState({ stage: 'idle', seconds: 3 })
  useEffect(() => {
    if (phase !== 'won') {
      task.current = null
      setState({ stage: 'idle', seconds: 3 })
      return
    }
    // Keep the claim through Strict Mode's effect replay.
    if (!task.current) task.current = callbacks.current.claim?.('won')
    if (!task.current) {
      setState({ stage: 'saved', seconds: 0 })
      return
    }
    let alive = true
    let revealing = false
    let remaining = 3000
    let last = performance.now()
    let wasVisible = !document.hidden
    const reveal = async () => {
      if (!alive || revealing) return
      revealing = true
      setState({ stage: 'loading', seconds: 0 })
      try {
        const opened = await task.current(() => alive)
        if (!alive) return
        setState({ stage: 'saved', seconds: 0 })
        if (opened) callbacks.current.onRevealed?.()
      } catch {
        if (alive) setState({ stage: 'error', seconds: 0 })
      } finally {
        revealing = false
      }
    }
    retry.current = reveal
    setState({ stage: 'countdown', seconds: 3 })
    const timer = setInterval(() => {
      const now = performance.now()
      const visible = !document.hidden
      if (visible && wasVisible) remaining -= now - last
      last = now
      wasVisible = visible
      if (remaining <= 0) {
        clearInterval(timer)
        void reveal()
      } else
        setState({ stage: 'countdown', seconds: Math.ceil(remaining / 1000) })
    }, 100)
    return () => {
      alive = false
      clearInterval(timer)
      retry.current = null
    }
  }, [phase])
  return { ...state, retry: () => retry.current?.() }
}
