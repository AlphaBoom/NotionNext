import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import DatabaseBrowser from '@/components/database/DatabaseBrowser'
import { NotionContextProvider } from 'react-notion-x'

jest.mock('@/blog.config', () => ({
  NOTION_PUBLIC_HOST: 'https://alphaboom.notion.site'
}))
jest.mock('react-notion-x', () => ({
  NotionContextProvider: jest.fn(({ children }) => children)
}))
jest.mock('react-notion-x/build/third-party/collection', () => ({
  Property: ({ data }) => <span>{data?.[0]?.[0]}</span>
}))
const blockId = '11111111-1111-1111-1111-111111111111'
const viewId = '22222222-2222-2222-2222-222222222222'
const collection = {
  id: 'collection',
  name: [['测试数据库']],
  schema: {
    title: { name: '名称', type: 'title' },
    number: { name: '数值', type: 'number' }
  }
}
const view = { id: viewId, type: 'table', name: '默认表格' }
const block = {
  id: blockId,
  type: 'collection_view_page',
  collection_id: 'collection',
  view_ids: [viewId]
}
const ctx = {
  recordMap: {
    block: {},
    collection: { collection: { value: collection } },
    collection_view: { [viewId]: { value: view } }
  },
  mapPageUrl: id => `/${id}`
}
const rowId = i => `${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`
const preview = (count = 100, hasMore = true) => ({
  supported: true,
  collection,
  view,
  hasMore,
  omitted: false,
  blockIds: Array.from({ length: count }, (_, i) => rowId(i)),
  recordMap: {
    block: Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        rowId(i),
        {
          value: {
            id: rowId(i),
            type: 'page',
            properties: {
              title: [[`条目 ${String(i).padStart(3, '0')}`]],
              number: [['42']]
            },
            format: { page_cover: 'https://example.com/cover.png' }
          }
        }
      ])
    )
  }
})
const response = result => ({ ok: true, json: () => Promise.resolve(result) })
const mount = props =>
  render(
    <DatabaseBrowser
      block={block}
      collection={collection}
      ctx={ctx}
      {...props}
    />
  )
beforeEach(() => {
  global.IntersectionObserver = undefined
  global.fetch = jest.fn()
  window.history.replaceState({}, '', '/')
})

it('shows 20 at a time up to 100, while local search and expansion make no further requests', async () => {
  const data = preview()
  data.recordMap.notion_user = {
    alice: { value: { id: 'alice', given_name: 'Alice' } }
  }
  fetch.mockResolvedValueOnce(response(data))
  mount()
  await screen.findByText('已显示 20 / 100 条预览')
  expect(screen.getAllByRole('row')).toHaveLength(21)
  fireEvent.click(screen.getByRole('button', { name: '展开更多预览' }))
  expect(screen.getByText('已显示 40 / 100 条预览')).toBeInTheDocument()
  expect(screen.getAllByText('42')).toHaveLength(40)
  const provider = NotionContextProvider.mock.calls.at(-1)[0]
  expect(provider.recordMap.block[rowId(0)].value.format.page_cover).toBe(
    'https://example.com/cover.png'
  )
  expect(provider.recordMap.notion_user.alice.value.given_name).toBe('Alice')
  expect(provider.mapPageUrl(rowId(0))).toBe(
    'https://alphaboom.notion.site/00000000000000000000000000000000'
  )
  fireEvent.change(screen.getByRole('searchbox', { name: '搜索预览条目' }), {
    target: { value: '条目 095' }
  })
  expect(screen.getByText('条目 095')).toBeInTheDocument()
  expect(screen.getByText('预览中匹配 1 条 · 已显示 1 条')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: '不存在的条目' }
  })
  expect(
    screen.getByText('预览中没有匹配条目，可前往 Notion 搜索完整数据库。')
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '清除搜索' }))
  for (let i = 0; i < 4; i++)
    fireEvent.click(screen.getByRole('button', { name: '展开更多预览' }))
  expect(screen.getAllByRole('row')).toHaveLength(101)
  expect(screen.queryByRole('button', { name: '展开更多预览' })).toBeNull()
  expect(
    screen.getByText('此处展示 100 条预览，更多内容请前往 Notion。')
  ).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(
    `/api/notion-database?blockId=${blockId.replace(/-/g, '')}`,
    expect.objectContaining({ method: 'GET', credentials: 'omit' })
  )
  expect(fetch.mock.calls[0][1].body).toBeUndefined()
  expect(screen.queryByText('筛选与排序')).toBeNull()
  expect(screen.queryByText('默认表格')).toBeNull()
  expect(
    screen.getByRole('link', { name: '在 Notion 中打开 条目 000（新标签页）' })
  ).toHaveAttribute('target', '_blank')
  expect(
    screen.getByRole('link', { name: '在 Notion 中查看完整数据库 ↗' })
  ).toHaveAttribute(
    'href',
    `https://alphaboom.notion.site/${blockId.replace(/-/g, '')}?v=${viewId.replace(/-/g, '')}`
  )
})

it.each([0, 8, 100])(
  'handles an entire small view with %i rows without claiming it is truncated',
  async count => {
    fetch.mockResolvedValueOnce(response(preview(count, false)))
    mount()
    await screen.findByText(`已显示 ${Math.min(count, 20)} / ${count} 条预览`)
    expect(
      screen.queryByRole('link', { name: '在 Notion 中查看完整数据库 ↗' })
    ).toBeNull()
    expect(
      screen.getByRole('link', { name: '在 Notion 中打开 ↗' })
    ).toBeInTheDocument()
    if (!count)
      expect(
        screen.getByText('暂无可显示的预览条目，可前往 Notion 查看。')
      ).toBeInTheDocument()
  }
)

it('keeps the public link visible when the collection heading is hidden and skips unsupported views', () => {
  const local = {
    ...ctx,
    recordMap: {
      ...ctx.recordMap,
      collection_view: { [viewId]: { value: { ...view, type: 'calendar' } } }
    }
  }
  mount({
    block: { ...block, format: { hide_inline_collection_name: true } },
    ctx: local
  })
  expect(
    screen.getByRole('link', { name: '在 Notion 中打开 ↗' })
  ).toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).toBeNull()
  expect(screen.queryByRole('status')).toBeNull()
  expect(fetch).not.toHaveBeenCalled()
})

it('renders a gallery preview with public detail links', async () => {
  const data = preview(1, false)
  data.view = {
    ...view,
    type: 'gallery',
    format: { gallery_cover: { type: 'page_cover' } }
  }
  fetch.mockResolvedValueOnce(response(data))
  mount()
  await screen.findByRole('img', { name: '条目 000' })
  for (const link of screen.getAllByRole('link', {
    name: '在 Notion 中打开 条目 000（新标签页）'
  })) {
    expect(link.href).toBe(
      'https://alphaboom.notion.site/00000000000000000000000000000000'
    )
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
})

it('ignores legacy query URLs instead of re-enabling remote search or view switching', async () => {
  window.history.replaceState(
    {},
    '',
    `/?v=other&db_${blockId.replace(/-/g, '')}=${encodeURIComponent(JSON.stringify({ search: 'remote', cursor: 'forged', viewId: 'other' }))}`
  )
  fetch.mockResolvedValueOnce(response(preview(1, false)))
  mount()
  await screen.findByText('条目 000')
  expect(fetch.mock.calls[0][0]).toBe(
    `/api/notion-database?blockId=${blockId.replace(/-/g, '')}`
  )
  expect(screen.getByRole('searchbox')).toHaveValue('')
})

it('keeps the Notion exit available on failure and retries the same fixed GET', async () => {
  fetch
    .mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ code: 'RATE_LIMITED' })
    })
    .mockResolvedValueOnce(response(preview(1, false)))
  mount()
  await screen.findByRole('alert')
  expect(
    screen.getByRole('link', { name: '在 Notion 中打开 ↗' })
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  await screen.findByText('条目 000')
  expect(fetch.mock.calls[0][0]).toBe(fetch.mock.calls[1][0])
})

it('aborts an old request and ignores its response after switching databases', async () => {
  let resolve
  fetch
    .mockReturnValueOnce(
      new Promise(r => {
        resolve = r
      })
    )
    .mockResolvedValueOnce(response(preview(1, false)))
  const rendered = mount()
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  const signal = fetch.mock.calls[0][1].signal
  rendered.rerender(
    <DatabaseBrowser
      block={{ ...block, id: 'aaaaaaaa-1111-1111-1111-111111111111' }}
      collection={collection}
      ctx={ctx}
    />
  )
  await screen.findByText('已显示 1 / 1 条预览')
  await act(() => {
    resolve(response(preview(100, true)))
    return Promise.resolve()
  })
  expect(signal.aborted).toBe(true)
  expect(screen.getByText('已显示 1 / 1 条预览')).toBeInTheDocument()
  rendered.unmount()
  expect(fetch.mock.calls[1][1].signal.aborted).toBe(true)
})

it('does not fetch an offscreen preview until it nears the viewport', async () => {
  let intersect
  const disconnect = jest.fn()
  global.IntersectionObserver = class {
    constructor(callback) {
      intersect = callback
    }
    observe() {}
    disconnect() {
      disconnect()
    }
  }
  fetch.mockResolvedValueOnce(response(preview(1, false)))
  mount()
  expect(fetch).not.toHaveBeenCalled()
  act(() => intersect([{ isIntersecting: true }]))
  await screen.findByText('条目 000')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(disconnect).toHaveBeenCalled()
})
