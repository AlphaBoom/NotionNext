import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import BlogPostListScroll from '@/themes/medium/components/BlogPostListScroll'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/config', () => ({ siteConfig: () => 2 }))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    NOTION_CONFIG: {},
    locale: { COMMON: { MORE: '加载更多', NO_MORE: '没有更多了' } }
  })
}))
jest.mock('@/themes/medium/components/BlogPostCard', () => ({ post }) => (
  <article>{post.title}</article>
))
jest.mock('@/themes/medium/components/BlogPostListEmpty', () => () => (
  <p>没有文章</p>
))

const post = id => ({ id, title: `文章 ${id}` })
const reply = (posts, page = 2, hasMore = false) => ({
  ok: true,
  json: async () => ({ posts, page, hasMore })
})
let router, observers
const intersect = () => observers.at(-1).callback([{ isIntersecting: true }])

beforeEach(() => {
  router = { asPath: '/', query: {}, locale: 'zh-CN', basePath: '' }
  useRouter.mockReturnValue(router)
  observers = []
  global.IntersectionObserver = jest.fn(callback => {
    const observer = { callback, observe: jest.fn(), disconnect: jest.fn() }
    observers.push(observer)
    return observer
  })
  global.fetch = jest.fn()
})

afterEach(() => {
  delete global.fetch
})

test('local results append one batch and reset when the search changes', () => {
  const posts = [post('1'), post('2'), post('3'), post('4'), post('5')]
  const view = render(<BlogPostListScroll posts={posts} searchClientSide />)
  expect(screen.getAllByRole('article')).toHaveLength(2)
  act(() => {
    intersect()
    intersect()
  })
  expect(screen.getAllByRole('article')).toHaveLength(4)
  router.asPath = '/search?s=5'
  router.query.s = '5'
  view.rerender(<BlogPostListScroll posts={posts} searchClientSide />)
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByText('文章 5')).toBeTruthy()
  expect(global.fetch).not.toHaveBeenCalled()
})

test('remote loading deduplicates concurrent triggers and appends without duplicate cards', async () => {
  let finish
  global.fetch.mockReturnValue(
    new Promise(resolve => {
      finish = resolve
    })
  )
  render(
    <BlogPostListScroll
      posts={[post('1'), post('2')]}
      postCount={4}
      postListPaged
      tag='C++ / 游戏'
    />
  )
  expect(global.fetch).not.toHaveBeenCalled()
  act(() => {
    intersect()
    intersect()
  })
  expect(global.fetch).toHaveBeenCalledTimes(1)
  const params = new URL(global.fetch.mock.calls[0][0], 'https://test.com')
    .searchParams
  expect(params.get('page')).toBe('2')
  expect(params.get('tag')).toBe('C++ / 游戏')
  expect(params.get('locale')).toBe('zh-CN')
  await act(async () => finish(reply([post('2'), post('3'), post('4')])))
  expect(screen.getAllByRole('article')).toHaveLength(4)
  expect(screen.getByRole('status')).toHaveTextContent('没有更多了')
  expect(screen.queryByRole('button')).toBeNull()
})

test('a failed request keeps the articles and retries the same page on demand', async () => {
  global.fetch
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(reply([post('3')]))
  render(
    <BlogPostListScroll
      posts={[post('1'), post('2')]}
      postCount={3}
      postListPaged
    />
  )
  act(intersect)
  await screen.findByRole('alert')
  expect(screen.getAllByRole('article')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3))
  expect(
    global.fetch.mock.calls.map(([url]) =>
      new URL(url, 'https://test.com').searchParams.get('page')
    )
  ).toEqual(['2', '2'])
})

test('switching routes aborts the old request and ignores a late response', async () => {
  let finish
  global.fetch.mockReturnValue(
    new Promise(resolve => {
      finish = resolve
    })
  )
  const view = render(
    <BlogPostListScroll
      posts={[post('1'), post('2')]}
      postCount={4}
      postListPaged
    />
  )
  act(intersect)
  const signal = global.fetch.mock.calls[0][1].signal
  router.asPath = '/category/new'
  view.rerender(
    <BlogPostListScroll
      posts={[post('new')]}
      postCount={1}
      postListPaged
      category='new'
    />
  )
  expect(signal.aborted).toBe(true)
  await act(async () => finish(reply([post('old')])))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.queryByText('文章 old')).toBeNull()
  expect(observers[0].disconnect).toHaveBeenCalled()
})

test('legacy metadata queries search beyond the initial remote page', async () => {
  router.asPath = '/?s=old'
  router.query.s = 'old'
  global.fetch.mockResolvedValue(reply([post('old')], 1))
  render(
    <BlogPostListScroll
      posts={[post('1'), post('2')]}
      postCount={30}
      postListPaged
    />
  )
  await screen.findByText('文章 old')
  const params = new URL(global.fetch.mock.calls[0][0], 'https://test.com')
    .searchParams
  expect(params.get('metadataKeyword')).toBe('old')
  expect(params.get('page')).toBe('1')
  expect(screen.queryByText('文章 1')).toBeNull()
})

test('a browser without IntersectionObserver still supports the load-more button', async () => {
  delete global.IntersectionObserver
  global.fetch.mockResolvedValue(reply([post('3')]))
  render(
    <BlogPostListScroll
      posts={[post('1'), post('2')]}
      postCount={3}
      postListPaged
    />
  )
  fireEvent.click(screen.getByRole('button', { name: '加载更多' }))
  await screen.findByText('文章 3')
})
