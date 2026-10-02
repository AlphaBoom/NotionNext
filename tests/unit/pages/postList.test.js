import handler from '@/pages/api/post-list'
import { prepareInitialPostList } from '@/lib/postList'
import { cleanPostSummary, fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { searchPosts } from '@/lib/search/searchPosts'
import { getStaticProps as categoryList } from '@/pages/category/[category]/index'
import { getStaticProps as tagList } from '@/pages/tag/[tag]/index'
import { getStaticProps as categoryPage } from '@/pages/category/[category]/page/[page]'

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    THEME: 'medium',
    LANG: 'zh-CN',
    NOTION_PAGE_ID: 'site,en-US:english'
  }
}))
jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, config = {}) =>
    config[key] ??
    {
      THEME: 'medium',
      POST_LIST_STYLE: 'page',
      POSTS_PER_PAGE: 2,
      NEXT_REVALIDATE_SECOND: 600
    }[key] ??
    fallback
}))
jest.mock('@/lib/db/SiteDataApi', () => ({
  cleanPostSummary: jest.fn(),
  fetchGlobalAllData: jest.fn()
}))
jest.mock('@/lib/search/searchPosts', () => ({ searchPosts: jest.fn() }))
jest.mock('@/themes/theme', () => ({ DynamicLayout: () => null }))

const post = (id, extra = {}) => ({
  id,
  title: `文章 ${id}`,
  type: 'Post',
  status: 'Published',
  category: '游戏',
  tags: ['JRPG'],
  ...extra
})
const response = () => {
  const res = { setHeader: jest.fn(), json: jest.fn() }
  res.status = jest.fn(() => res)
  return res
}

beforeEach(() => {
  fetchGlobalAllData.mockResolvedValue({
    allPages: [
      post('1'),
      post('2'),
      post('3'),
      post('draft', { status: 'Draft' }),
      post('page', { type: 'Page' })
    ],
    NOTION_CONFIG: {}
  })
  cleanPostSummary.mockImplementation(({ blockMap, ...summary }) => summary)
})

test('only the Medium runtime scroll mode uses remote pages; pagination and export remain compatible', () => {
  const make = config => ({
    posts: [post('1'), post('2'), post('3')],
    NOTION_CONFIG: config
  })
  const paged = make({ POST_LIST_STYLE: 'scroll' })
  prepareInitialPostList(paged)
  expect(paged.posts).toHaveLength(2)
  expect(paged.postListPaged).toBe(true)
  const normal = make({})
  prepareInitialPostList(normal)
  expect(normal.posts).toHaveLength(2)
  expect(normal.postListPaged).toBeUndefined()
  const other = make({ POST_LIST_STYLE: 'scroll', THEME: 'hexo' })
  prepareInitialPostList(other)
  expect(other.posts).toHaveLength(3)
  const saved = process.env.EXPORT
  try {
    process.env.EXPORT = 'true'
    const exported = make({ POST_LIST_STYLE: 'scroll' })
    prepareInitialPostList(exported)
    expect(exported.posts).toHaveLength(3)
    expect(exported.postListPaged).toBeUndefined()
  } finally {
    if (saved === undefined) delete process.env.EXPORT
    else process.env.EXPORT = saved
  }
})

test('the API preserves article order/counts and returns just the requested page of public summaries', async () => {
  fetchGlobalAllData.mockResolvedValue({
    allPages: [
      post('1'),
      post('2'),
      post('3', { password: 'secret', ext: { private: true }, blockMap: {} })
    ],
    NOTION_CONFIG: {}
  })
  const res = response()
  await handler(
    {
      method: 'GET',
      query: { page: '2', locale: 'en-US', category: '游戏', tag: 'JRPG' }
    },
    res
  )
  expect(fetchGlobalAllData).toHaveBeenCalledWith({
    from: 'post-list-api',
    locale: 'en-US'
  })
  expect(res.status).toHaveBeenCalledWith(200)
  const payload = res.json.mock.calls[0][0]
  expect(payload).toMatchObject({ page: 2, postCount: 3, hasMore: false })
  expect(payload.posts.map(p => p.id)).toEqual(['3'])
  expect(payload.posts[0]).not.toHaveProperty('password')
  expect(payload.posts[0]).not.toHaveProperty('ext')
  expect(payload.posts[0]).not.toHaveProperty('blockMap')
  expect(res.setHeader).toHaveBeenCalledWith(
    'Cache-Control',
    'public, s-maxage=600, stale-while-revalidate=600'
  )
})

test('category/tag routes send one initial batch with the complete count, and later category pages retain the locale', async () => {
  fetchGlobalAllData.mockImplementation(() =>
    Promise.resolve({
      allPages: [post('1'), post('2'), post('3')],
      NOTION_CONFIG: { POST_LIST_STYLE: 'scroll' }
    })
  )
  const category = await categoryList({
    params: { category: '游戏' },
    locale: 'en-US'
  })
  const tag = await tagList({ params: { tag: 'JRPG' }, locale: 'en-US' })
  for (const result of [category, tag]) {
    expect(result.props.posts.map(p => p.id)).toEqual(['1', '2'])
    expect(result.props.postCount).toBe(3)
    expect(result.props.postListPaged).toBe(true)
    expect(result.props.allPages).toBeUndefined()
  }
  const second = await categoryPage({
    params: { category: '游戏', page: '2' },
    locale: 'en-US'
  })
  expect(second.props.posts.map(p => p.id)).toEqual(['3'])
  expect(fetchGlobalAllData).toHaveBeenLastCalledWith({
    from: 'category-page-props',
    locale: 'en-US'
  })
})

test('legacy runtime themes can request the complete filtered summary list while Medium still gets one batch', async () => {
  const posts = Array.from({ length: 30 }, (_, index) =>
    post(String(index + 1), { password: 'secret', ext: {}, blockMap: {} })
  )
  fetchGlobalAllData.mockResolvedValue({
    allPages: [
      ...posts,
      post('other', { category: '其他' }),
      post('draft', { status: 'Draft' })
    ],
    NOTION_CONFIG: { POSTS_PER_PAGE: 12 }
  })
  const query = { category: '游戏', tag: 'JRPG' }
  const paged = response()
  await handler({ method: 'GET', query }, paged)
  expect(paged.json.mock.calls[0][0].posts).toHaveLength(12)
  const full = response()
  await handler({ method: 'GET', query: { ...query, all: 'true' } }, full)
  const payload = full.json.mock.calls[0][0]
  expect(payload).toMatchObject({ postCount: 30, hasMore: false })
  expect(payload.posts.map(p => p.id)).toEqual(posts.map(p => p.id))
  for (const summary of payload.posts) {
    expect(summary).not.toHaveProperty('password')
    expect(summary).not.toHaveProperty('ext')
    expect(summary).not.toHaveProperty('blockMap')
  }
})

test('metadata filtering covers all published posts before slicing, and full search retains excerpts', async () => {
  const local = response()
  await handler({ method: 'GET', query: { metadataKeyword: '3' } }, local)
  expect(local.json.mock.calls[0][0].posts.map(p => p.id)).toEqual(['3'])
  searchPosts.mockResolvedValue([post('3', { searchExcerpt: 'body match' })])
  const full = response()
  await handler({ method: 'GET', query: { keyword: 'body' } }, full)
  expect(searchPosts.mock.calls[0][0].map(p => p.id)).toEqual(['1', '2', '3'])
  expect(full.json.mock.calls[0][0].posts[0].searchExcerpt).toBe('body match')
})

test.each([
  { page: '0' },
  { page: '-1' },
  { page: '2.5' },
  { page: ['1', '2'] },
  { all: ['true', 'true'] },
  { all: 'invalid' },
  { locale: 'unknown' },
  { tag: ['JRPG', 'other'] }
])('rejects invalid parameters without fetching data: %j', async query => {
  const res = response()
  await handler({ method: 'GET', query }, res)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(fetchGlobalAllData).not.toHaveBeenCalled()
})
