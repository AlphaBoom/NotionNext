import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

function routeKey(href, router) {
  const url = new URL(href, window.location.origin)
  let path = url.pathname
  if (router.basePath && path.startsWith(`${router.basePath}/`)) {
    path = path.slice(router.basePath.length)
  }
  const first = path.split('/')[1]
  if (router.locales?.includes(first)) path = path.slice(first.length + 1) || '/'
  return `${path}${url.search}`
}

function destinationTitle(url, router) {
  const key = routeKey(url, router)
  const link = Array.from(document.querySelectorAll('a[href]')).find(anchor => {
    const href = anchor.getAttribute('href')?.trim()
    // On popstate the address has already changed, so a relative #skip-link
    // resolves against the destination even though the old DOM is still shown.
    return href && !href.startsWith('#') &&
      anchor.origin === window.location.origin && routeKey(anchor.href, router) === key
  })
  return (link?.textContent || link?.getAttribute('aria-label') || '').trim()
}

export default function RouteTransition({ children }) {
  const router = useRouter()
  const [pending, setPending] = useState(null)
  const active = useRef(null)
  const restore = useRef(null)
  const loadingHeading = useRef(null)

  useEffect(() => {
    const start = (url, { shallow } = {}) => {
      // Filters and hash links keep their existing content and local loading UI.
      if (shallow || routeKey(url, router) === routeKey(router.asPath, router)) return
      restore.current = null
      const next = {
        url,
        title: destinationTitle(url, router),
        searching: routeKey(url, router).split('?')[0].startsWith('/search'),
        focus: document.activeElement,
        scroll: { left: window.scrollX, top: window.scrollY }
      }
      active.current = next
      setPending(next)
    }
    const done = (url, { shallow } = {}) => {
      if (shallow || active.current?.url !== url) return
      active.current = null
      setPending(null)
    }
    const failed = (error, url) => {
      // A cancelled, older navigation must not dismiss a newer loading screen.
      if (active.current?.url !== url) return
      restore.current = active.current
      active.current = null
      setPending(null)
    }
    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', done)
    router.events.on('routeChangeError', failed)
    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', done)
      router.events.off('routeChangeError', failed)
    }
  }, [router])

  useEffect(() => {
    if (pending) {
      loadingHeading.current?.focus({ preventScroll: true })
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    } else if (restore.current) {
      restore.current.focus?.focus({ preventScroll: true })
      window.scrollTo({ ...restore.current.scroll, behavior: 'instant' })
      restore.current = null
    }
  }, [pending])

  return (
    <>
      {pending && (
        <>
          <div className='medium-route-progress' aria-hidden='true' />
          <section className='medium-route-loading' aria-label='页面加载中' aria-busy='true'>
            <h1 ref={loadingHeading} tabIndex={-1}>
              {pending.title || (pending.searching ? '搜索结果' : '正在打开页面')}
            </h1>
            <p role='status'>{pending.searching ? '正在加载搜索结果…' : '正在加载页面内容…'}</p>
            <div className='medium-route-skeleton' aria-hidden='true'>
              <span /><span /><span /><span /><span />
            </div>
          </section>
        </>
      )}
      {/* Keep state mounted so an error/cancel can reveal the original page. */}
      <div
        key={router.asPath.split('#')[0]}
        className='medium-route-content'
        hidden={Boolean(pending)}
      >
        {children}
      </div>
    </>
  )
}
