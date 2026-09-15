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

const SteamGameLink = ({
  appId,
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
  onPointerDown,
  'aria-describedby': describedBy,
  ...props
}) => {
  const anchorRef = useRef(null)
  const previewRef = useRef(null)
  const pointerType = useRef(null)
  const touchPreview = useRef(false)
  const closeTimer = useRef(null)
  const previewHovered = useRef(false)
  const previewId = useId()
  const [position, setPosition] = useState(null)
  const [fallbackAppId, setFallbackAppId] = useState(null)
  const useFallbackCover = fallbackAppId === appId

  const cancelClose = () => clearTimeout(closeTimer.current)
  const close = () => {
    cancelClose()
    touchPreview.current = false
    setPosition(null)
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      if (
        !touchPreview.current &&
        !previewHovered.current &&
        !previewRef.current?.contains(document.activeElement)
      )
        setPosition(null)
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
      touchPreview.current = false
      setPosition(null)
    }
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        if (previewRef.current?.contains(document.activeElement))
          anchorRef.current?.focus()
        dismiss()
      }
    }
    const onOutsidePress = event => {
      if (
        !anchorRef.current?.contains(event.target) &&
        !previewRef.current?.contains(event.target)
      )
        dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onOutsidePress)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onOutsidePress)
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
        aria-describedby={describedBy}
        aria-haspopup='dialog'
        aria-expanded={isOpen}
        aria-controls={isOpen ? previewId : undefined}
        onPointerDown={event => {
          onPointerDown?.(event)
          pointerType.current = event.pointerType
        }}
        onClick={event => {
          onClick?.(event)
          const isTouch =
            pointerType.current === 'touch' ||
            pointerType.current === 'pen' ||
            (!pointerType.current &&
              event.detail > 0 &&
              !window.matchMedia('(hover: hover)').matches)
          pointerType.current = null
          if (
            event.defaultPrevented ||
            event.detail === 0 ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            !isTouch
          )
            return
          if (!touchPreview.current) {
            event.preventDefault()
            touchPreview.current = true
            open()
          }
        }}
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
          if (!previewRef.current?.contains(event.relatedTarget)) close()
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
          <div
            ref={previewRef}
            id={previewId}
            role='dialog'
            aria-labelledby={`${previewId}-title`}
            className='notion-steam-preview'
            style={position}
            onFocus={cancelClose}
            onBlur={event => {
              if (
                !event.currentTarget.contains(event.relatedTarget) &&
                !anchorRef.current?.contains(event.relatedTarget)
              )
                close()
            }}
            onMouseEnter={() => {
              previewHovered.current = true
              cancelClose()
            }}
            onMouseLeave={() => {
              previewHovered.current = false
              scheduleClose()
            }}
          >
            <a
              className='notion-steam-preview-link'
              href={props.href}
              target={props.target}
              rel={props.rel}
            >
              <span className='notion-steam-preview-art' aria-hidden='true'>
                <SteamFillIcon size={32} />
                <Image
                  src={
                    useFallbackCover
                      ? `/api/steam-cover/${appId}`
                      : `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
                  }
                  alt=''
                  width={460}
                  height={215}
                  unoptimized
                  decoding='async'
                  onLoad={event => {
                    event.currentTarget.hidden = false
                  }}
                  onError={event => {
                    if (!useFallbackCover) {
                      setFallbackAppId(appId)
                    } else {
                      event.currentTarget.hidden = true
                    }
                  }}
                />
              </span>
              <span
                id={`${previewId}-title`}
                className='notion-steam-preview-title'
              >
                {children}
              </span>
              <span className='notion-steam-preview-provider'>Steam ↗</span>
            </a>
          </div>,
          document.body
        )}
    </>
  )
}

export default SteamGameLink
