import LazyImage from '@/components/LazyImage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useState } from 'react'

const STARS = [
  [18, 26],
  [148, 12],
  [176, 116],
  [94, 180],
  [4, 120]
]

export default function HomeIntro({ siteInfo, categoryOptions = [] }) {
  const [litStars, setLitStars] = useState([])
  const complete = litStars.length === STARS.length

  function lightStar(index) {
    setLitStars(current =>
      current.includes(index) ? current : [...current, index]
    )
  }

  return (
    <header className='medium-home-intro'>
      <div className='medium-masthead'>
        <div className='medium-intro-copy'>
          <p className='medium-eyebrow'>
            <span className='medium-intro-mark' aria-hidden='true'>
              ✳
            </span>{' '}
            {siteConfig('AUTHOR')} / 个人博客
          </p>
          <h1>{siteConfig('TITLE')}</h1>
          <p className='medium-bio'>{siteConfig('BIO')}</p>
          <SmartLink href='/about' className='medium-about-link'>
            关于我 ↗
          </SmartLink>
        </div>
        <div
          className={`medium-star-game ${complete ? 'is-complete' : ''}`}
          role='group'
          aria-label='点亮星图小游戏'
        >
          <div className='medium-portrait'>
            <span className='medium-portrait-orbit' aria-hidden='true' />
            <svg
              className='medium-star-lines'
              viewBox='0 0 184 184'
              aria-hidden='true'
            >
              {STARS.map(([x, y], index) => {
                const next = (index + 1) % STARS.length
                return (
                  <line
                    key={index}
                    x1={x}
                    y1={y}
                    x2={STARS[next][0]}
                    y2={STARS[next][1]}
                    className={
                      litStars.includes(index) && litStars.includes(next)
                        ? 'is-lit'
                        : ''
                    }
                  />
                )
              })}
            </svg>
            <div className='medium-portrait-frame' aria-hidden='true'>
              {siteInfo?.icon ? (
                <LazyImage
                  src={siteInfo.icon}
                  width={112}
                  height={112}
                  alt=''
                  className='medium-avatar'
                />
              ) : (
                <span className='medium-avatar-monogram'>
                  {siteConfig('AUTHOR')?.slice(0, 1)}
                </span>
              )}
            </div>
            {STARS.map(([x, y], index) => (
              <button
                key={index}
                type='button'
                className={`medium-game-star ${litStars.includes(index) ? 'is-lit' : ''}`}
                style={{
                  left: `${(x / 184) * 100}%`,
                  top: `${(y / 184) * 100}%`
                }}
                onClick={() => lightStar(index)}
                aria-label={`点亮第 ${index + 1} 颗星星`}
                aria-pressed={litStars.includes(index)}
              >
                <span aria-hidden='true'>✦</span>
              </button>
            ))}
          </div>
          <p className='medium-game-status' aria-live='polite'>
            {complete
              ? '星图已点亮！'
              : litStars.length
                ? `已点亮 ${litStars.length} / ${STARS.length}`
                : '点点星星，连成一片星空'}
          </p>
          {complete && (
            <button
              type='button'
              className='medium-game-reset'
              onClick={() => setLitStars([])}
            >
              再玩一次 ↺
            </button>
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
