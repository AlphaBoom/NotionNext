import { siteConfig } from '@/lib/config'

const EVENTS = new Set([
  'select_content', 'navigation_click', 'toc_click', 'share_click', 'copy_link'
])
const PARAMETERS = ['content_id', 'content_type', 'placement', 'section_id', 'method']

// Search terms, query parameters, hashes and external URL paths are not needed
// to explain these interactions. Never send the clipboard or rendered text.
function analyticsUrl(value) {
  try {
    const url = new URL(value, window.location.origin)
    if (!['http:', 'https:'].includes(url.protocol)) return undefined
    if (url.origin !== window.location.origin) return url.origin
    const segments = url.pathname.split('/')
    const searchIndex = segments.indexOf('search')
    const path = searchIndex >= 0 ? segments.slice(0, searchIndex + 1).join('/') : url.pathname
    return url.origin + path
  } catch {
    return undefined
  }
}

/** Best-effort enqueue only: analytics must never delay or break an interaction. */
export function trackInteraction(name, parameters = {}) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
    const id = siteConfig('ANALYTICS_GOOGLE_ID')
    const disabled = siteConfig('DISABLE_PLUGIN')
    if (!id || disabled === true || disabled === 'true' || window[`ga-disable-${id}`]) return false
    if (!EVENTS.has(name)) return false

    const payload = {
      send_to: id,
      page_location: analyticsUrl(window.location.href)
    }
    if (document.referrer) payload.page_referrer = analyticsUrl(document.referrer)
    if (window.location.pathname.split('/').includes('search')) {
      payload.page_title = 'Search'
    }
    for (const key of PARAMETERS) {
      const value = parameters[key]
      // These fields are identifiers chosen by the application, not free text.
      if (typeof value === 'string' && /^[a-z0-9_-]{1,100}$/i.test(value)) {
        payload[key] = value
      }
    }
    if (['navigation_click', 'select_content'].includes(name) && parameters.link_url) {
      const url = analyticsUrl(parameters.link_url)
      if (url) payload.link_url = url
    }
    window.gtag('event', name, payload)
    return true
  } catch {
    return false
  }
}
