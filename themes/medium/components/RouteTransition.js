import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

const ArticleLoading = ({ label }) => (
  <section
    role='status'
    aria-live='polite'
    className='min-h-[60vh] max-w-4xl px-1 pt-14'>
    <span className='sr-only'>{label}</span>
    <div className='animate-pulse motion-reduce:animate-none'>
      <div className='mb-5 h-10 w-4/5 rounded bg-gray-200 dark:bg-gray-700' />
      <div className='mb-12 flex gap-4'>
        <div className='h-4 w-24 rounded bg-gray-200 dark:bg-gray-700' />
        <div className='h-4 w-32 rounded bg-gray-200 dark:bg-gray-700' />
      </div>
      <div className='space-y-4 border-t border-gray-100 pt-10 dark:border-gray-800'>
        <div className='h-4 w-full rounded bg-gray-100 dark:bg-gray-800' />
        <div className='h-4 w-11/12 rounded bg-gray-100 dark:bg-gray-800' />
        <div className='h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800' />
        <div className='h-4 w-5/6 rounded bg-gray-100 dark:bg-gray-800' />
      </div>
    </div>
  </section>
)

export default function RouteTransition({ children }) {
  const { locale } = useGlobal()
  const router = useRouter()
  const [contentEntered, setContentEntered] = useState(true)
  const [loadingArticle, setLoadingArticle] = useState(false)
  const animationFrame = useRef(null)

  useEffect(() => {
    const handleRouteStart = url => {
      const prefix = String(siteConfig('POST_URL_PREFIX', 'article'))
      const path = String(url || '').split('?')[0]
      setLoadingArticle(path.startsWith(`/${prefix}/`))
    }
    const handleRouteDone = () => setLoadingArticle(false)

    router.events.on('routeChangeStart', handleRouteStart)
    router.events.on('routeChangeComplete', handleRouteDone)
    router.events.on('routeChangeError', handleRouteDone)
    return () => {
      router.events.off('routeChangeStart', handleRouteStart)
      router.events.off('routeChangeComplete', handleRouteDone)
      router.events.off('routeChangeError', handleRouteDone)
    }
  }, [router.events])

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
        {loadingArticle ? (
          <ArticleLoading label={locale.COMMON.LOADING_ARTICLE} />
        ) : (
          children
        )}
      </div>
    </>
  )
}
