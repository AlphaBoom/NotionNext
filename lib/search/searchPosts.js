import { getDataFromCache } from '@/lib/cache/cache_manager'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { getPageBlockCacheKey } from '@/lib/db/notion/getPostBlocks'
import { matchesMetadata, normalizeKeyword } from './metadata'

// Both search routes share matching and ordering, including cached body text.
// A metadata hit needs no cache read; remaining reads run in bounded batches.
export async function searchPosts(posts = [], keyword) {
  const query = normalizeKeyword(keyword).toLowerCase()
  if (!query) return []
  const searchPost = async post => {
    if (matchesMetadata(post, query)) return { ...post, results: [] }
    if (post.password) return null
    const key = getPageBlockCacheKey(post.id, post.lastEditedDate)
    const page = await getDataFromCache(key, true)
    if (!page?.block) return null
    const content = getPageContentText(post, page)
    const index = content.toLowerCase().indexOf(query)
    if (index < 0) return null
    const start = Math.max(0, index - 55)
    const end = Math.min(content.length, index + query.length + 125)
    const excerpt = `${start ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`
    return { ...post, results: [excerpt], searchExcerpt: excerpt }
  }
  const results = []
  for (let start = 0; start < posts.length; start += 4) {
    const batch = await Promise.all(
      posts.slice(start, start + 4).map(searchPost)
    )
    results.push(...batch.filter(Boolean))
  }
  return results
}
