import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import worker from './worker.mjs'

test('serves immutable images and returns an empty 304 on revalidation', async () => {
  const originalFetch = globalThis.fetch
  const originalCaches = globalThis.caches
  let stored

  globalThis.fetch = async () =>
    new Response('image-bytes', {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': '11',
        'Last-Modified': 'Thu, 06 Aug 2026 11:27:52 GMT'
      }
    })
  globalThis.caches = {
    default: {
      match: async () => stored?.clone(),
      put: async (_key, response) => {
        stored = response.clone()
      }
    }
  }

  try {
    const url = 'https://cdn.example.com/image/example.png?id=page-id'
    const first = await worker.fetch(new Request(url))
    const etag = first.headers.get('etag')

    assert.equal(first.status, 200)
    assert.equal(
      first.headers.get('cache-control'),
      'public, max-age=31536000, s-maxage=31536000, immutable'
    )
    assert.match(etag, /^W\/"[a-f0-9]+-11"$/)

    const byDate = await worker.fetch(
      new Request(url, {
        headers: {
          'If-Modified-Since': 'Thu, 06 Aug 2026 11:27:52 GMT'
        }
      })
    )
    const byEtag = await worker.fetch(
      new Request(url, { headers: { 'If-None-Match': etag } })
    )

    assert.equal(byDate.status, 304)
    assert.equal(byEtag.status, 304)
    assert.equal((await byDate.arrayBuffer()).byteLength, 0)
    assert.equal((await byEtag.arrayBuffer()).byteLength, 0)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.caches = originalCaches
  }
})

test('keeps the VitePress copy-paste example in sync with worker.mjs', async () => {
  const workerSource = await readFile(
    new URL('./worker.mjs', import.meta.url),
    'utf8'
  )
  const tutorial = await readFile(
    new URL(
      '../../docs/user-guide/deploy/notion-image-proxy.md',
      import.meta.url
    ),
    'utf8'
  )
  const example = tutorial.match(
    /```js\r?\n(const NOTION_ORIGIN = [\s\S]*?)\r?\n```/
  )

  assert.ok(example, 'VitePress tutorial must include the Worker source')
  assert.equal(normalize(example[1]), normalize(workerSource))
})

test('errors and non-images are not cached or converted to 304; a retry can recover', async () => {
  const originalFetch = globalThis.fetch
  const originalCaches = globalThis.caches
  let stored
  let upstream
  let writes = 0
  const options = []
  globalThis.fetch = async (_url, init) => {
    options.push(init)
    return upstream.clone()
  }
  globalThis.caches = {
    default: {
      match: async () => stored?.clone(),
      put: async (_key, response) => { writes++; stored = response.clone() }
    }
  }
  try {
    const url = 'https://cdn.example.com/image/recoverable.png'
    for (const status of [404, 419, 500, 200]) {
      upstream = new Response('not an image', {
        status,
        headers: {
          'Content-Type': 'text/html',
          ETag: '"error-page"',
          'Cache-Control': 'public, max-age=31536000',
          'CDN-Cache-Control': 'public, max-age=31536000',
          'Cloudflare-CDN-Cache-Control': 'public, max-age=31536000'
        }
      })
      // Also ignore entries left by an older deployment.
      stored = upstream.clone()
      const response = await worker.fetch(new Request(url, {
        headers: { 'If-None-Match': '"error-page"' }
      }))
      assert.equal(response.status, status)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.equal(response.headers.get('cdn-cache-control'), null)
      assert.equal(response.headers.get('cloudflare-cdn-cache-control'), null)
      assert.equal(await response.text(), 'not an image')
      assert.equal(writes, 0)
    }
    upstream = new Response('recovered', {
      headers: { 'Content-Type': 'image/png' }
    })
    const recovered = await worker.fetch(new Request(url))
    assert.equal(await recovered.text(), 'recovered')
    assert.equal(stored.headers.get('content-type'), 'image/png')
    assert.equal(writes, 1)
    assert.ok(options.every(init => init.cache === 'no-store'))
    const fetchCount = options.length
    const cached = await worker.fetch(new Request(url, { method: 'HEAD' }))
    assert.equal(cached.headers.get('x-notion-image-proxy-cache'), 'HIT')
    assert.equal(options.length, fetchCount)
    assert.equal((await cached.arrayBuffer()).byteLength, 0)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.caches = originalCaches
  }
})

function normalize(value) {
  return value.replace(/\r\n/g, '\n').trim()
}
