const NOTION_ORIGIN = 'https://www.notion.so'
const IMMUTABLE_TTL_SECONDS = 60 * 60 * 24 * 365
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (!isAllowedPath(url.pathname)) {
      return new Response('Not found', { status: 404 })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 })
    }

    const cache = caches.default
    const cacheKey = new Request(request.url, { method: 'GET' })
    const cached = await cache.match(cacheKey)
    if (cached && isCacheableImage(cached)) {
      const hitHeaders = new Headers(cached.headers)
      setCacheHeaders(hitHeaders)
      setValidatorHeaders(hitHeaders)
      hitHeaders.set('X-Notion-Image-Proxy-Cache', 'HIT')
      if (isNotModified(request, hitHeaders)) {
        return notModifiedResponse(hitHeaders)
      }
      return new Response(request.method === 'HEAD' ? null : cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: hitHeaders
      })
    }

    const upstreamUrl = new URL(url.pathname + url.search, NOTION_ORIGIN)
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      redirect: 'follow',
      // Only the validated image below enters caches.default. Bypass the
      // fetch cache, including errors cached by older Worker deployments.
      cache: 'no-store',
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    })

    const headers = new Headers(response.headers)
    const cacheable = isCacheableImage(response)
    setCacheHeaders(headers, cacheable)
    if (cacheable) setValidatorHeaders(headers)
    headers.set('X-Notion-Image-Proxy', '1')
    headers.set('X-Notion-Image-Proxy-Cache', 'MISS')
    headers.delete('set-cookie')
    headers.delete('content-security-policy')
    headers.delete('content-security-policy-report-only')
    headers.delete('vary')

    const proxied = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
    if (cacheable) {
      // A cache write failure must not turn a healthy image into an error.
      await cache.put(cacheKey, proxied.clone()).catch(() => {})
    }

    if (cacheable && isNotModified(request, headers)) {
      return notModifiedResponse(headers)
    }

    return request.method === 'HEAD' ? new Response(null, proxied) : proxied
  }
}

function isAllowedPath(pathname) {
  return pathname.startsWith('/image/') || pathname.startsWith('/images/')
}

function isCacheableImage(response) {
  return (
    response.status === 200 &&
    /^image\//i.test(response.headers.get('content-type') || '')
  )
}

function setCacheHeaders(headers, cacheable = true) {
  headers.delete('CDN-Cache-Control')
  headers.delete('Cloudflare-CDN-Cache-Control')
  headers.delete('Expires')
  headers.set(
    'Cache-Control',
    cacheable
      ? `public, max-age=${IMMUTABLE_TTL_SECONDS}, s-maxage=${IMMUTABLE_TTL_SECONDS}, immutable`
      : 'no-store'
  )
}

function setValidatorHeaders(headers) {
  if (headers.has('etag')) return

  const lastModified = Date.parse(headers.get('last-modified') || '')
  const contentLength = headers.get('content-length') || 'unknown'
  if (!Number.isNaN(lastModified)) {
    headers.set('ETag', `W/"${lastModified.toString(16)}-${contentLength}"`)
  }
}

function isNotModified(request, headers) {
  const etag = headers.get('etag')
  const ifNoneMatch = request.headers.get('if-none-match')
  if (etag && ifNoneMatch) {
    return ifNoneMatch
      .split(',')
      .map(value => value.trim())
      .some(value => value === '*' || weakEtag(value) === weakEtag(etag))
  }

  const lastModified = Date.parse(headers.get('last-modified') || '')
  const ifModifiedSince = Date.parse(
    request.headers.get('if-modified-since') || ''
  )
  return (
    !Number.isNaN(lastModified) &&
    !Number.isNaN(ifModifiedSince) &&
    lastModified <= ifModifiedSince
  )
}

function weakEtag(value) {
  return value.replace(/^W\//, '')
}

function notModifiedResponse(headers) {
  const notModifiedHeaders = new Headers(headers)
  notModifiedHeaders.delete('content-length')
  notModifiedHeaders.delete('content-encoding')
  notModifiedHeaders.delete('content-range')
  return new Response(null, { status: 304, headers: notModifiedHeaders })
}
