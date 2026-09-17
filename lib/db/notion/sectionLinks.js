const NOTION_ID = /^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i
const PAGE_TYPES = new Set(['page', 'collection_view_page'])

export const normalizeNotionId = value =>
  typeof value === 'string' && NOTION_ID.test(value)
    ? value.replace(/-/g, '').toLowerCase()
    : null

export const normalizeSectionHash = hash => {
  const value = hash?.replace(/^#/, '') || ''
  return value ? `#${normalizeNotionId(value) || value}` : ''
}

// Only interpret Notion URLs and local routes as Notion IDs. An unrelated
// website may legitimately have the same UUID in its path.
export function getNotionLinkId(
  href,
  siteOrigin = 'https://notionnext.invalid'
) {
  try {
    const url = new URL(href, siteOrigin)
    const local = url.origin === new URL(siteOrigin).origin
    const notion =
      /(^|\.)notion\.(so|site)$/.test(url.hostname) ||
      ['notion.com', 'www.notion.com', 'app.notion.com'].includes(url.hostname)
    if (!['https:', 'http:'].includes(url.protocol) || (!local && !notion)) {
      return null
    }
    const lastPart = url.pathname.replace(/\/$/, '').split('/').pop()
    const match = lastPart?.match(
      /(?:^|-)([a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i
    )
    return normalizeNotionId(match?.[1])
  } catch {
    return null
  }
}

function getBlock(blockMap, id) {
  const uuid = id.replace(
    /^(........)(....)(....)(....)(............)$/,
    '$1-$2-$3-$4-$5'
  )
  let block = blockMap?.block?.[uuid] || blockMap?.block?.[id]
  // Notion record maps can wrap a record in one or two `value` envelopes.
  while (block?.value) block = block.value
  return block
}

export function isArticleBlock(id, pageId, blockMap) {
  const rootId = normalizeNotionId(pageId)
  let blockId = normalizeNotionId(id)
  const visited = new Set()
  while (rootId && blockId && !visited.has(blockId)) {
    if (blockId === rootId) return visited.size > 0
    visited.add(blockId)
    const block = getBlock(blockMap, blockId)
    // Child pages and referenced pages are separate documents, even when their
    // blocks happen to be included in this record map.
    if (!block || PAGE_TYPES.has(block.type)) return false
    blockId = normalizeNotionId(block.parent_id)
  }
  return false
}

export function getArticleSectionHref(
  href,
  { pageId, blockMap, pageHref, siteOrigin } = {}
) {
  if (typeof href !== 'string') return null
  if (href.startsWith('#')) return normalizeSectionHash(href) || null

  const id = getNotionLinkId(href, siteOrigin)
  const hash = normalizeSectionHash(
    href.includes('#') ? href.slice(href.indexOf('#')) : ''
  )
  if (id && hash && id === normalizeNotionId(pageId)) return hash
  if (id && !hash && isArticleBlock(id, pageId, blockMap)) return `#${id}`

  if (hash && pageHref) {
    try {
      const base = siteOrigin || 'https://notionnext.invalid'
      const url = new URL(href, base)
      const page = new URL(pageHref, base)
      if (
        url.origin === page.origin &&
        url.pathname.replace(/\/$/, '') === page.pathname.replace(/\/$/, '')
      ) {
        return hash
      }
    } catch {}
  }
  return null
}

export function mapArticlePageUrl(id, article) {
  const normalized = normalizeNotionId(id)
  if (!normalized) return id
  return isArticleBlock(normalized, article?.pageId, article?.blockMap)
    ? `#${normalized}`
    : `/${normalized}`
}
