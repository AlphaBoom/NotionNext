import LazyImage from '@/components/LazyImage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const GAME_MEDIA = '(min-width: 769px) and (hover: hover) and (pointer: fine)'
const loadDungeon = () => import('./SecretDungeon')
const SecretDungeon = dynamic(loadDungeon, {
  ssr: false,
  loading: () => (
    <div className='medium-game-loading' role='status'>
      正在翻开书页…
    </div>
  )
})

export default function HomeIntro({ siteInfo, categoryOptions = [] }) {
  const [view, setView] = useState('profile')
  const [leaving, setLeaving] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [height, setHeight] = useState()
  const content = useRef(null)
  const avatar = useRef(null)
  const returnButton = useRef(null)
  const transition = useRef(null)
  const hasSwitched = useRef(false)
  const prepareId = useRef(0)
  const dungeonReady = useRef(false)

  useEffect(() => {
    const media = window.matchMedia(GAME_MEDIA)
    const closeOnMobile = () => {
      if (!media.matches) {
        clearTimeout(transition.current)
        transition.current = null
        prepareId.current++
        setPreparing(false)
        setLeaving(false)
        setView('profile')
      }
    }
    media.addEventListener('change', closeOnMobile)
    return () => {
      prepareId.current++
      clearTimeout(transition.current)
      media.removeEventListener('change', closeOnMobile)
    }
  }, [])
  useEffect(() => {
    const element = content.current
    const measure = () => setHeight(element.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (hasSwitched.current && window.matchMedia(GAME_MEDIA).matches) {
      const target = view === 'profile' ? avatar.current : returnButton.current
      target?.focus({ preventScroll: true })
    }
    return () => observer.disconnect()
  }, [view])

  function switchView(next) {
    if (
      transition.current ||
      (next === 'game' && !window.matchMedia(GAME_MEDIA).matches)
    )
      return
    setLeaving(true)
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    transition.current = setTimeout(
      () => {
        hasSwitched.current = true
        setView(next)
        setLeaving(false)
        transition.current = null
      },
      reducedMotion ? 0 : 160
    )
  }

  const portrait = siteInfo?.icon ? (
    <LazyImage
      src={siteInfo.icon}
      width={112}
      height={112}
      alt={siteConfig('AUTHOR')}
      className='medium-avatar'
    />
  ) : (
    <span className='medium-avatar-monogram'>
      {siteConfig('AUTHOR')?.slice(0, 1)}
    </span>
  )

  function preloadGame() {
    if (window.matchMedia(GAME_MEDIA).matches) {
      void loadDungeon()
        .then(() => {
          dungeonReady.current = true
        })
        .catch(() => {})
    }
  }

  async function openGame() {
    if (
      preparing ||
      transition.current ||
      !window.matchMedia(GAME_MEDIA).matches
    )
      return
    setLoadFailed(false)
    if (dungeonReady.current) {
      switchView('game')
      return
    }
    const requestId = ++prepareId.current
    setPreparing(true)
    try {
      await loadDungeon()
      if (requestId !== prepareId.current) return
      dungeonReady.current = true
      setPreparing(false)
      switchView('game')
    } catch {
      if (requestId !== prepareId.current) return
      setPreparing(false)
      setLoadFailed(true)
    }
  }

  return (
    <header className='medium-home-intro'>
      <div
        className={`medium-intro-stage ${view === 'game' ? 'is-playing' : ''}`}
        style={{ height }}
      >
        <div
          ref={content}
          key={view}
          className={`medium-intro-content ${leaving ? 'is-leaving' : 'is-entering'}`}
        >
          {view === 'profile' ? (
            <div
              className={`medium-masthead ${preparing ? 'is-preparing' : ''}`}
            >
              <div className='medium-intro-copy'>
                <p className='medium-eyebrow'>
                  <span className='medium-intro-mark' aria-hidden='true'>
                    ✳
                  </span>{' '}
                  记录 · 探索 · 分享
                </p>
                <h1>
                  <SmartLink
                    href='/about'
                    className='medium-author-link'
                    aria-label={`关于 ${siteConfig('AUTHOR')}`}
                  >
                    {siteConfig('AUTHOR')}
                  </SmartLink>
                </h1>
                <p className='medium-bio'>{siteConfig('BIO')}</p>
                {loadFailed && (
                  <p className='medium-game-load-error' role='status'>
                    暂时没能打开，再点头像重试。
                  </p>
                )}
              </div>
              <div className='medium-portrait'>
                <span className='medium-portrait-orbit' aria-hidden='true' />
                <button
                  ref={avatar}
                  type='button'
                  className='medium-portrait-frame medium-portrait-trigger'
                  aria-label={`${siteConfig('AUTHOR')} 的头像，探索隐藏地牢`}
                  onPointerEnter={preloadGame}
                  onFocus={preloadGame}
                  aria-busy={preparing}
                  onClick={openGame}
                >
                  {portrait}
                </button>
                <div className='medium-portrait-frame medium-mobile-avatar'>
                  {portrait}
                </div>
              </div>
            </div>
          ) : (
            <section className='medium-inline-game' aria-label='纸间迷宫'>
              <button
                ref={returnButton}
                type='button'
                className='medium-game-return'
                onClick={() => switchView('profile')}
              >
                ← 返回个人信息
              </button>
              <SecretDungeon onClose={() => switchView('profile')} />
            </section>
          )}
        </div>
      </div>
      <nav className='medium-topics' aria-label='文章分类'>
        <span className='medium-topics-label'>文章</span>
        {categoryOptions.slice(0, 5).map(category => (
          <SmartLink
            key={category.name}
            href={`/category/${encodeURIComponent(category.name)}`}
          >
            {category.name}
          </SmartLink>
        ))}
      </nav>
    </header>
  )
}
