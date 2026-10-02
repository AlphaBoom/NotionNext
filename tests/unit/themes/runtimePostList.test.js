import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/router'
import { prepareInitialPostList } from '@/lib/postList'
import { DynamicLayout } from '@/themes/theme'

jest.mock('@/blog.config', () => {
  process.env.NEXT_PUBLIC_AVAILABLE_THEMES = JSON.stringify(['medium', 'hexo'])
  return {
    __esModule: true,
    default: { THEME: 'medium', THEME_SWITCH: false },
    LAYOUT_MAPPINGS: {
      '/': 'LayoutIndex',
      '/page/[page]': 'LayoutPostList',
      '/search/[keyword]': 'LayoutSearch'
    }
  }
})
jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, config = {}) =>
    config[key] ??
    { THEME: 'medium', POST_LIST_STYLE: 'scroll', POSTS_PER_PAGE: 12 }[key] ??
    fallback
}))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    NOTION_CONFIG: { POSTS_PER_PAGE: 12 },
    locale: { COMMON: { MORE: '加载更多', NO_MORE: '没有更多了' } }
  })
}))
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  isBrowser: false
}))
jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: jest.requireActual('next/dynamic').default
}))
jest.mock(
  '@/themes/hexo/components/BlogPostCard',
  () =>
    function PostCard({ post }) {
      return <article>{post.title}</article>
    }
)
jest.mock(
  '@/themes/hexo/components/BlogPostListEmpty',
  () =>
    function EmptyList() {
      return <p>没有文章</p>
    }
)
jest.mock('@/themes/hexo', () => {
  const List = require('@/themes/hexo/components/BlogPostListScroll').default
  return { LayoutIndex: List, LayoutPostList: List, LayoutSearch: List }
})
jest.mock('@/themes/medium', () => ({
  LayoutIndex: () => <p>Medium 列表</p>
}))

const posts = Array.from({ length: 30 }, (_, index) => ({
  id: String(index + 1),
  title: `文章 ${index + 1}`
}))
const initialProps = () => {
  const props = {
    posts,
    postCount: posts.length,
    NOTION_CONFIG: {
      THEME: 'medium',
      THEME_SWITCH: false,
      POST_LIST_STYLE: 'scroll',
      POSTS_PER_PAGE: 12
    }
  }
  prepareInitialPostList(props)
  return props
}
const reply = (items = posts) => ({
  ok: true,
  json: () =>
    Promise.resolve({
      posts: items,
      postCount: items.length,
      hasMore: false
    })
})
let router

beforeEach(() => {
  router = {
    asPath: '/?theme=hexo',
    query: { theme: 'hexo' },
    locale: 'zh-CN',
    basePath: ''
  }
  useRouter.mockReturnValue(router)
  global.fetch = jest.fn().mockResolvedValue(reply())
})

test('a URL theme switch with THEME_SWITCH=false restores all 30 posts for the actual Hexo scroll list', async () => {
  const props = initialProps()
  expect(props.posts).toHaveLength(12)
  render(<DynamicLayout {...props} theme='medium' layoutName='LayoutIndex' />)
  await screen.findByText('加载更多')
  expect(screen.getAllByRole('article')).toHaveLength(12)
  fireEvent.click(screen.getByText('加载更多'))
  expect(screen.getAllByRole('article')).toHaveLength(24)
  fireEvent.click(screen.getByText('加载更多'))
  expect(screen.getAllByRole('article')).toHaveLength(30)
  expect(screen.getByText('没有更多了')).toBeInTheDocument()
  expect(global.fetch).toHaveBeenCalledTimes(1)
  const params = new URL(global.fetch.mock.calls[0][0], 'https://test.com')
    .searchParams
  expect(params.get('all')).toBe('true')
})

test.each([
  ['category', 'C++ / 游戏', 'LayoutPostList'],
  ['tag', '中文 标签', 'LayoutPostList'],
  ['keyword', '正文 / 搜索', 'LayoutSearch']
])(
  'preserves the %s filter, locale and base path when completing a list',
  async (key, value, layoutName) => {
    router.asPath = '/filtered?theme=hexo'
    router.locale = 'en-US'
    router.basePath = '/blog'
    render(
      <DynamicLayout
        {...initialProps()}
        {...{ [key]: value }}
        theme='medium'
        layoutName={layoutName}
      />
    )
    await screen.findByText('加载更多')
    const url = new URL(global.fetch.mock.calls[0][0], 'https://test.com')
    expect(url.pathname).toBe('/blog/api/post-list')
    expect(url.searchParams.get(key)).toBe(value)
    expect(url.searchParams.get('locale')).toBe('en-US')
  }
)

test('Medium, ordinary pagination, client search and static exports do not request a complete list', async () => {
  router.asPath = '/'
  const props = initialProps()
  const view = render(
    <DynamicLayout {...props} theme='medium' layoutName='LayoutIndex' />
  )
  await screen.findByText('Medium 列表')
  router.asPath = '/?theme=hexo'
  view.rerender(
    <DynamicLayout
      {...props}
      postListPaged={false}
      theme='medium'
      layoutName='LayoutIndex'
    />
  )
  await screen.findByText('没有更多了')
  view.rerender(
    <DynamicLayout
      {...props}
      posts={posts}
      searchClientSide
      theme='medium'
      layoutName='LayoutIndex'
    />
  )
  expect(screen.getByText('加载更多')).toBeInTheDocument()
  const saved = process.env.EXPORT
  try {
    process.env.EXPORT = 'true'
    const exported = initialProps()
    view.rerender(
      <DynamicLayout {...exported} theme='medium' layoutName='LayoutIndex' />
    )
    expect(exported.posts).toHaveLength(30)
    expect(exported.postListPaged).toBeUndefined()
    expect(global.fetch).not.toHaveBeenCalled()
  } finally {
    if (saved === undefined) delete process.env.EXPORT
    else process.env.EXPORT = saved
  }
})

test('changing the list aborts its request and ignores a stale response', async () => {
  let finish
  global.fetch.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve
    })
  )
  const view = render(
    <DynamicLayout
      {...initialProps()}
      theme='medium'
      layoutName='LayoutIndex'
    />
  )
  const signal = global.fetch.mock.calls[0][1].signal
  const filtered = [{ id: 'new', title: '新分类文章' }]
  global.fetch.mockResolvedValueOnce(reply(filtered))
  router.asPath = '/category/new?theme=hexo'
  view.rerender(
    <DynamicLayout
      {...initialProps()}
      category='new'
      theme='medium'
      layoutName='LayoutPostList'
    />
  )
  await screen.findByText('新分类文章')
  expect(signal.aborted).toBe(true)
  await act(() => Promise.resolve(finish(reply())))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.queryByText('文章 1')).not.toBeInTheDocument()
})

test('an incomplete response does not strand the legacy list and can be retried', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        posts: posts.slice(0, 12),
        postCount: 30,
        hasMore: true
      })
  })
  render(
    <DynamicLayout
      {...initialProps()}
      theme='medium'
      layoutName='LayoutIndex'
    />
  )
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  await screen.findByText('加载更多')
  expect(global.fetch).toHaveBeenCalledTimes(2)
  expect(global.fetch.mock.calls[1][0]).toBe(global.fetch.mock.calls[0][0])
})
