import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/router'
import SearchInput from '@/themes/medium/components/SearchInput'
import SearchPage from '@/themes/medium/components/SearchPage'
import SearchHighlight from '@/themes/medium/components/SearchHighlight'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/config', () => ({ siteConfig: () => 'page' }))
jest.mock('@/themes/medium/components/BlogPostListPage', () => props => (
  <div data-testid='posts'>
    {props.posts.map(post => (
      <article key={post.id}>{post.title}</article>
    ))}
  </div>
))
jest.mock('@/themes/medium/components/BlogPostListScroll', () => props => (
  <div data-testid='scroll-posts'>
    {props.posts.map(post => (
      <article key={post.id}>{post.title}</article>
    ))}
  </div>
))
jest.mock('@/themes/medium/components/TagGroups', () => () => <p>标签推荐</p>)
jest.mock('@/themes/medium/components/CategoryGroup', () => () => (
  <p>分类推荐</p>
))
let router
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const submit = value => {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } })
  fireEvent.submit(screen.getByRole('search'))
}
beforeEach(() => {
  router = {
    query: {},
    isFallback: false,
    push: jest.fn(() => Promise.resolve(true))
  }
  useRouter.mockReturnValue(router)
})

test.each(['', '   ', '　 '])(
  'empty input stays on the page and focuses the input: %s',
  value => {
    render(<SearchInput />)
    submit(value)
    expect(router.push).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('请输入关键词')
    expect(document.activeElement).toBe(screen.getByRole('searchbox'))
  }
)

test('trims and safely encodes punctuation as one keyword, with immediate loading feedback', async () => {
  const navigation = deferred()
  router.push.mockReturnValue(navigation.promise)
  render(<SearchPage posts={[]} />)
  submit('  C++ / #?&  ')
  expect(router.push).toHaveBeenCalledWith('/search/C%2B%2B%20%2F%20%23%3F%26')
  expect(screen.getByRole('button', { name: '搜索中…' }).disabled).toBe(true)
  expect(screen.getByRole('status').textContent).toContain(
    '正在搜索「C++ / #?&」'
  )
  expect(
    screen.getByRole('region', { name: '搜索结果' }).getAttribute('aria-busy')
  ).toBe('true')
  expect(screen.queryByText('没有找到相关文章')).toBeNull()
  fireEvent.submit(screen.getByRole('search'))
  expect(router.push).toHaveBeenCalledTimes(1)
  await act(async () => navigation.resolve(true))
  expect(
    screen.getByRole('button', { name: '搜索', exact: true }).disabled
  ).toBe(false)
})

test('IME confirmation does not submit, and clear/Escape update the controlled field', async () => {
  render(<SearchInput currentSearch='旧关键词' />)
  const field = screen.getByRole('searchbox')
  fireEvent.compositionStart(field)
  fireEvent.change(field, { target: { value: '日语' } })
  expect(
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229, isComposing: true })
  ).toBe(false)
  fireEvent.submit(screen.getByRole('search'))
  expect(router.push).not.toHaveBeenCalled()
  fireEvent.compositionEnd(field)
  await act(async () => fireEvent.submit(screen.getByRole('search')))
  expect(router.push).toHaveBeenCalledWith('/search/%E6%97%A5%E8%AF%AD')
  fireEvent.keyDown(field, { key: 'Escape' })
  expect(field.value).toBe('')
  expect(screen.queryByRole('button', { name: '清空搜索关键词' })).toBeNull()
  fireEvent.change(field, { target: { value: 'test' } })
  fireEvent.click(screen.getByRole('button', { name: '清空搜索关键词' }))
  expect(field.value).toBe('')
  expect(document.activeElement).toBe(field)
})

test('request errors give a retryable message without losing the keyword', async () => {
  router.push.mockRejectedValueOnce(Error('offline'))
  render(<SearchInput />)
  await act(async () => submit('Notion'))
  expect(screen.getByRole('alert').textContent).toContain('请重新搜索')
  expect(screen.getByRole('searchbox').value).toBe('Notion')
  await act(async () => fireEvent.submit(screen.getByRole('search')))
  expect(router.push).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).toBeNull()
})

test('a newer search owns the feedback even if an older navigation is cancelled', async () => {
  const old = deferred(),
    next = deferred()
  router.push.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
  render(<SearchPage posts={[]} />)
  submit('first')
  submit('second')
  await act(async () => old.reject({ cancelled: true }))
  expect(screen.getByRole('status').textContent).toContain('second')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByRole('button', { name: '搜索中…' }).disabled).toBe(true)
  await act(async () => next.resolve(true))
  expect(
    screen.getByRole('button', { name: '搜索', exact: true }).disabled
  ).toBe(false)
})

test('new route props and browser history synchronize the field and result count', () => {
  const page = render(
    <SearchPage
      keyword='Codex'
      posts={[{ id: '1', title: 'Codex article' }]}
      postCount={1}
    />
  )
  expect(screen.getByRole('status').textContent).toBe(
    '「Codex」的搜索结果 1 篇'
  )
  page.rerender(<SearchPage keyword='找不到' posts={[]} postCount={0} />)
  expect(screen.getByRole('searchbox').value).toBe('找不到')
  expect(screen.getByRole('heading', { name: '没有找到相关文章' })).toBeTruthy()
  expect(screen.queryByTestId('posts')).toBeNull()
  page.rerender(<SearchPage posts={[]} />)
  expect(screen.getByRole('searchbox').value).toBe('')
  expect(screen.getByText('标签推荐')).toBeTruthy()
})

test('legacy query searches use local result pagination', () => {
  router.query = { s: 'Codex' }
  render(
    <SearchPage
      searchClientSide
      posts={[{ id: '1', title: 'Codex article' }]}
      postCount={1}
    />
  )
  expect(screen.getByTestId('scroll-posts')).toBeTruthy()
})

test('a fallback never announces zero results before search data arrives', () => {
  router.query = { keyword: 'Codex' }
  router.isFallback = true
  render(<SearchPage />)
  expect(screen.getByRole('status').textContent).toContain('正在搜索「Codex」')
  expect(screen.queryByText('没有找到相关文章')).toBeNull()
})

test('keyword highlights are literal, case-insensitive React text and update cleanly', () => {
  const page = render(
    <SearchHighlight text={'Codex C++ <script> Codex'} keyword='c++' />
  )
  expect(page.container.querySelector('mark').textContent).toBe('C++')
  expect(page.container.querySelector('script')).toBeNull()
  page.rerender(<SearchHighlight text='Codex C++ Codex' keyword='CODEX' />)
  expect(page.container.querySelectorAll('mark').length).toBe(2)
})
