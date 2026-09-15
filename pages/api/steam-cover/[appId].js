const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const RETRY_TTL_MS = 60 * 1000
const MAX_CACHE_ENTRIES = 256
const coverCache = new Map()

export const config = { maxDuration: 20 }

async function querySteamCover(appId) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&filters=basic`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store'
      }
    )
    if (!response.ok) return { status: 502 }

    const app = (await response.json())?.[appId]
    if (!app?.success) return { status: 404 }
    const headerImage = app.data?.header_image
    if (typeof headerImage !== 'string') return { status: 502 }
    const url = new URL(headerImage)
    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.steamstatic.com') ||
      url.username ||
      url.password ||
      url.port
    )
      return { status: 502 }

    // Keep Steam's full URL, including version directories and query parameters.
    return { status: 200, headerImage }
  } catch {
    return { status: 502 }
  } finally {
    clearTimeout(timeout)
  }
}

function getSteamCover(appId) {
  const cached = coverCache.get(appId)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  // Cache the in-flight promise too, so simultaneous previews share one query.
  const entry = { expiresAt: Infinity, promise: null }
  entry.promise = querySteamCover(appId).then(result => {
    entry.expiresAt =
      Date.now() + (result.status === 200 ? CACHE_TTL_MS : RETRY_TTL_MS)
    return result
  })
  coverCache.delete(appId)
  coverCache.set(appId, entry)
  if (coverCache.size > MAX_CACHE_ENTRIES)
    coverCache.delete(coverCache.keys().next().value)
  return entry.promise
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }
  const { appId } = req.query
  if (typeof appId !== 'string' || !/^[1-9]\d{0,9}$/.test(appId))
    return res.status(400).end()

  const result = await getSteamCover(appId)
  if (result.status !== 200) return res.status(result.status).end()

  res.setHeader(
    'Cache-Control',
    'public, max-age=300, s-maxage=86400, stale-while-revalidate=3600'
  )
  return res.redirect(307, result.headerImage)
}
