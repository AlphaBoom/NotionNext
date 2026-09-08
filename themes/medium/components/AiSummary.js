import { useEffect, useId, useState } from 'react'

const COLLAPSED_KEY = 'notionnext:ai-summary-collapsed'

/** The author supplies this text in Notion; reading never triggers generation. */
export default function AiSummary({ summary }) {
  const text = typeof summary === 'string' ? summary.trim() : ''
  return text ? <SummaryPanel text={text} /> : null
}

function SummaryPanel({ text }) {
  const [expanded, setExpanded] = useState(true)
  const contentId = useId()

  useEffect(() => {
    try {
      setExpanded(window.localStorage.getItem(COLLAPSED_KEY) !== 'true')
    } catch {
      // The summary remains usable when browser storage is unavailable.
    }
  }, [])

  const toggle = () => {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    try {
      window.localStorage.setItem(COLLAPSED_KEY, String(!nextExpanded))
    } catch {
      // Folding still works for this visit without persistence.
    }
  }

  return (
    <section className='medium-ai-summary' aria-label='AI 摘要'>
      <button
        type='button'
        className='medium-ai-summary-toggle'
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={toggle}>
        <span className='medium-ai-summary-title'>AI 摘要</span>
        <span className='medium-ai-summary-action'>
          {expanded ? '收起' : '展开'}
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
            <path d='m6 9 6 6 6-6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </span>
      </button>
      <div id={contentId} className='medium-ai-summary-content' hidden={!expanded}>
        <p>{text}</p>
      </div>
    </section>
  )
}
