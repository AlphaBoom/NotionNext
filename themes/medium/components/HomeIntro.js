import LazyImage from '@/components/LazyImage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const SecretDungeon = dynamic(() => import('./SecretDungeon'), { ssr: false })

export default function HomeIntro({ siteInfo, categoryOptions = [] }) {
  const [gameOpen, setGameOpen] = useState(false)

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
        <div className='medium-portrait'>
          <span className='medium-portrait-orbit' aria-hidden='true' />
          <button
            type='button'
            className='medium-portrait-frame'
            aria-label={`${siteConfig('AUTHOR')} 的头像，探索隐藏地牢`}
            onClick={() => setGameOpen(true)}
          >
            {siteInfo?.icon ? (
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
            )}
          </button>
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
      {gameOpen && <SecretDungeon onClose={() => setGameOpen(false)} />}
    </header>
  )
}
