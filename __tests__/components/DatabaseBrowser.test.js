import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import DatabaseBrowser from '@/components/database/DatabaseBrowser'

jest.mock('react-notion-x', () => ({
  NotionContextProvider: ({ children }) => children
}))
jest.mock('react-notion-x/build/third-party/collection', () => ({
  Property: ({ data }) => <span>{data?.[0]?.[0]}</span>
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, prefetch, children, ...rest }) => (
    <a
      href={href}
      {...rest}
      onClick={event => {
        event.preventDefault()
        rest.onClick?.(event)
      }}
    >
      {children}
    </a>
  )
}))
let mockRouter
jest.mock('next/router', () => ({ useRouter: () => mockRouter }))
const blockId = '11111111-1111-1111-1111-111111111111'
const viewId = '22222222-2222-2222-2222-222222222222'
const otherView = '33333333-3333-3333-3333-333333333333'
const collection = {
  id: 'collection',
  name: [['测试数据库']],
  schema: {
    title: { name: '名称', type: 'title' },
    number: { name: '数值', type: 'number' }
  }
}
const block = {
  id: blockId,
  type: 'collection_view_page',
  collection_id: 'collection',
  view_ids: [viewId, otherView]
}
const ctx = {
  recordMap: {
    block: {},
    collection: { collection: { value: collection } },
    collection_view: {
      [viewId]: { value: { id: viewId, name: '表格', type: 'table' } },
      [otherView]: { value: { id: otherView, name: '画廊', type: 'gallery' } }
    }
  },
  mapPageUrl: id => `/${id}`
}
const result = (ids, more = false) => ({
  blockIds: ids,
  recordMap: {
    block: Object.fromEntries(
      ids.map(id => [
        id,
        {
          value: {
            id,
            type: 'page',
            properties: { title: [[id]], number: [['1']] }
          }
        }
      ])
    )
  },
  hasMore: more,
  nextCursor: more ? 'cursor' : null,
  total: null
})
const response = value => ({ ok: true, json: async () => value })
const deferred = () => {
  let resolve
  const promise = new Promise(r => {
    resolve = r
  })
  return { resolve, promise }
}
const mount = () =>
  render(<DatabaseBrowser block={block} collection={collection} ctx={ctx} />)

beforeEach(() => {
  global.IntersectionObserver = undefined
  sessionStorage.clear()
  mockRouter = {
    isReady: true,
    query: { unique: Math.random() },
    pathname: '/[prefix]',
    events: { on: jest.fn(), off: jest.fn() },
    replace: jest.fn().mockResolvedValue(true)
  }
  window.scrollTo = jest.fn()
  global.fetch = jest.fn()
})

it('requests subsequent pages on demand, deduplicates rows and disables prefetch links', async () => {
  fetch
    .mockResolvedValueOnce(response(result(['row-one'], true)))
    .mockResolvedValueOnce(response(result(['row-one', 'row-two'])))
  mount()
  await screen.findByText('row-one')
  expect(fetch).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '加载更多' }))
  await screen.findByText('row-two')
  expect(screen.getAllByText('row-one')).toHaveLength(1)
  expect(JSON.parse(fetch.mock.calls[1][1].body).cursor).toBe('cursor')
  expect(screen.getByText('已加载 2 条 · 已全部加载')).toBeInTheDocument()
})

it('ignores a late response after a view switch and cancels the old request', async () => {
  // Give this query a distinct ID so another test's in-memory restoration cannot match.
  const localBlock = { ...block, id: 'aaaaaaaa-1111-1111-1111-111111111111' }
  const first = deferred()
  fetch
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce(response(result(['new-view'])))
  render(
    <DatabaseBrowser block={localBlock} collection={collection} ctx={ctx} />
  )
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  const signal = fetch.mock.calls[0][1].signal
  fireEvent.click(screen.getByRole('button', { name: '画廊' }))
  await screen.findByText('new-view')
  await act(async () => first.resolve(response(result(['stale-view']))))
  expect(screen.queryByText('stale-view')).not.toBeInTheDocument()
  expect(signal.aborted).toBe(true)
  expect(mockRouter.replace).toHaveBeenCalledWith(
    expect.objectContaining({
      query: expect.objectContaining({
        [`db_${localBlock.id.replace(/-/g, '')}`]:
          expect.stringContaining(otherView)
      })
    }),
    undefined,
    { shallow: true, scroll: false }
  )
})

it('shows expiration recovery and restarts without the expired cursor', async () => {
  const localBlock = { ...block, id: 'bbbbbbbb-1111-1111-1111-111111111111' }
  fetch
    .mockResolvedValueOnce(response(result(['before'], true)))
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 'CURSOR_EXPIRED' })
    })
    .mockResolvedValueOnce(response(result(['fresh'])))
  render(
    <DatabaseBrowser block={localBlock} collection={collection} ctx={ctx} />
  )
  await screen.findByText('before')
  fireEvent.click(screen.getByRole('button', { name: '加载更多' }))
  fireEvent.click(await screen.findByRole('button', { name: '刷新结果' }))
  await screen.findByText('fresh')
  expect(JSON.parse(fetch.mock.calls[2][1].body).cursor).toBeUndefined()
  expect(screen.queryByText('before')).not.toBeInTheDocument()
})

it('restores loaded pages and position when returning to the same URL without refetching', async () => {
  const localBlock = { ...block, id: 'cccccccc-1111-1111-1111-111111111111' }
  fetch.mockResolvedValueOnce(response(result(['remember-me'])))
  const first = render(
    <DatabaseBrowser block={localBlock} collection={collection} ctx={ctx} />
  )
  await screen.findByText('remember-me')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 450 })
  fireEvent.click(screen.getByRole('link', { name: '打开 remember-me' }))
  first.unmount()
  render(
    <DatabaseBrowser block={localBlock} collection={collection} ctx={ctx} />
  )
  await screen.findByText('remember-me')
  expect(fetch).toHaveBeenCalledTimes(1)
  await waitFor(() =>
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 450,
      behavior: 'instant'
    })
  )
})

it('applies numeric filters before requesting a new first page and handles empty results', async () => {
  const localBlock = { ...block, id: 'dddddddd-1111-1111-1111-111111111111' }
  fetch
    .mockResolvedValueOnce(response(result(['initial'], true)))
    .mockResolvedValueOnce(response(result([])))
  render(
    <DatabaseBrowser block={localBlock} collection={collection} ctx={ctx} />
  )
  await screen.findByText('initial')
  fireEvent.click(screen.getByRole('button', { name: '筛选与排序' }))
  fireEvent.click(screen.getByRole('button', { name: '＋ 添加筛选' }))
  fireEvent.change(screen.getByLabelText('筛选字段 1'), {
    target: { value: 'number' }
  })
  fireEvent.change(screen.getByLabelText('筛选值 1'), {
    target: { value: '8' }
  })
  fireEvent.click(screen.getByRole('button', { name: '应用' }))
  await screen.findByText(/没有符合条件的条目/)
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
    filters: [{ property: 'number', operator: 'equals', value: 8 }]
  })
  expect(JSON.parse(fetch.mock.calls[1][1].body).cursor).toBeUndefined()
})
