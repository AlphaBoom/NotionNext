import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { buildRssFeeds } from '@/lib/utils/rss'

const CACHE_TTL_MS = 10 * 60 * 1000
let rssCache = null
let refreshPromise = null

async function refreshRss() {
  const props = await fetchGlobalAllData({ from: 'rss-api', locale: BLOG.LANG })
  const content = await buildRssFeeds(props)
  rssCache = { ...content, updatedAt: Date.now() }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }
  const format = req.query?.format || 'rss'
  if (!['rss', 'atom', 'json'].includes(format)) {
    return res.status(400).json({ message: 'Unsupported RSS format' })
  }

  let stale = false
  try {
    if (!rssCache || Date.now() - rssCache.updatedAt >= CACHE_TTL_MS) {
      if (!refreshPromise) {
        refreshPromise = refreshRss().finally(() => {
          refreshPromise = null
        })
      }
      await refreshPromise
    }
  } catch (error) {
    console.error('[RSS API] Feed refresh failed:', error.message)
    if (!rssCache) {
      res.setHeader('Retry-After', '60')
      return res.status(503).json({ message: 'RSS feed not available' })
    }
    // Keep the last complete feed without caching the failed refresh as fresh.
    stale = true
  }

  if (!stale) {
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=600'
    )
  }
  const formats = {
    rss: ['application/rss+xml; charset=utf-8', rssCache.xml],
    atom: ['application/atom+xml; charset=utf-8', rssCache.atomXml],
    json: ['application/json; charset=utf-8', rssCache.json]
  }
  const [contentType, content] = formats[format]
  res.setHeader('Content-Type', contentType)
  return res.status(200).send(content)
}
