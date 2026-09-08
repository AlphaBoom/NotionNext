import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'

const DESKTOP = '(min-width: 769px) and (hover: hover) and (pointer: fine)'
const NATIVE_TARGETS =
  'a, img, picture, video, audio, canvas, input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], .notion-code'

// Mounted only after the cosmetic reward has been unlocked.
export default function RewardContextMenu({ active, onToggle }) {
  const [position, setPosition] = useState(null)
  const [footer, setFooter] = useState(null)
  const menu = useRef(null)
  const previousFocus = useRef(null)
  const router = useRouter()

  useEffect(() => {
    setPosition(null)
    setFooter(document.querySelector('#theme-medium .medium-footer'))
  }, [router.asPath])

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP)
    const close = () => setPosition(null)
    const open = (x, y) => {
      previousFocus.current = document.activeElement
      setPosition({ x, y })
    }
    const onContext = event => {
      if (!desktop.matches) return
      // Prevent a second configured site menu, while keeping the native menu
      // for links, media, text selection and Shift + right click.
      event.stopPropagation()
      if (
        event.shiftKey ||
        document.getSelection()?.toString() ||
        event.target.closest?.(NATIVE_TARGETS)
      ) {
        close()
        return
      }
      event.preventDefault()
      open(event.clientX, event.clientY)
    }
    const onKey = event => {
      if (event.key === 'Escape') {
        close()
        if (menu.current?.contains(document.activeElement))
          previousFocus.current?.focus?.({ preventScroll: true })
      }
      if (
        desktop.matches &&
        (event.key === 'ContextMenu' ||
          (event.shiftKey && event.key === 'F10')) &&
        !event.target.closest?.(NATIVE_TARGETS)
      ) {
        event.preventDefault()
        const rect = event.target.getBoundingClientRect?.()
        open(rect?.left || 24, rect?.top || 100)
      }
    }
    const onPointer = event => {
      if (!menu.current?.contains(event.target)) close()
    }
    document.addEventListener('contextmenu', onContext, true)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    desktop.addEventListener('change', close)
    return () => {
      document.removeEventListener('contextmenu', onContext, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
      desktop.removeEventListener('change', close)
    }
  }, [])

  useEffect(() => {
    if (!position || !menu.current) return
    const rect = menu.current.getBoundingClientRect()
    menu.current.style.left = `${Math.max(8, Math.min(position.x, window.innerWidth - rect.width - 8))}px`
    menu.current.style.top = `${Math.max(8, Math.min(position.y, window.innerHeight - rect.height - 8))}px`
    menu.current.querySelector('button')?.focus({ preventScroll: true })
  }, [position])

  const toggle = () => {
    setPosition(null)
    previousFocus.current?.focus?.({ preventScroll: true })
    onToggle()
  }
  const label = active ? '恢复原主题' : '开启 NEW GAME! 主题'
  return (
    <>
      {position && (
        <div
          ref={menu}
          className='ng-context-menu'
          role='menu'
          aria-label='已解锁的博客主题'
          style={{ left: position.x, top: position.y }}
          onKeyDown={event => {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              menu.current.querySelector('button')?.focus()
            }
            if (event.key === 'Tab') setPosition(null)
          }}
        >
          <div className='ng-context-heading' aria-hidden='true'>
            <span>NEW GAME!</span>
            <small>UNLOCKED</small>
          </div>
          <button type='button' role='menuitem' onClick={toggle}>
            <span className='ng-context-symbol' aria-hidden='true'>
              ✦
            </span>
            {label}
            <span aria-hidden='true'>→</span>
          </button>
          <p>
            右键切换主题 <span>ESC 关闭</span>
          </p>
        </div>
      )}
      {footer &&
        createPortal(
          <button type='button' className='ng-touch-switch' onClick={toggle}>
            {label}
          </button>,
          footer
        )}
      <style jsx global>{`
        .ng-context-menu {
          position: fixed;
          z-index: 1000;
          width: 252px;
          max-width: calc(100vw - 16px);
          padding: 6px;
          border: 1px solid #dcdce3;
          background: #fff;
          color: #454552;
          border-radius: 8px;
          box-shadow: 0 8px 28px #15152224;
          font-family: 'Noto Sans SC', sans-serif;
          animation: ng-menu-in 110ms ease-out;
        }
        .ng-context-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 10px;
          color: #d34c75;
          font: 700 12px monospace;
          letter-spacing: 0.06em;
        }
        .ng-context-heading small {
          font-size: 8px;
          color: #8a8491;
        }
        .ng-context-menu button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          text-align: left;
          padding: 12px 10px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          background: #fff;
          color: #454552;
        }
        .ng-context-menu button > span:last-child {
          margin-left: auto;
        }
        .ng-context-symbol {
          color: #e8678c;
          font-size: 17px;
        }
        .ng-context-menu button:is(:hover, :focus-visible) {
          background: #fff0f4;
          outline: 1px solid #f2c3d1;
          outline-offset: -1px;
        }
        .ng-context-menu p {
          display: flex;
          justify-content: space-between;
          padding: 10px 10px 5px;
          color: #85818b;
          font-size: 9px;
        }
        .ng-touch-switch {
          display: inline-block;
          margin-top: 14px;
          padding: 6px 0;
          color: inherit;
          font-size: 11px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        @media ${DESKTOP} {
          .ng-touch-switch {
            display: none;
          }
        }
        @keyframes ng-menu-in {
          from {
            opacity: 0;
            transform: translateY(-3px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ng-context-menu {
            animation: none;
          }
        }
        @media print {
          .ng-context-menu,
          .ng-touch-switch {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
