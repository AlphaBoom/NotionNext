import SmartLink from '@/components/SmartLink'
import NotionIcon from '@/components/NotionIcon'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import WritingModeBadge from './WritingModeBadge'

export default function ArticleInfo({ post }) {
  const { locale } = useGlobal()
  const showStats = typeof post?.wordCount === 'number' && typeof post?.readTime === 'number'
  return (
    <header className='medium-article-header'>
      <SmartLink href='/' className='medium-back-link'>← 所有文章</SmartLink>
      <div className='medium-article-heading'>
        <h1>{siteConfig('POST_TITLE_ICON') && <NotionIcon icon={post?.pageIcon} />}{post?.title}</h1>
        <WritingModeBadge writingMode={post?.writingMode} />
      </div>
      <div className='medium-article-meta'>
        <div className='medium-article-dates'>
          <span title='发布日期'>{post?.publishDay}</span>
          {post?.lastEditedDay && post.lastEditedDay !== post.publishDay && <span>更新于 {post.lastEditedDay}</span>}
        </div>
        {showStats && <span className='medium-article-stats'>{post.wordCount.toLocaleString()} 字 · {post.readTime} {locale.COMMON.MINUTE}</span>}
      </div>
    </header>
  )
}
