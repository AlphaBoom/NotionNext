import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatSurvivalTime,
  loadLeaderboard,
  savedNickname,
  submitLeaderboardRun
} from '../lib/survivorsLeaderboard'

export default function SurvivorsLeaderboard({
  entry,
  finished,
  active = false
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nickname, setNickname] = useState(savedNickname)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [highlight, setHighlight] = useState('')
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
    submitting.current = false
    setStatus('idle')
    setMessage('')
    setHighlight('')
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
    if (active) {
      setOpen(true)
      refresh()
    }
  }, [active, refresh])

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
      loadId.current++ // A pre-submit GET must not overwrite the fresh standings.
      setLoading(false)
      setLoadError('')
      setRows(data.entries)
      setOpen(true)
      setHighlight(data.best.id)
      setStatus('done')
      const rank = data.entries.find(row => row.id === data.best.id)?.rank
      setMessage(
        `${data.personalBest ? '最佳成绩已更新' : '成绩已上传，保留之前的最佳纪录'}${rank ? ` · 当前第 ${rank} 名` : ' · 暂未进入前 20 名'}。`
      )
    } catch (error) {
      if (!mounted.current || current !== generation.current) return
      setStatus('error')
      setMessage(error.message)
    } finally {
      if (current === generation.current) submitting.current = false
    }
  }

  return (
    <section className='quill-leaderboard' aria-label='无限模式排行榜'>
      {finished && entry?.result && (
        <form onSubmit={submit}>
          <label htmlFor='quill-nickname'>留下这次夜行的名字</label>
          <div className='quill-submit'>
            <input
              id='quill-nickname'
              name='nickname'
              value={nickname}
              onChange={event => setNickname(event.target.value)}
              placeholder='昵称（1–16 字）'
              maxLength={32}
              required
              autoComplete='nickname'
              disabled={status === 'sending' || status === 'done'}
              aria-describedby='quill-upload-note'
            />
            <button
              type='submit'
              disabled={status === 'sending' || status === 'done'}
            >
              {status === 'sending'
                ? '上传中…'
                : status === 'done'
                  ? '已上传'
                  : '上传成绩'}
            </button>
          </div>
          <p id='quill-upload-note'>
            免登录，昵称与成绩公开。每个浏览器保留最佳纪录。
          </p>
          <p role='status' aria-live='polite'>
            {message}
          </p>
        </form>
      )}
      {!active && (
        <button
          type='button'
          className='quill-toggle'
          aria-expanded={open}
          aria-controls='quill-rankings'
          onClick={() => {
            setOpen(!open)
            if (!open) refresh()
          }}
        >
          <span>
            无限模式排行榜 <small>TOP 20</small>
          </span>
          <span aria-hidden='true'>{open ? '−' : '+'}</span>
        </button>
      )}
      {open && (
        <div id='quill-rankings'>
          <p>先比生存时间，再比击退数、首领数。同分先到者在前。</p>
          {loading && <p role='status'>正在读取排行榜…</p>}
          {loadError && <p role='alert'>{loadError}</p>}
          {!loading && !loadError && rows?.length === 0 && (
            <p>还没有成绩。来留下第一段夜行吧。</p>
          )}
          {Boolean(rows?.length) && (
            <div className='quill-table-wrap'>
              <table>
                <caption className='sr-only'>无限模式前 20 名</caption>
                <thead>
                  <tr>
                    <th scope='col'>名次</th>
                    <th scope='col'>昵称</th>
                    <th scope='col'>生存</th>
                    <th scope='col'>击退</th>
                    <th scope='col'>首领</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      className={row.id === highlight ? 'quill-self' : ''}
                    >
                      <td>{row.rank}</td>
                      <td className='quill-name'>{row.nickname}</td>
                      <td>{formatSurvivalTime(row.durationMs)}</td>
                      <td>{row.kills}</td>
                      <td>{row.bosses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button type='button' disabled={loading} onClick={refresh}>
            刷新排行
          </button>
        </div>
      )}
      <style jsx>{`
        .quill-leaderboard {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border, #cad0c8);
          font-size: 14px;
          color: var(--ink);
        }
        form {
          padding-bottom: 16px;
        }
        label {
          display: block;
          font-weight: 500;
          margin-bottom: 10px;
        }
        .quill-submit {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        input {
          flex: 1;
          min-width: 120px;
          max-width: 280px;
          background: transparent;
          border: 1px solid var(--muted, #71806f);
          border-radius: 5px;
          padding: 9px 12px;
          color: inherit;
          font-size: 16px;
        }
        button {
          padding: 9px 14px;
          border: 1px solid var(--muted, #71806f);
          border-radius: 5px;
          cursor: pointer;
          color: inherit;
          background: transparent;
        }
        button:disabled {
          cursor: default;
          opacity: 0.6;
        }
        button:focus-visible,
        input:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 3px;
        }
        p {
          margin: 10px 0;
          color: var(--muted);
          line-height: 1.6;
        }
        p:empty {
          display: none;
        }
        .quill-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          border: 0;
          padding: 8px 0;
          text-align: left;
          font-size: 16px;
        }
        small {
          margin-left: 10px;
          font: 12px monospace;
          color: var(--muted);
        }
        .quill-table-wrap {
          overflow-x: auto;
          margin: 12px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-variant-numeric: tabular-nums;
          text-align: left;
        }
        th,
        td {
          padding: 10px 8px;
          border-bottom: 1px solid var(--border, #cad0c8);
          white-space: nowrap;
        }
        th {
          font-weight: 500;
          color: var(--muted);
        }
        .quill-name {
          max-width: 220px;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .quill-self {
          background: rgba(135, 167, 119, 0.16);
          font-weight: 600;
        }
      `}</style>
    </section>
  )
}
