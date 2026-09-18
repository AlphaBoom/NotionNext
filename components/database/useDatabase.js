import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { compactId, normalizeQuery } from '@/lib/notion/database/model'

const STORAGE_PREFIX = 'notion-db-v1:'
const MAX_AGE = 5 * 60_000
const snapshots = new Map()

export function mergeResult(previous, next) {
  return {
    ...next,
    blockIds: [...new Set([...(previous?.blockIds || []), ...next.blockIds])],
    recordMap: {
      block: { ...previous?.recordMap?.block, ...next.recordMap.block }
    }
  }
}
function readSnapshot(key) {
  let value = snapshots.get(key)
  try {
    value = value || JSON.parse(sessionStorage.getItem(STORAGE_PREFIX + key))
  } catch {}
  if (!value || value.time + MAX_AGE < Date.now()) return null
  return value
}
function writeSnapshot(key, result) {
  if (!result?.blockIds) return
  const value = {
    result,
    time: result.fetchedAt || Date.now(),
    scroll: window.scrollY
  }
  snapshots.delete(key)
  while (snapshots.size >= 5) snapshots.delete(snapshots.keys().next().value)
  snapshots.set(key, value)
  try {
    const keys = Object.keys(sessionStorage).filter(k =>
      k.startsWith(STORAGE_PREFIX)
    )
    keys
      .filter(k => k !== STORAGE_PREFIX + key)
      .slice(0, Math.max(0, keys.length - 4))
      .forEach(k => sessionStorage.removeItem(k))
    const serialized = JSON.stringify(value)
    if (serialized.length < 2_000_000)
      sessionStorage.setItem(STORAGE_PREFIX + key, serialized)
  } catch {
    /* Browsing works with disabled or full storage. */
  }
}

export default function useDatabase(block, collection, enabled = true) {
  const router = useRouter()
  const param = `db_${compactId(block.id)}`
  const defaultQuery = useMemo(
    () => normalizeQuery({}, collection.schema, block.view_ids),
    [collection.schema, block.view_ids]
  )
  const [query, setQuery] = useState(defaultQuery)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState({
    key: '',
    result: null,
    busy: false,
    error: null
  })
  const key = JSON.stringify([block.id, query])
  const controller = useRef(null)
  const generation = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state
  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    if (!router.isReady) return
    let next = defaultQuery
    try {
      const raw = router.query[param]
      if (typeof raw === 'string')
        next = normalizeQuery(
          JSON.parse(raw),
          collection.schema,
          block.view_ids
        )
      else if (
        typeof router.query.v === 'string' &&
        block.view_ids.some(id => compactId(id) === compactId(router.query.v))
      )
        next = normalizeQuery(
          { viewId: router.query.v },
          collection.schema,
          block.view_ids
        )
    } catch {
      /* Invalid shared URLs start at the saved default view. */
    }
    setQuery(current =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next
    )
    setReady(true)
  }, [
    router.isReady,
    router.query,
    param,
    collection.schema,
    block.view_ids,
    defaultQuery
  ])

  const load = useCallback(
    async (append = false) => {
      const current = stateRef.current
      if (
        append &&
        (current.key !== key || current.busy || !current.result?.hasMore)
      )
        return
      controller.current?.abort()
      const abort = new AbortController()
      controller.current = abort
      const run = ++generation.current
      const previous = append ? current.result : null
      stateRef.current = { key, result: previous, busy: true, error: null }
      setState(stateRef.current)
      try {
        const response = await fetch('/api/notion-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abort.signal,
          body: JSON.stringify({
            blockId: block.id,
            ...query,
            ...(append ? { cursor: previous.nextCursor } : {})
          })
        })
        const data = await response.json()
        if (!response.ok)
          throw Object.assign(new Error('Database query failed'), {
            code: data.code
          })
        if (
          run !== generation.current ||
          abort.signal.aborted ||
          key !== keyRef.current
        )
          return
        const result = { ...mergeResult(previous, data), fetchedAt: Date.now() }
        setState({ key, result, busy: false, error: null })
        writeSnapshot(key, result)
      } catch (error) {
        if (
          run !== generation.current ||
          abort.signal.aborted ||
          key !== keyRef.current
        )
          return
        setState({
          key,
          result: previous,
          busy: false,
          error: error.code || 'UPSTREAM_UNAVAILABLE'
        })
      }
    },
    [key, block.id, query]
  )

  useEffect(() => {
    if (!ready || !enabled) return
    const restored = readSnapshot(key)
    if (restored) {
      setState({ key, result: restored.result, busy: false, error: null })
      const frame = requestAnimationFrame(() => {
        if (restored.scroll)
          window.scrollTo({ top: restored.scroll, behavior: 'instant' })
      })
      return () => {
        cancelAnimationFrame(frame)
        controller.current?.abort()
      }
    }
    load()
    return () => {
      controller.current?.abort()
    }
  }, [ready, enabled, key, load])

  const remember = useCallback(() => {
    const current = stateRef.current
    if (current.key === keyRef.current)
      writeSnapshot(current.key, current.result)
  }, [])
  useEffect(() => {
    router.events.on('routeChangeStart', remember)
    window.addEventListener('pagehide', remember)
    return () => {
      router.events.off('routeChangeStart', remember)
      window.removeEventListener('pagehide', remember)
    }
  }, [router.events, remember])

  const updateQuery = useCallback(
    next => {
      const normalized = normalizeQuery(next, collection.schema, block.view_ids)
      remember()
      controller.current?.abort()
      generation.current++
      setQuery(normalized)
      router
        .replace(
          {
            pathname: router.pathname,
            query: { ...router.query, [param]: JSON.stringify(normalized) }
          },
          undefined,
          { shallow: true, scroll: false }
        )
        .catch(() => {})
    },
    [collection.schema, block.view_ids, remember, router, param]
  )

  const current =
    state.key === key ? state : { result: null, busy: true, error: null }
  return {
    ...current,
    busy: !ready || !enabled || current.busy,
    query,
    updateQuery,
    loadMore: () => load(true),
    retry: () =>
      load(
        Boolean(current.result?.hasMore && current.error !== 'CURSOR_EXPIRED')
      ),
    refresh: () => load(false),
    remember
  }
}
