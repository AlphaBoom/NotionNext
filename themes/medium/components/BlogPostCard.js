import LazyImage from '@/components/LazyImage'
import NotionIcon from '@/components/NotionIcon'
import SmartLink from '@/components/SmartLink'
import TwikooCommentCount from '@/components/TwikooCommentCount'
import { siteConfig } from '@/lib/config'
import CONFIG from '../config'
import WritingModeBadge from './WritingModeBadge'
import TextPostCover from './TextPostCover'

const BlogPostCard = ({ post, priority = false }) => {
  const showCover = siteConfig('MEDIUM_POST_LIST_COVER', null, CONFIG)
  const cover = post.pageCoverThumbnail
  const showTextCover = !cover && siteConfig('MEDIUM_POST_AUTO_COVER', null, CONFIG)
  const hasCover = showCover && (cover || showTextCover)
  return (
    <article className={`medium-post ${hasCover ? 'medium-post-with-cover' : ''}`}>
      <div className='medium-post-copy'>
        <div className='medium-post-meta'>
          <time dateTime={post.date?.start_date}>{post.date?.start_date}</time>
          {siteConfig('MEDIUM_POST_LIST_CATEGORY', null, CONFIG) && post.category && (
            <SmartLink href={`/category/${encodeURIComponent(post.category)}`}>{post.category}</SmartLink>
          )}
          <WritingModeBadge writingMode={post.writingMode} />
          <TwikooCommentCount post={post} />
        </div>
        <h2><SmartLink href={post.href}>
          {siteConfig('POST_TITLE_ICON') && <NotionIcon icon={post.pageIcon} />}{post.title}
        </SmartLink></h2>
        {post.summary && <p className='medium-post-summary'>{post.summary}</p>}
        {siteConfig('MEDIUM_POST_LIST_TAG', null, CONFIG) && (
          <div className='medium-post-tags'>
            {post.tagItems?.slice(0, 2).map(tag => (
              <SmartLink key={tag.name} href={`/tag/${encodeURIComponent(tag.name)}`}>{tag.name}</SmartLink>
            ))}
          </div>
        )}
      </div>
      {hasCover && <SmartLink href={post.href} className='medium-post-cover' tabIndex={-1} aria-hidden='true'>
        {cover
          ? <LazyImage src={cover} width={360} height={240} alt={post.title} priority={priority} />
          : <TextPostCover post={post} />}
      </SmartLink>}
    </article>
  )
}
export default BlogPostCard
