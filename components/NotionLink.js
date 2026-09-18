import SteamGameLink, { getSteamAppId } from '@/components/SteamGameLink'
import { getArticleSectionHref } from '@/lib/db/notion/sectionLinks'
import Link from 'next/link'
import { createContext, useContext } from 'react'

export const NotionArticleLinkContext = createContext({})

const EXTERNAL_HTTP_LINK = /^https?:\/\//i

const mergeRelValues = (...values) => {
  const rel = new Set()

  values
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .forEach(token => rel.add(token))

  return rel.size > 0 ? Array.from(rel).join(' ') : undefined
}

const isExternalHttpLink = (href, siteOrigin) => {
  if (typeof href !== 'string' || !EXTERNAL_HTTP_LINK.test(href)) {
    return false
  }

  if (!siteOrigin) {
    return true
  }

  try {
    const hrefUrl = new URL(href)
    return hrefUrl.origin !== siteOrigin
  } catch {
    return true
  }
}

export const shouldOpenNotionLinkInNewTab = (href, target, siteOrigin) => {
  if (target === '_blank') {
    return true
  }

  const fallbackOrigin =
    siteOrigin ||
    (typeof window !== 'undefined' && window.location
      ? window.location.origin
      : null)

  return isExternalHttpLink(href, fallbackOrigin)
}

const NotionLink = ({ href, target, rel, className, children, ...props }) => {
  const article = useContext(NotionArticleLinkContext)
  const sectionHref = getArticleSectionHref(href, article)
  if (sectionHref) {
    return (
      <a
        {...props}
        className={[className, 'notion-section-link'].filter(Boolean).join(' ')}
        href={sectionHref}
        title={props.title || '跳转到本文此处'}
      >
        <svg
          className='notion-section-link-icon'
          viewBox='0 0 16 16'
          aria-hidden='true'
        >
          <path d='M6 2 4 14M12 2l-2 12M2 6h12M1 10h12' />
        </svg>
        {children}
      </a>
    )
  }
  const shouldOpenInNewTab = shouldOpenNotionLinkInNewTab(href, target)
  const normalizedTarget = shouldOpenInNewTab ? '_blank' : target
  const normalizedRel = shouldOpenInNewTab
    ? mergeRelValues(rel, 'noopener noreferrer')
    : rel
  const appId = getSteamAppId(href)
  if (appId) {
    return (
      <SteamGameLink
        {...props}
        appId={appId}
        className={className}
        href={href}
        target={normalizedTarget}
        rel={normalizedRel}
      >
        {children}
      </SteamGameLink>
    )
  }

  // Native anchors wait for the entire destination document before replacing
  // the current page. Local page links must participate in route transitions.
  // Keep downloads, custom targets and non-page protocols as native links.
  const localPage = typeof href === 'string' && /^\/(?!\/)/.test(href)
  if (localPage && (!target || target === '_self') && props.download == null) {
    return (
      <Link {...props} href={href} prefetch={false} className={className} rel={rel}>
        {children}
      </Link>
    )
  }

  return (
    <a
      {...props}
      className={className}
      href={href}
      target={normalizedTarget}
      rel={normalizedRel}
    >
      {children}
    </a>
  )
}

export default NotionLink
