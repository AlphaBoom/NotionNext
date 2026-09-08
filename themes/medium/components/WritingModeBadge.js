import { getWritingModeInfo } from '@/lib/utils/writingMode.mjs'

export default function WritingModeBadge({ writingMode }) {
  const info = getWritingModeInfo(writingMode)
  if (!info) return null

  return (
    <span className={`medium-writing-badge ${info.mode}`} title={info.description}>
      {info.label}
    </span>
  )
}

export function WritingModeNotice({ writingMode }) {
  const info = getWritingModeInfo(writingMode)
  if (!info) return null

  return (
    <aside className='medium-writing-notice' aria-label='创作方式'>
      <WritingModeBadge writingMode={writingMode} />
      <p>{info.description}</p>
    </aside>
  )
}
