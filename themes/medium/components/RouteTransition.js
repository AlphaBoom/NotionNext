import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

const OVERLAY_DELAY_MS = 140

export default function RouteTransition({ children }) {
  const { locale, onLoading } = useGlobal()
  const router = useRouter()
  const [showOverlay, setShowOverlay] = useState(false)
  const [contentEntered, setContentEntered] = useState(true)
  const [loadingArticle, setLoadingArticle] = useState(false)
  const animationFrame = useRef(null)

  useEffect(() => {
    const handleRouteStart = url => {
      const prefix = String(siteConfig('POST_URL_PREFIX', 'article'))
      const path = String(url || '').split('?')[0]
      setLoadingArticle(path.startsWith(`/${prefix}/`))
    }

    router.events.on('routeChangeStart', handleRouteStart)
    return () => router.events.off('routeChangeStart', handleRouteStart)
  }, [router.events])

  useEffect(() => {
    if (!onLoading) {
      setShowOverlay(false)
      return
    }

    const timer = window.setTimeout(() => setShowOverlay(true), OVERLAY_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [onLoading])

  useEffect(() => {
    setContentEntered(false)
    animationFrame.current = window.requestAnimationFrame(() => {
      animationFrame.current = window.requestAnimationFrame(() => {
        setContentEntered(true)
      })
    })

    return () => {
      if (animationFrame.current) {
        window.cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [router.asPath])

  return (
    <>
      <div
        className={`transform-gpu transition-[opacity,transform] duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
          contentEntered
            ? 'translate-y-0 opacity-100'
            : 'translate-y-2 opacity-0'
        }`}>
        {children}
      </div>

      <div
        role='status'
        aria-live='polite'
        aria-hidden={!showOverlay}
        className={`fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-[1px] transition-opacity duration-200 motion-reduce:transition-none dark:bg-black/60 ${
          showOverlay
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}>
        <div className='flex items-center gap-3 rounded-full border border-gray-200 bg-white/95 px-5 py-3 text-sm text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-300'>
          <span className='h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 motion-reduce:animate-none dark:border-gray-600 dark:border-t-gray-200' />
          <span>
            {loadingArticle
              ? locale.COMMON.LOADING_ARTICLE
              : locale.COMMON.LOADING}
          </span>
        </div>
      </div>
    </>
  )
}
