const WRITING_MODES = {
  'ai-polished': {
    label: 'AI 润色',
    description: '本文由作者撰写，AI 辅助润色。'
  },
  'ai-generated': {
    label: 'AI 生成',
    description: '本文由 AI 生成。'
  }
}

/** Notion select values arrive as arrays; cached posts use the normalized key. */
export function normalizeWritingMode(value) {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return ''
  switch (raw.trim()) {
    case 'AI 润色':
    case 'ai-polished':
      return 'ai-polished'
    case 'AI 生成':
    case 'ai-generated':
      return 'ai-generated'
    default:
      return ''
  }
}

export function getWritingModeInfo(value) {
  const mode = normalizeWritingMode(value)
  return mode ? { mode, ...WRITING_MODES[mode] } : null
}

export function getWritingModeSummary(post) {
  const info = getWritingModeInfo(post?.writingMode)
  const summary = post?.summary || ''
  return info ? `[${info.label}] ${info.description}${summary ? ` ${summary}` : ''}` : summary
}

export function prependWritingModeNotice(html, writingMode) {
  const info = getWritingModeInfo(writingMode)
  return info ? `<p>${info.description}</p>${html || ''}` : html
}
