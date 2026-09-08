import { useEffect, useId, useRef, useState } from 'react'
import { getWritingModeInfo } from '@/lib/utils/writingMode.mjs'

export default function WritingModeBadge({ writingMode }) {
  const info = getWritingModeInfo(writingMode)
  return info ? <InteractiveBadge key={info.mode} info={info} /> : null
}

function InteractiveBadge({ info }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, width: 240, below: false })
  const wrapperRef = useRef(null)
  const pressTimer = useRef(null)
  const pressStart = useRef(null)
  const longPressed = useRef(false)
  const pointerType = useRef('')
  const tooltipId = useId()

  const cancelPress = () => {
    clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  const showDetails = () => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (rect) {
      const width = Math.min(240, window.innerWidth - 32)
      const left = Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 16))
      setPosition({ left: left - rect.left, width, below: rect.top < 64 })
    }
    setOpen(true)
  }

  useEffect(() => () => clearTimeout(pressTimer.current), [])

  useEffect(() => {
    if (!open) return
    const dismiss = () => setOpen(false)
    const onPointerDown = event => {
      if (!wrapperRef.current?.contains(event.target)) dismiss()
    }
    const onKeyDown = event => {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [open])

  return (
    <span className='medium-writing-label' ref={wrapperRef}>
      <button
        type='button'
        className={`medium-writing-badge ${info.mode}`}
        aria-expanded={open}
        aria-controls={open ? tooltipId : undefined}
        aria-describedby={open ? tooltipId : undefined}
        onClick={event => {
          event.stopPropagation()
          // Touch browsers may synthesize a click after a successful long press.
          if (longPressed.current) {
            longPressed.current = false
            return
          }
          if (open) setOpen(false)
          else showDetails()
        }}
        onBlur={() => setOpen(false)}
        onPointerDown={event => {
          cancelPress()
          pointerType.current = event.pointerType
          longPressed.current = false
          pressStart.current = { x: event.clientX, y: event.clientY }
          if (event.pointerType === 'touch' || event.pointerType === 'pen') {
            pressTimer.current = setTimeout(() => {
              longPressed.current = true
              showDetails()
            }, 500)
          }
        }}
        onPointerMove={event => {
          const start = pressStart.current
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancelPress()
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={event => {
          if (pointerType.current === 'touch' || pointerType.current === 'pen') {
            event.preventDefault()
            event.stopPropagation()
            cancelPress()
            longPressed.current = true
            showDetails()
          }
        }}>
        {info.label}
      </button>
      {open && <span
        id={tooltipId}
        role='tooltip'
        className='medium-writing-tooltip'
        style={{ left: position.left, width: position.width, ...(position.below ? { top: 'calc(100% + 8px)' } : { bottom: 'calc(100% + 8px)' }) }}>
        {info.description}
      </span>}
    </span>
  )
}
