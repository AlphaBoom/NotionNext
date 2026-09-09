/** Retry a failed attachment proxy once through Notion's stable original-file entry. */
export function installAttachmentImageFallback(root, notionHost) {
  const retried = new WeakSet()
  const recover = image => {
    if (
      image?.tagName !== 'IMG' ||
      !image.closest('.notion-asset-wrapper-image') ||
      retried.has(image)
    ) return

    try {
      const proxy = new URL(image.src)
      if (
        proxy.origin !== new URL(notionHost).origin ||
        !proxy.pathname.startsWith('/image/')
      ) return
      const source = decodeURIComponent(proxy.pathname.slice('/image/'.length))
      const id = proxy.searchParams.get('id')
      if (!source.startsWith('attachment:') || !id) return

      // The image processor can time out even while the original file is healthy.
      // /signed/ resolves a fresh file URL on demand, including after an ISR hit.
      const fallback = new URL(`https://www.notion.so/signed/${encodeURIComponent(source)}`)
      fallback.searchParams.set('table', 'block')
      fallback.searchParams.set('id', id)
      retried.add(image)
      image.src = fallback.href
    } catch {
      // Ignore unrelated or malformed image URLs.
    }
  }
  const onError = event => recover(event.target)
  root.addEventListener('error', onError, true)
  // Image errors can occur before React attaches the listener.
  root.querySelectorAll('.notion-asset-wrapper-image img').forEach(image => {
    if (image.complete && image.naturalWidth === 0) recover(image)
  })
  return () => root.removeEventListener('error', onError, true)
}
