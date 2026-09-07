import LazyImage from '@/components/LazyImage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'

export default function HomeIntro({ siteInfo, categoryOptions = [] }) {
  return (
    <header className='medium-home-intro'>
      <div className='medium-masthead'>
        <div>
          <p className='medium-eyebrow'>{siteConfig('AUTHOR')} / 个人博客</p>
          <h1>{siteConfig('TITLE')}</h1>
          <p className='medium-bio'>{siteConfig('BIO')}</p>
        </div>
        {siteInfo?.icon && <LazyImage src={siteInfo.icon} width={64} height={64} alt={siteConfig('AUTHOR')} className='medium-avatar' />}
      </div>
      <nav className='medium-topics' aria-label='文章分类'>
        <span className='medium-topics-label'>文章</span>
        {categoryOptions.slice(0, 5).map(category => (
          <SmartLink key={category.name} href={`/category/${encodeURIComponent(category.name)}`}>{category.name}</SmartLink>
        ))}
        <SmartLink href='/archive' className='medium-archive-link'>全部归档 <span aria-hidden='true'>↗</span></SmartLink>
      </nav>
    </header>
  )
}
