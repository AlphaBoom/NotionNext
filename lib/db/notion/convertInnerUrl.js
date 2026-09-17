import { idToUuid } from 'notion-utils'
import { isBrowser } from '../../utils'
import {
  getNotionLinkId,
  normalizeNotionId,
  normalizeSectionHash
} from './sectionLinks'

/** Resolve Notion page links without losing their section fragments. */
export const convertInnerUrl = ({
  allPages,
  lang,
  innerPageUrlParentPath = false
}) => {
  if (!isBrowser) return
  const anchors = document
    .getElementById('notion-article')
    ?.querySelectorAll(
      'a.notion-link, a.notion-collection-card, a.notion-page-link'
    )
  if (!anchors) return

  const { origin, pathname } = window.location
  const langPrefix =
    lang === pathname.split('/').filter(Boolean)[0] ? '/' + lang : ''
  const currentPath = pathname.replace(/\/$/, '') || '/'
  for (const anchor of anchors) {
    const rawHref = anchor.getAttribute('href')
    if (!rawHref) continue
    // A fragment is already resolved. Do not turn it back into a page request.
    if (rawHref.startsWith('#')) {
      anchor.setAttribute('href', normalizeSectionHash(rawHref) || '#')
      anchor.removeAttribute('target')
      continue
    }

    const id = getNotionLinkId(rawHref, origin)
    if (id) {
      const hash = normalizeSectionHash(new URL(anchor.href).hash)
      const page = allPages?.find(
        page =>
          normalizeNotionId(page.id) === id ||
          (page.short_id && idToUuid(id).slice(14) === page.short_id)
      )
      if (page?.href) {
        anchor.setAttribute('href', langPrefix + page.href + hash)
      } else if (
        innerPageUrlParentPath &&
        anchor.classList.contains('notion-page-link')
      ) {
        anchor.setAttribute(
          'href',
          `${currentPath === '/' ? '' : currentPath}/${id}${hash}`
        )
      }
    }

    const url = new URL(anchor.href)
    if (url.origin === origin) {
      if (
        url.hash &&
        (url.pathname.replace(/\/$/, '') || '/') === currentPath
      ) {
        anchor.setAttribute('href', normalizeSectionHash(url.hash))
      }
      anchor.removeAttribute('target')
    }
  }
}
