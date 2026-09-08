import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import SmartLink from '@/components/SmartLink'

const DESKTOP = '(min-width: 769px) and (hover: hover) and (pointer: fine)'
const NATIVE_TARGETS =
  'a, img, picture, video, audio, canvas, input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], .notion-code, .medium-runner'

// Mounted only after the cosmetic reward has been unlocked.
export default function RewardContextMenu({ active, onToggle }) {
  const [position, setPosition] = useState(null)
  const [notice, setNotice] = useState('')
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
      setNotice('')
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
    const onScroll = event => {
      if (
        !(event.target instanceof Node) ||
        !menu.current?.contains(event.target)
      )
        close()
    }
    const onPointer = event => {
      if (!menu.current?.contains(event.target)) close()
    }
    document.addEventListener('contextmenu', onContext, true)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    desktop.addEventListener('change', close)
    return () => {
      document.removeEventListener('contextmenu', onContext, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
      desktop.removeEventListener('change', close)
    }
  }, [])

  useEffect(() => {
    if (!position || !menu.current) return
    const rect = menu.current.getBoundingClientRect()
    menu.current.style.left = `${Math.max(8, Math.min(position.x, document.documentElement.clientWidth - rect.width - 8))}px`
    menu.current.style.top = `${Math.max(8, Math.min(position.y, document.documentElement.clientHeight - rect.height - 8))}px`
    menu.current.querySelector('button')?.focus({ preventScroll: true })
  }, [position])

  const toggle = () => {
    setPosition(null)
    previousFocus.current?.focus?.({ preventScroll: true })
    onToggle()
  }
  const perform = action => {
    setPosition(null)
    previousFocus.current?.focus?.({ preventScroll: true })
    action()
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
              const items = Array.from(
                menu.current.querySelectorAll('[role=menuitem]')
              )
              const current = items.indexOf(document.activeElement)
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (current +
                        (event.key === 'ArrowUp' ? -1 : 1) +
                        items.length) %
                      items.length
              items[next]?.focus()
            }
            if (event.key === 'Tab') setPosition(null)
          }}
        >
          <div className='ng-context-heading' aria-hidden='true'>
            <span>NEW GAME!</span>
            <small>UNLOCKED</small>
          </div>
          <div className='ng-context-navigation'>
            <button
              type='button'
              role='menuitem'
              aria-label='后退'
              title='后退'
              onClick={() => perform(() => window.history.back())}
            >
              ←
            </button>
            <button
              type='button'
              role='menuitem'
              aria-label='前进'
              title='前进'
              onClick={() => perform(() => window.history.forward())}
            >
              →
            </button>
            <button
              type='button'
              role='menuitem'
              aria-label='刷新页面'
              title='刷新页面'
              onClick={() => perform(() => window.location.reload())}
            >
              ↻
            </button>
            <button
              type='button'
              role='menuitem'
              aria-label='回到顶部'
              title='回到顶部'
              onClick={() =>
                perform(() =>
                  window.scrollTo({
                    top: 0,
                    behavior: window.matchMedia(
                      '(prefers-reduced-motion: reduce)'
                    ).matches
                      ? 'auto'
                      : 'smooth'
                  })
                )
              }
            >
              ↑
            </button>
          </div>
          <div className='ng-context-links'>
            <SmartLink
              role='menuitem'
              href='/search'
              onClick={() => setPosition(null)}
            >
              搜索文章
            </SmartLink>
            <SmartLink
              role='menuitem'
              href='/archive'
              onClick={() => setPosition(null)}
            >
              文章归档
            </SmartLink>
            <SmartLink
              role='menuitem'
              href='/category'
              onClick={() => setPosition(null)}
            >
              分类
            </SmartLink>
            <SmartLink
              role='menuitem'
              href='/tag'
              onClick={() => setPosition(null)}
            >
              标签
            </SmartLink>
          </div>
          <button
            type='button'
            role='menuitem'
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href)
                setNotice('已复制页面地址')
              } catch {
                setNotice('复制失败，请用浏览器菜单复制')
              }
            }}
          >
            复制页面地址 <span aria-hidden='true'>⧉</span>
          </button>
          <button
            type='button'
            role='menuitem'
            onClick={() => perform(() => window.print())}
          >
            打印当前页 <span aria-hidden='true'>⌘</span>
          </button>
          <hr />
          <button type='button' role='menuitem' onClick={toggle}>
            <span className='ng-context-symbol' aria-hidden='true'>
              ✦
            </span>
            {label}
            <span aria-hidden='true'>→</span>
          </button>
          {notice && (
            <div className='ng-context-notice' role='status'>
              {notice}
            </div>
          )}
          <p>
            Shift＋右键：浏览器菜单 <span>ESC 关闭</span>
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
          max-height: calc(100dvh - 16px);
          overflow-y: auto;
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
        .ng-context-menu :is(button, a) {
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
        .ng-context-menu :is(button, a):is(:hover, :focus-visible) {
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
        .ng-context-navigation {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          padding: 0 6px 8px;
          border-bottom: 1px solid #f0e4ed;
        }
        .ng-context-navigation button {
          justify-content: center;
          padding: 5px;
          font-size: 20px;
        }
        .ng-context-links {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
          padding-block: 5px;
          border-bottom: 1px solid #f0e4ed;
        }
        .ng-context-menu hr {
          border: 0;
          border-top: 1px solid #f0e4ed;
          margin-block: 5px;
        }
        .ng-context-notice {
          padding: 6px 10px;
          color: #985588;
          font-size: 11px;
        }
        .ng-touch-switch {
          display: inline-block;
          min-height: 44px;
          margin-top: 14px;
          padding: 12px 8px;
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
