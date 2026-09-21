import { getDataFromCache } from '@/lib/cache/cache_manager'
import { searchPosts } from '@/lib/search/searchPosts'
import { matchesMetadata } from '@/lib/search/metadata'
import { getStaticProps as firstPage } from '@/pages/search/[keyword]/index'
import { getStaticProps as laterPage } from '@/pages/search/[keyword]/page/[page]'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

jest.mock('@/lib/cache/cache_manager', () => ({ getDataFromCache: jest.fn() }))
jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  getPageBlockCacheKey: id => id
}))
jest.mock('@/lib/db/SiteDataApi', () => ({ fetchGlobalAllData: jest.fn() }))
jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: { THEME: 'medium' }
}))
jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback) =>
    ({
      POSTS_PER_PAGE: 2,
      POST_LIST_STYLE: 'page',
      NEXT_REVALIDATE_SECOND: 60
    })[key] ?? fallback
}))
jest.mock('@/themes/theme', () => ({ DynamicLayout: () => null }))

const post = (id, extra = {}) => ({
  id,
  title: 'Sample',
  summary: '',
  content: [`body-${id}`],
  type: 'Post',
  status: 'Published',
  ...extra
})
const body = (id, text) => ({
  block: {
    [`body-${id}`]: { value: { type: 'text', properties: { title: [[text]] } } }
  }
})
beforeEach(() => getDataFromCache.mockResolvedValue(null))

test('metadata accepts string or array categories and matches case-insensitively', async () => {
  const posts = [
    post('1', { title: 'Codex notes' }),
    post('2', { category: 'CODEX' }),
    post('3', { category: ['Codex'], tags: ['tag'] }),
    post('4', { summary: 'a codeX summary' })
  ]
  expect((await searchPosts(posts, ' codex ')).map(p => p.id)).toEqual([
    '1',
    '2',
    '3',
    '4'
  ])
  expect(getDataFromCache).not.toHaveBeenCalled()
  expect(matchesMetadata(posts[1], 'codex')).toBe(true)
  expect(matchesMetadata(posts[1], ['bad query'])).toBe(false)
})

test('cached body-only matches produce excerpts without mutating source posts', async () => {
  const source = post('1')
  getDataFromCache.mockResolvedValue(body('1', 'before uniqueBODY after'))
  const found = await searchPosts([source], 'uniquebody')
  expect(found).toHaveLength(1)
  expect(found[0].searchExcerpt).toContain('uniqueBODY')
  expect(source.results).toBeUndefined()
  expect(source.searchExcerpt).toBeUndefined()
})

test('password-protected content and missing caches never become body search results', async () => {
  getDataFromCache.mockResolvedValue(body('1', 'private secret'))
  expect(
    await searchPosts([post('1', { password: 'locked' })], 'secret')
  ).toEqual([])
  expect(getDataFromCache).not.toHaveBeenCalled()
  getDataFromCache.mockResolvedValue(null)
  expect(await searchPosts([post('1')], 'missing')).toEqual([])
  expect(await searchPosts([post('1')], '   ')).toEqual([])
})

test('results retain article order while cache requests finish out of order', async () => {
  const finish = {}
  getDataFromCache.mockImplementation(
    id =>
      new Promise(resolve => {
        finish[id] = resolve
      })
  )
  const searching = searchPosts([post('1'), post('2'), post('3')], 'needle')
  finish['3'](body('3', 'needle'))
  finish['1'](body('1', 'needle'))
  finish['2'](body('2', 'needle'))
  expect((await searching).map(p => p.id)).toEqual(['1', '2', '3'])
})

test('first and later search pages share case-insensitive filtering, counts and ordering', async () => {
  const allPages = [
    post('1', { title: 'CODEX' }),
    post('2', { category: 'Codex' }),
    post('3'),
    post('4', { title: 'codex', type: 'Page' }),
    post('5', { title: 'codex', status: 'Draft' })
  ]
  fetchGlobalAllData.mockImplementation(async () => ({
    allPages,
    NOTION_CONFIG: {}
  }))
  getDataFromCache.mockResolvedValue(body('3', 'body-only codeX'))
  const first = await firstPage({ params: { keyword: 'codex' }, locale: 'zh' })
  const second = await laterPage({
    params: { keyword: 'codex', page: '2' },
    locale: 'zh'
  })
  expect(first.props.postCount).toBe(3)
  expect(second.props.postCount).toBe(3)
  expect(first.props.posts.map(p => p.id)).toEqual(['1', '2'])
  expect(second.props.posts.map(p => p.id)).toEqual(['3'])
  expect(first.props.allPages).toBeUndefined()
})
