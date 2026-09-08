import SmartLink from '@/components/SmartLink'
import WritingModeBadge from './WritingModeBadge'

export default function ArticleAround({ prev, next }) {
  if (!prev && !next) return null
  return (
    <nav className='medium-article-around' aria-label='继续阅读'>
      {prev && <SmartLink href={prev.href || `/${prev.slug}`}>
        <span>← 上一篇</span><strong>{prev.title}</strong>
        <WritingModeBadge writingMode={prev.writingMode} />
      </SmartLink>}
      {next && <SmartLink href={next.href || `/${next.slug}`} className='medium-next-article'>
        <span>下一篇 →</span><strong>{next.title}</strong>
        <WritingModeBadge writingMode={next.writingMode} />
      </SmartLink>}
    </nav>
  )
}
