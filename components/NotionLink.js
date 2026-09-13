import SteamFillIcon from 'remixicon-react/SteamFillIcon'

const EXTERNAL_HTTP_LINK = /^https?:\/\//i
const STEAM_STORE_LINK = /^https:\/\/store\.steampowered\.com\/app\/\d+(?:\/|[?#]|$)/i

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
  const shouldOpenInNewTab = shouldOpenNotionLinkInNewTab(href, target)
  const normalizedTarget = shouldOpenInNewTab ? '_blank' : target
  const normalizedRel = shouldOpenInNewTab
    ? mergeRelValues(rel, 'noopener noreferrer')
    : rel
  const isSteamMention = typeof href === 'string' && STEAM_STORE_LINK.test(href)
  const linkClassName = isSteamMention
    ? [className, 'notion-steam-mention'].filter(Boolean).join(' ')
    : className

  return (
    <a
      {...props}
      className={linkClassName}
      href={href}
      target={normalizedTarget}
      rel={normalizedRel}>
      {isSteamMention && (
        <>
          <SteamFillIcon
            className='notion-steam-mention-icon'
            size={16}
            aria-hidden='true'
          />
          <span className='notion-steam-mention-provider' aria-hidden='true'>
            Steam
          </span>
        </>
      )}
      {children}
    </a>
  )
}

export default NotionLink
