import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { cleanPostSummary, fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { publishedPosts } from '@/lib/postList'
import { matchesMetadata } from '@/lib/search/metadata'
import { searchPosts } from '@/lib/search/searchPosts'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const {
    page = '1',
    category,
    tag,
    keyword,
    metadataKeyword,
    locale = BLOG.LANG
  } = req.query
  const pageNumber = Number(page)
  const locales = [
    BLOG.LANG,
    ...BLOG.NOTION_PAGE_ID.split(',')
      .filter(id => id.includes(':'))
      .map(id => id.split(':')[0])
  ]
  if (
    typeof page !== 'string' ||
    !/^\d+$/.test(page) ||
    !Number.isSafeInteger(pageNumber) ||
    pageNumber < 1 ||
    !locales.includes(locale) ||
    [category, tag, keyword, metadataKeyword].some(
      value =>
        value !== undefined && (typeof value !== 'string' || value.length > 500)
    )
  ) {
    return res.status(400).json({ error: 'Invalid post list parameters' })
  }

  try {
    const data = await fetchGlobalAllData({ from: 'post-list-api', locale })
    let posts = publishedPosts(data.allPages, { category, tag })
    if (keyword) posts = await searchPosts(posts, keyword)
    else if (metadataKeyword)
      posts = posts.filter(post => matchesMetadata(post, metadataKeyword))

    const pageSize = siteConfig('POSTS_PER_PAGE', 12, data.NOTION_CONFIG)
    const postCount = posts.length
    const summaries = posts
      .slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
      .map(post => {
        const summary = cleanPostSummary(post)
        // Only card metadata is needed; never send credentials, blocks or ext data.
        delete summary.password
        delete summary.ext
        if (post.searchExcerpt) summary.searchExcerpt = post.searchExcerpt
        return summary
      })
    const ttl = Number(
      siteConfig('NEXT_REVALIDATE_SECOND', 600, data.NOTION_CONFIG)
    )
    res.setHeader(
      'Cache-Control',
      Number.isFinite(ttl) && ttl > 0
        ? `public, s-maxage=${Math.floor(ttl)}, stale-while-revalidate=${Math.floor(ttl)}`
        : 'no-store'
    )
    return res.status(200).json({
      posts: summaries,
      postCount,
      page: pageNumber,
      hasMore: pageNumber * pageSize < postCount
    })
  } catch (error) {
    console.error('Failed to load post list:', error)
    return res.status(503).json({ error: 'Failed to load post list' })
  }
}
