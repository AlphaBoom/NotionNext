/** Recover external bookmark images without changing Notion attachment URLs. */
export function bookmarkImageSource(src, notionHost) {
  try {
    const proxy = new URL(src)
    if (proxy.origin !== new URL(notionHost).origin || !proxy.pathname.startsWith('/image/')) return null
    const original = new URL(decodeURIComponent(proxy.pathname.slice(7)))
    if (!['http:', 'https:'].includes(original.protocol)) return null
    // Avoid mixed content when an old bookmark contains an HTTP image.
    original.protocol = 'https:'
    return original.href
  } catch {
    return null
  }
}

export function installBookmarkImageFallback(root, notionHost) {
  const retried = new WeakSet()
  const recover = image => {
    if (image?.tagName !== 'IMG' || !image.closest('.notion-bookmark')) return
    const fallback = bookmarkImageSource(image.src, notionHost)
    if (fallback && !retried.has(image)) {
      retried.add(image)
      image.referrerPolicy = 'no-referrer'
      image.src = fallback
      return
    }
    // A removed upstream image cannot be recovered. Keep the readable link,
    // and remove only its failed image slot instead of showing a broken image.
    const slot = image.closest('.notion-bookmark-image, .notion-bookmark-link-icon')
    if (slot) slot.style.display = 'none'
    else image.style.display = 'none'
  }
  const onError = event => recover(event.target)
  root.addEventListener('error', onError, true)
  // An image may already have failed before hydration attached the listener.
  root.querySelectorAll('.notion-bookmark img').forEach(image => {
    if (image.complete && image.naturalWidth === 0) recover(image)
  })
  return () => root.removeEventListener('error', onError, true)
}
