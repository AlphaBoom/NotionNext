const WRITING_MODES = {
  'ai-polished': {
    label: 'AI 润色',
    description: '本文由我撰写初稿，使用 AI 辅助润色措辞和语句，保留原有观点和主要内容。'
  },
  'ai-generated': {
    label: 'AI 生成',
    description: '本文由我提供大纲和写作思路，使用 AI 辅助生成正文。'
  }
}

/**
 * Notion select values arrive as arrays; cached posts use the normalized key.
 * @param {unknown} value
 */
export function normalizeWritingMode(value) {
  /** @type {unknown} */
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

/** @param {unknown} value */
export function getWritingModeInfo(value) {
  const mode = normalizeWritingMode(value)
  return mode ? { mode, ...WRITING_MODES[mode] } : null
}

/** @param {{ writingMode?: unknown, summary?: string } | null | undefined} post */
export function getWritingModeSummary(post) {
  const info = getWritingModeInfo(post?.writingMode)
  const summary = post?.summary || ''
  return info ? `[${info.label}] ${info.description}${summary ? ` ${summary}` : ''}` : summary
}

/**
 * @param {string | undefined} html
 * @param {unknown} writingMode
 */
export function prependWritingModeNotice(html, writingMode) {
  const info = getWritingModeInfo(writingMode)
  return info ? `<p>${info.description}</p>${html || ''}` : html
}
