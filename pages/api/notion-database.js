import { DatabaseError, queryDatabase } from '@/lib/notion/database/server'

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
  }
  try {
    const result = await queryDatabase(req.body)
    return res.status(200).json(result)
  } catch (error) {
    const known = error instanceof DatabaseError
    const status = known ? error.status : 502
    if (status === 429) res.setHeader('Retry-After', '5')
    console.warn(
      '[Database query]',
      known ? error.code : 'UPSTREAM_UNAVAILABLE'
    )
    return res.status(status === 401 || status === 403 ? 503 : status).json({
      code: known ? error.code : 'UPSTREAM_UNAVAILABLE'
    })
  }
}
