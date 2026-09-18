import { useCallback, useEffect, useRef, useState } from 'react'
import { compactId } from '@/lib/notion/database/model'

// One fixed GET per preview. Search and expansion never reach this hook.
export default function useDatabase(blockId, enabled) {
  const id = compactId(blockId)
  const controller = useRef(null)
  const currentId = useRef(id)
  currentId.current = id
  const [state, setState] = useState({
    id: '',
    result: null,
    busy: false,
    error: null
  })
  const load = useCallback(async () => {
    if (!enabled) return
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setState({ id, result: null, busy: true, error: null })
    try {
      const response = await fetch(`/api/notion-database?blockId=${id}`, {
        method: 'GET',
        credentials: 'omit',
        signal: abort.signal
      })
      const result = await response.json()
      if (!response.ok)
        throw Object.assign(new Error('Preview unavailable'), {
          code: result.code
        })
      if (abort.signal.aborted || currentId.current !== id) return
      setState({ id, result, busy: false, error: null })
    } catch (error) {
      if (abort.signal.aborted || currentId.current !== id) return
      setState({
        id,
        result: null,
        busy: false,
        error: error.code || 'UPSTREAM_UNAVAILABLE'
      })
    }
  }, [id, enabled])
  useEffect(() => {
    if (enabled) void load()
    return () => controller.current?.abort()
  }, [enabled, load])
  const current =
    state.id === id ? state : { result: null, busy: enabled, error: null }
  return { ...current, retry: load }
}
