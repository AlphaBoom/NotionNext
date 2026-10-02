import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { matchesMetadata, normalizeKeyword } from '@/lib/search/metadata'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BlogPostCard from './BlogPostCard'
import BlogPostListEmpty from './BlogPostListEmpty'

const BlogPostListScroll = ({
  posts = [],
  page = 1,
  postCount,
  postListPaged,
  searchClientSide,
  category,
  tag,
  currentSearch,
  searchKeyword
}) => {
  const { NOTION_CONFIG, locale } = useGlobal()
  const router = useRouter()
  const pageSize = siteConfig('POSTS_PER_PAGE', 12, NOTION_CONFIG)
  const remote = Boolean(postListPaged) && !searchClientSide
  const metadataKeyword = !searchKeyword ? normalizeKeyword(router.query.s) : ''
  const filteredPosts = useMemo(
    () =>
      !remote && metadataKeyword
        ? posts.filter(post => matchesMetadata(post, metadataKeyword))
        : posts,
    [posts, remote, metadataKeyword]
  )
  const filters = useMemo(
    () => ({
      category,
      tag,
      keyword: searchKeyword,
      metadataKeyword,
      locale: router.locale
    }),
    [category, tag, searchKeyword, metadataKeyword, router.locale]
  )
  // Remount for a different route/filter/dataset, cancelling stale requests and
  // resetting the visible count instead of carrying pages across lists.
  const listKey = JSON.stringify([
    router.asPath.split('#')[0],
    router.locale,
    page,
    pageSize,
    postCount,
    filters,
    filteredPosts.map(post => [post.id, post.lastEditedDate])
  ])
  const refilter = remote && Boolean(metadataKeyword)

  return (
    <ScrollList
      key={listKey}
      initialPosts={refilter ? [] : filteredPosts}
      initialPage={refilter ? 0 : Math.max(1, Number(page) || 1)}
      postCount={refilter ? null : postCount}
      pageSize={pageSize}
      remote={remote}
      filters={filters}
      basePath={router.basePath || ''}
      locale={locale}
      currentSearch={currentSearch}
      searchKeyword={searchKeyword}
    />
  )
}

function ScrollList({
  initialPosts,
  initialPage,
  postCount,
  pageSize,
  remote,
  filters,
  basePath,
  locale,
  currentSearch,
  searchKeyword
}) {
  const [loadedPosts, setLoadedPosts] = useState(initialPosts)
  const [nextPage, setNextPage] = useState(initialPage + 1)
  const [remoteHasMore, setRemoteHasMore] = useState(
    postCount === null || initialPage * pageSize < postCount
  )
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const request = useRef(null)
  const busy = useRef(false)
  const target = useRef(null)
  const hasMore = remote ? remoteHasMore : visibleCount < initialPosts.length
  const postsToShow = remote ? loadedPosts : initialPosts.slice(0, visibleCount)

  useEffect(
    () => () => {
      request.current?.abort()
      request.current = null
      busy.current = false
    },
    []
  )

  useEffect(() => {
    if (!remote) busy.current = false
  }, [visibleCount, remote])

  const loadMore = useCallback(async () => {
    if (!hasMore || busy.current) return
    busy.current = true
    if (!remote) {
      setVisibleCount(count => Math.min(count + pageSize, initialPosts.length))
      return
    }

    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ page: String(nextPage) })
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      const response = await fetch(
        `${basePath}/api/post-list?${params.toString()}`,
        {
          signal: controller.signal
        }
      )
      if (!response.ok) throw new Error('Post list request failed')
      const data = await response.json()
      if (
        !Array.isArray(data.posts) ||
        data.page !== nextPage ||
        typeof data.hasMore !== 'boolean' ||
        (data.hasMore && data.posts.length === 0)
      )
        throw new Error('Invalid post list response')
      if (controller.signal.aborted) return
      setLoadedPosts(previous => {
        const seen = new Set(previous.map(post => post.id))
        return [
          ...previous,
          ...data.posts.filter(post => {
            if (seen.has(post.id)) return false
            seen.add(post.id)
            return true
          })
        ]
      })
      setNextPage(nextPage + 1)
      setRemoteHasMore(data.hasMore)
    } catch (err) {
      if (!controller.signal.aborted) setError(true)
    } finally {
      if (request.current === controller) {
        request.current = null
        busy.current = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
  }, [
    hasMore,
    remote,
    pageSize,
    initialPosts.length,
    nextPage,
    filters,
    basePath
  ])

  useEffect(() => {
    if (remote && initialPage === 0 && nextPage === 1) void loadMore()
  }, [remote, initialPage, nextPage, loadMore])

  useEffect(() => {
    if (
      !hasMore ||
      loading ||
      error ||
      !target.current ||
      typeof IntersectionObserver === 'undefined'
    )
      return
    let active = true
    const observer = new IntersectionObserver(
      entries => {
        if (active && entries.some(entry => entry.isIntersecting))
          void loadMore()
      },
      { rootMargin: '200px 0px' }
    )
    observer.observe(target.current)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [hasMore, loading, error, loadMore, visibleCount])

  if (postsToShow.length === 0 && !hasMore) {
    return <BlogPostListEmpty currentSearch={currentSearch} />
  }

  return (
    <div id='posts-wrapper' className='w-full' aria-busy={loading}>
      {postsToShow.map((post, index) => (
        <BlogPostCard
          key={post.id}
          post={post}
          priority={index === 0}
          searchKeyword={searchKeyword}
        />
      ))}
      <div className='medium-load-more' ref={target}>
        {error && <p role='alert'>加载失败，请重试。</p>}
        {hasMore ? (
          <button
            type='button'
            onClick={() => {
              void loadMore()
            }}
            disabled={loading}
          >
            {loading ? '正在加载…' : error ? '重试' : locale.COMMON.MORE}
          </button>
        ) : (
          <p role='status'>{locale.COMMON.NO_MORE}</p>
        )}
      </div>
    </div>
  )
}

export default BlogPostListScroll
