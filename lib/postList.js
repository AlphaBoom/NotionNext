import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'

export function usesPagedScroll(config) {
  // Medium loads remote pages; DynamicLayout restores the complete list for
  // legacy themes selected at runtime. Static exports keep their local lists.
  return (
    !process.env.EXPORT &&
    siteConfig('THEME', BLOG.THEME, config) === 'medium' &&
    siteConfig('POST_LIST_STYLE', 'page', config) === 'scroll'
  )
}

export function prepareInitialPostList(props) {
  const config = props.NOTION_CONFIG
  const pagedScroll = usesPagedScroll(config)
  if (pagedScroll || siteConfig('POST_LIST_STYLE', 'page', config) === 'page') {
    props.posts = props.posts?.slice(
      0,
      siteConfig('POSTS_PER_PAGE', 12, config)
    )
  }
  if (pagedScroll) props.postListPaged = true
}

export function publishedPosts(allPages = [], { category, tag } = {}) {
  return allPages.filter(
    post =>
      post?.type === 'Post' &&
      post.status === 'Published' &&
      (!category || post.category?.includes(category)) &&
      (!tag || post.tags?.includes(tag))
  )
}
