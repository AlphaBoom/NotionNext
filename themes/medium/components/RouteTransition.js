import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function RouteTransition({ children }) {
  const { locale } = useGlobal()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const start = url => {
      setSearching(url.split('?')[0].startsWith('/search'))
      setLoading(true)
    }
    const done = () => setLoading(false)
    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', done)
    router.events.on('routeChangeError', done)
    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', done)
      router.events.off('routeChangeError', done)
    }
  }, [router.events])

  return (
    <>
      {loading && (
        <div className='medium-route-progress' role='status'>
          <span className='sr-only'>
            {searching ? '正在加载搜索结果…' : locale.COMMON.LOADING_ARTICLE}
          </span>
        </div>
      )}
      <div
        key={router.asPath.split('#')[0]}
        className='medium-route-content'
        aria-busy={loading}
      >
        {children}
      </div>
    </>
  )
}
