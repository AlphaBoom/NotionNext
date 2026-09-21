import { useCallback, useEffect, useRef, useState } from 'react'
import {
  estimateLeaderboardRank,
  loadLeaderboard,
  savedNickname,
  submitLeaderboardRun
} from './survivorsLeaderboard'

export function useSurvivorsLeaderboard({ entry, finished, active }) {
  const [rows, setRows] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nickname, setNickname] = useState(savedNickname)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [best, setBest] = useState(null)
  const [personalBest, setPersonalBest] = useState(false)
  const mounted = useRef(true)
  const submitting = useRef(false)
  const generation = useRef(0)
  const loadId = useRef(0)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    generation.current++
    loadId.current++
    submitting.current = false
    setStatus('idle')
    setMessage('')
    setBest(null)
    setPersonalBest(false)
    setLoading(false)
    setLoadError('')
  }, [entry])

  const refresh = useCallback(async () => {
    const id = ++loadId.current
    setLoading(true)
    setLoadError('')
    try {
      const data = await loadLeaderboard()
      if (mounted.current && id === loadId.current) setRows(data.entries)
    } catch (error) {
      if (mounted.current && id === loadId.current) setLoadError(error.message)
    } finally {
      if (mounted.current && id === loadId.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    if (active) refresh()
  }, [active, refresh])
  useEffect(() => {
    if (finished && entry?.result) refresh()
  }, [finished, entry?.result, refresh])

  async function submit(event) {
    event.preventDefault()
    if (submitting.current || status === 'done' || !entry?.result) return
    submitting.current = true
    const current = generation.current
    setStatus('sending')
    setMessage('')
    try {
      const data = await submitLeaderboardRun(entry, nickname.trim())
      if (!mounted.current || current !== generation.current) return
      loadId.current++
      setLoading(false)
      setLoadError('')
      setRows(data.entries)
      setBest(data.best)
      setPersonalBest(data.personalBest)
      setStatus('done')
      setMessage(
        data.personalBest
          ? '这次夜行已记入榜单，最佳成绩已更新。'
          : '成绩已上传，榜单保留你之前更好的纪录。'
      )
    } catch (error) {
      if (!mounted.current || current !== generation.current) return
      setStatus('error')
      setMessage(error.message)
    } finally {
      if (current === generation.current) submitting.current = false
    }
  }

  const rank =
    status === 'done'
      ? (rows?.find(row => row.id === best?.id)?.rank ?? null)
      : estimateLeaderboardRank(entry?.result, rows)
  return {
    rows,
    loadError,
    loading,
    nickname,
    setNickname,
    status,
    message,
    best,
    personalBest,
    rank,
    refresh,
    submit
  }
}
