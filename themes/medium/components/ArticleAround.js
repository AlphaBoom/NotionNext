import SmartLink from '@/components/SmartLink'
import WritingModeBadge from './WritingModeBadge'

export default function ArticleAround({ prev, next }) {
  if (!prev && !next) return null
  return (
    <nav className='medium-article-around' aria-label='继续阅读'>
      {prev && <div>
        <SmartLink href={prev.href || `/${prev.slug}`}>
          <span>← 上一篇</span><strong>{prev.title}</strong>
        </SmartLink>
        <WritingModeBadge writingMode={prev.writingMode} />
      </div>}
      {next && <div className='medium-next-article'>
        <SmartLink href={next.href || `/${next.slug}`}>
          <span>下一篇 →</span><strong>{next.title}</strong>
        </SmartLink>
        <WritingModeBadge writingMode={next.writingMode} />
      </div>}
    </nav>
  )
}
