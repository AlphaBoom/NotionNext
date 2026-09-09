/** @jest-environment jsdom */

import { installAttachmentImageFallback } from '@/lib/db/notion/attachmentImageFallback'

const host = 'https://cdn.example.com'
const source = 'attachment:file-id:blog-new-game-theme.jpg'
const proxy = `${host}/image/${encodeURIComponent(source)}?table=block&id=image-id`

function fixture(url = proxy, wrapper = 'notion-asset-wrapper-image') {
  const root = document.createElement('article')
  root.innerHTML = `<figure class="${wrapper}"><img></figure>`
  const image = root.querySelector('img')
  image.src = url
  return { root, image }
}

it('recovers a failed image without a reload and only retries once', () => {
  const { root, image } = fixture()
  installAttachmentImageFallback(root, host)
  image.dispatchEvent(new Event('error'))
  const fallback = new URL(image.src)
  expect(fallback.origin).toBe('https://www.notion.so')
  expect(decodeURIComponent(fallback.pathname)).toBe(`/signed/${source}`)
  expect(fallback.searchParams.get('id')).toBe('image-id')
  expect(fallback.searchParams.get('table')).toBe('block')
  image.dispatchEvent(new Event('error'))
  expect(image.src).toBe(fallback.href)
  // A later render restoring the failed proxy must not start a retry loop.
  image.src = proxy
  image.dispatchEvent(new Event('error'))
  expect(image.src).toBe(proxy)
})

it('recovers images that failed before hydration attached the listener', () => {
  const { root, image } = fixture()
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalWidth', { value: 0 })
  installAttachmentImageFallback(root, host)
  expect(new URL(image.src).pathname.startsWith('/signed/')).toBe(true)
})

it('leaves loaded images alone and removes the listener on cleanup', () => {
  const { root, image } = fixture()
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalWidth', { value: 800 })
  const cleanup = installAttachmentImageFallback(root, host)
  expect(image.src).toBe(proxy)
  cleanup()
  image.dispatchEvent(new Event('error'))
  expect(image.src).toBe(proxy)
})

it.each([
  ['https://example.com/image.png', 'notion-asset-wrapper-image'],
  [`${host}/image/https%3A%2F%2Fexample.com%2Fphoto.png?id=image-id`, 'notion-asset-wrapper-image'],
  [proxy, 'notion-bookmark'],
  [`${host}/image/attachment%3Aid%3Aphoto.png`, 'notion-asset-wrapper-image']
])('does not retry unrelated or incomplete URLs: %s', (url, wrapper) => {
  const { root, image } = fixture(url, wrapper)
  installAttachmentImageFallback(root, host)
  image.dispatchEvent(new Event('error'))
  expect(image.src).toBe(url)
})
