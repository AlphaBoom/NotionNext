import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { prepareInitialPostList } from '@/lib/postList'

/**
 * 分类页
 * @param {*} props
 * @returns
 */
export default function Category(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutPostList' {...props} />
}

export async function getStaticProps({ params: { category }, locale }) {
  const from = 'category-props'
  let props = await fetchGlobalAllData({ from, locale })

  // 过滤状态
  props.posts = props.allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
  // 处理过滤
  props.posts = props.posts.filter(
    post => post && post.category && post.category.includes(category)
  )

  // 处理文章页数
  props.postCount = props.posts.length
  // 处理分页
  prepareInitialPostList(props)

  delete props.allPages

  props = { ...props, category }

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export async function getStaticPaths() {
  const from = 'category-paths'
  const { categoryOptions } = await fetchGlobalAllData({ from })
  const categories = Array.isArray(categoryOptions) ? categoryOptions : []
  return {
    paths: categories.map(category => ({
      params: { category: category?.name }
    })),
    fallback: true
  }
}
