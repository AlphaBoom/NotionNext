import {
  DatabaseError,
  getDatabasePreview,
  previewBlockId
} from '@/lib/db/notion/database/server'
import { DATABASE_CACHE_SECONDS } from '@/lib/db/notion/database/model'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
  }
  try {
    previewBlockId(req.query)
    const result = await getDatabasePreview(req.query)
    // Fixed public data: a CDN hit serves the preview without invoking this function.
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.setHeader(
      'CDN-Cache-Control',
      `public, s-maxage=${DATABASE_CACHE_SECONDS}, stale-while-revalidate=60`
    )
    return res.status(200).json(result)
  } catch (error) {
    const known = error instanceof DatabaseError
    const status = known ? error.status : 502
    if (status === 429) res.setHeader('Retry-After', '5')
    console.warn(
      '[Database preview]',
      known ? error.code : 'UPSTREAM_UNAVAILABLE'
    )
    return res
      .status(status)
      .json({ code: known ? error.code : 'UPSTREAM_UNAVAILABLE' })
  }
}
