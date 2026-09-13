import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import SteamFillIcon from 'remixicon-react/SteamFillIcon'

export const getSteamAppId = href => {
  if (typeof href !== 'string') return null
  try {
    const url = new URL(href)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'store.steampowered.com' ||
      url.port ||
      url.username ||
      url.password
    )
      return null
    return url.pathname.match(/^\/app\/([1-9]\d*)(?:\/.*)?$/)?.[1] || null
  } catch {
    return null
  }
}

// Newer Steam releases can use a versioned asset directory instead of /header.jpg.
const HEADER_PATHS = {
  2499860: '2499860/ea0c655407c078a8994b7e91256c79d90169133a/header.jpg'
}

const SteamGameLink = ({
  appId,
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  'aria-describedby': describedBy,
  ...props
}) => {
  const anchorRef = useRef(null)
  const closeTimer = useRef(null)
  const previewHovered = useRef(false)
  const previewId = useId()
  const [position, setPosition] = useState(null)

  const cancelClose = () => clearTimeout(closeTimer.current)
  const close = () => {
    cancelClose()
    setPosition(null)
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      if (!previewHovered.current) setPosition(null)
    }, 180)
  }
  const open = () => {
    cancelClose()
    const rect = anchorRef.current.getBoundingClientRect()
    const width = Math.min(280, window.innerWidth - 24)
    const below = window.innerHeight - rect.bottom >= 220
    setPosition({
      width,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      ...(below
        ? { top: rect.bottom + 8 }
        : { bottom: window.innerHeight - rect.top + 8 })
    })
  }

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const isOpen = Boolean(position)
  useEffect(() => {
    if (!isOpen) return
    const dismiss = () => {
      clearTimeout(closeTimer.current)
      previewHovered.current = false
      setPosition(null)
    }
    const onKeyDown = event => {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [isOpen])

  return (
    <>
      <a
        {...props}
        ref={anchorRef}
        className={[className, 'notion-steam-mention']
          .filter(Boolean)
          .join(' ')}
        aria-describedby={
          [describedBy, isOpen && previewId].filter(Boolean).join(' ') ||
          undefined
        }
        onMouseEnter={event => {
          onMouseEnter?.(event)
          if (
            !event.defaultPrevented &&
            window.matchMedia('(hover: hover)').matches
          )
            open()
        }}
        onMouseLeave={event => {
          onMouseLeave?.(event)
          scheduleClose()
        }}
        onFocus={event => {
          onFocus?.(event)
          if (
            !event.defaultPrevented &&
            event.currentTarget.matches(':focus-visible')
          )
            open()
        }}
        onBlur={event => {
          onBlur?.(event)
          close()
        }}
      >
        <SteamFillIcon
          className='notion-steam-mention-icon'
          size={16}
          aria-hidden='true'
        />
        {children}
      </a>
      {isOpen &&
        createPortal(
          <span
            id={previewId}
            role='tooltip'
            className='notion-steam-preview'
            style={position}
            onMouseEnter={() => {
              previewHovered.current = true
              cancelClose()
            }}
            onMouseLeave={() => {
              previewHovered.current = false
              scheduleClose()
            }}
          >
            <span className='notion-steam-preview-art' aria-hidden='true'>
              <SteamFillIcon size={32} />
              <Image
                src={`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${HEADER_PATHS[appId] || `${appId}/header.jpg`}`}
                alt=''
                width={460}
                height={215}
                unoptimized
                decoding='async'
                onError={event => {
                  event.currentTarget.hidden = true
                }}
              />
            </span>
            <span className='notion-steam-preview-title'>{children}</span>
            <span className='notion-steam-preview-provider'>Steam ↗</span>
          </span>,
          document.body
        )}
    </>
  )
}

export default SteamGameLink
