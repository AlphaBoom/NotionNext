import test from 'node:test'
import assert from 'node:assert/strict'
import { bookmarkImageSource, installBookmarkImageFallback } from '../lib/db/notion/bookmarkImages.mjs'
const host = 'https://www.notion.so'
const proxy = source => `${host}/image/${encodeURIComponent(source)}?width=800&cache=v2`

test('recovers original URL including signed query parameters', () => {
  const source = 'https://cdn.example.com/image.png?token=a%2Fb&size=120'
  assert.equal(bookmarkImageSource(proxy(source), host), source)
  assert.equal(bookmarkImageSource(proxy('http://example.com/icon.png'), host), 'https://example.com/icon.png')
})

test('does not reinterpret attachments, unrelated proxies or unsafe URLs', () => {
  for (const source of ['attachment:id:file.png', 'data:image/png;base64,abc', 'javascript:alert(1)']) {
    assert.equal(bookmarkImageSource(proxy(source), host), null)
  }
  assert.equal(bookmarkImageSource('https://other.example/image/https%3A%2F%2Fa.test', host), null)
})

test('retries cached failures once, then removes only the failed slot; cleans up listener', () => {
  const slot = { style: {} }
  const image = { tagName: 'IMG', src: proxy('https://example.com/deleted.png'), complete: true, naturalWidth: 0,
    closest: selector => selector === '.notion-bookmark' ? {} : slot }
  let listener
  const root = { addEventListener: (name, fn) => { listener = fn },
    removeEventListener: (name, fn) => { assert.equal(listener, fn); listener = null },
    querySelectorAll: () => [image] }
  const cleanup = installBookmarkImageFallback(root, host)
  assert.equal(image.src, 'https://example.com/deleted.png')
  assert.equal(image.referrerPolicy, 'no-referrer')
  assert.equal(slot.style.display, undefined)
  listener({ target: image })
  assert.equal(slot.style.display, 'none')
  cleanup()
  assert.equal(listener, null)
})

test('ignores regular article images and images still loading', () => {
  const image = { tagName: 'IMG', src: 'https://example.com/photo.png', complete: false,
    closest: () => null }
  let listener
  const root = { addEventListener: (name, fn) => { listener = fn }, removeEventListener: () => {}, querySelectorAll: () => [image] }
  installBookmarkImageFallback(root, host)
  listener({ target: image })
  assert.equal(image.src, 'https://example.com/photo.png')
})
