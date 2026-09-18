/** @jest-environment node */
import {
  combineFilters,
  dataSourceQuery,
  normalizeQuery
} from '@/lib/notion/database/model'
import {
  createDatabaseService,
  decodeCursor,
  encodeCursor,
  loadPublicDatabase
} from '@/lib/notion/database/server'
import { hydrateDatabaseMetadata } from '@/lib/notion/database/hydrateMetadata'
import { prunePageScope } from '@/lib/notion/database/pageScope'

jest.mock('notion-client', () => ({ NotionAPI: jest.fn(() => ({})) }))
jest.mock('@/blog.config', () => ({
  NOTION_PAGE_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
}))
const blockId = '11111111-1111-1111-1111-111111111111'
const viewId = '22222222-2222-2222-2222-222222222222'
const sourceId = '33333333-3333-3333-3333-333333333333'
const queryId = '44444444-4444-4444-4444-444444444444'
const rootId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const schema = {
  title: { name: '名称', type: 'title' },
  n: { name: '数值', type: 'number' },
  s: { name: '类型', type: 'select' },
  tags: { name: '标签', type: 'multi_select' },
  check: { name: '启用', type: 'checkbox' }
}
const metadata = {
  block: { id: blockId, view_ids: [viewId] },
  collection: { id: sourceId, schema },
  views: {}
}
const rowId = i => `${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`
const row = id => ({
  value: {
    value: {
      id,
      type: 'page',
      parent_id: sourceId,
      parent_table: 'collection',
      properties: { title: [['条目']] },
      content: ['secret-body'],
      format: { page_cover: 'https://example.com/cover.png' }
    },
    role: 'reader'
  }
})
const client = () => ({
  getBlocks: jest.fn(async ids => ({
    recordMap: { block: Object.fromEntries(ids.map(id => [id, row(id)])) }
  }))
})
const service = (request, c = client()) =>
  createDatabaseService({
    request,
    client: c,
    loadMetadata: async () => metadata,
    token: () => 'test-token',
    memo: (_, load) => load()
  })
const input = { blockId, viewId }

describe('database queries', () => {
  it('preserves nested saved rules and quick filters before applying visitor conditions', () => {
    const saved = {
      or: [
        { property: '类型', select: { equals: 'A' } },
        { property: '类型', select: { equals: 'B' } }
      ]
    }
    const view = {
      filter: saved,
      quick_filters: { 启用: { checkbox: { equals: true } } },
      sorts: [{ property: '名称', direction: 'ascending' }]
    }
    const query = normalizeQuery(
      {
        viewId,
        search: '测试',
        filters: [{ property: 'n', operator: 'greater_than', value: '10' }]
      },
      schema,
      [viewId]
    )
    const before = JSON.stringify(view)
    expect(dataSourceQuery(view, query, schema)).toEqual({
      filter: {
        and: [
          saved,
          { property: '启用', checkbox: { equals: true } },
          { property: '数值', number: { greater_than: 10 } },
          { property: '名称', title: { contains: '测试' } }
        ]
      },
      sorts: view.sorts
    })
    expect(JSON.stringify(view)).toBe(before)
  })

  it.each([
    { filters: [{ property: 'n', operator: 'contains', value: '1' }] },
    { filters: [{ property: 'n', operator: 'equals', value: '' }] },
    { filters: [{ property: 'missing', operator: 'equals', value: 'x' }] },
    { filters: [{ property: 'check', operator: 'equals', value: 'yes' }] },
    { sorts: [{ property: 'n', direction: 'wrong' }] },
    { search: 'x'.repeat(201) },
    { viewId: sourceId }
  ])(
    'rejects malformed conditions without upstream requests: %j',
    async patch => {
      const request = jest.fn()
      await expect(
        service(request)({ ...input, ...patch })
      ).rejects.toMatchObject({ status: 400 })
      expect(request).not.toHaveBeenCalled()
    }
  )

  it('paginates all 1576 rows in bounded batches without re-reading earlier rows or their bodies', async () => {
    const c = client()
    const request = jest.fn(async (path, body) => {
      const start = path.includes('?')
        ? Number(
            new URL(`https://example.com/${path}`).searchParams.get(
              'start_cursor'
            )
          )
        : 0
      expect(body?.page_size || 30).toBe(30)
      const end = Math.min(1576, start + 30)
      return {
        id: queryId,
        results: Array.from({ length: end - start }, (_, i) => ({
          object: 'page',
          id: rowId(start + i)
        })),
        has_more: end < 1576,
        next_cursor: end < 1576 ? String(end) : null,
        total_count: 1576
      }
    })
    const query = service(request, c)
    let cursor
    const ids = []
    do {
      const response = await query({ ...input, cursor })
      expect(response.blockIds.length).toBeLessThanOrEqual(30)
      expect(JSON.stringify(response)).not.toContain('secret-body')
      ids.push(...response.blockIds)
      cursor = response.nextCursor
    } while (cursor)
    expect(new Set(ids).size).toBe(1576)
    expect(ids).toHaveLength(1576)
    expect(c.getBlocks).toHaveBeenCalledTimes(53)
    expect(request).toHaveBeenCalledTimes(53)
  })

  it('binds signed cursors to their database, view and conditions and rejects tampering/expiration', () => {
    const data = {
      fingerprint: 'one',
      expires: Date.now() + 1000,
      next: 'next'
    }
    const token = encodeCursor(data, 'secret')
    expect(decodeCursor(token, 'secret', 'one')).toEqual(data)
    expect(() => decodeCursor(token, 'secret', 'two')).toThrow('Query changed')
    expect(() => decodeCursor(`${token}x`, 'secret', 'one')).toThrow(
      'Invalid cursor'
    )
    expect(() =>
      decodeCursor(
        encodeCursor({ ...data, expires: 1 }, 'secret'),
        'secret',
        'one'
      )
    ).toThrow('Query expired')
  })

  it('keeps visitor rules ephemeral and uses source pagination, without editing any saved view', async () => {
    const view = {
      data_source_id: sourceId,
      filter: { property: '类型', select: { equals: 'A' } },
      sorts: []
    }
    const request = jest.fn(async path =>
      path === `views/${viewId}`
        ? view
        : { results: [{ object: 'page', id: rowId(1) }], has_more: false }
    )
    await service(request)({
      ...input,
      search: 'x',
      sorts: [{ property: 'n', direction: 'descending' }]
    })
    expect(request).toHaveBeenLastCalledWith(
      `data_sources/${sourceId}/query`,
      expect.objectContaining({
        page_size: 30,
        sorts: [{ property: '数值', direction: 'descending' }],
        filter: {
          and: [view.filter, { property: '名称', title: { contains: 'x' } }]
        }
      }),
      'test-token'
    )
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('never returns inaccessible rows or unrelated records from the hydration response', async () => {
    const c = {
      getBlocks: jest.fn(async () => ({
        recordMap: {
          block: { [rowId(1)]: { role: 'none' }, [rowId(99)]: row(rowId(99)) }
        }
      }))
    }
    const request = jest.fn(async () => ({
      id: queryId,
      results: [{ object: 'page', id: rowId(1) }],
      has_more: false
    }))
    expect((await service(request, c)(input)).recordMap.block).toEqual({})
  })

  it('returns a recoverable expiration error and rejects a non-advancing page', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        id: queryId,
        results: [],
        has_more: true,
        next_cursor: 'next'
      })
      .mockRejectedValueOnce({ status: 404 })
    const query = service(request)
    const first = await query(input)
    await expect(
      query({ ...input, cursor: first.nextCursor })
    ).rejects.toMatchObject({ code: 'CURSOR_EXPIRED', status: 410 })
    const broken = service(async () => ({
      id: queryId,
      results: [],
      has_more: true,
      next_cursor: null
    }))
    await expect(broken(input)).rejects.toMatchObject({ status: 502 })
  })
})

describe('public scope', () => {
  it('follows collection parents using the right record table and rejects unrelated databases', async () => {
    const parentCollection = '55555555-5555-5555-5555-555555555555'
    const c = {
      getPageRaw: jest.fn(async () => ({
        recordMap: {
          block: {
            [blockId]: {
              value: {
                id: blockId,
                type: 'collection_view',
                collection_id: sourceId,
                view_ids: [viewId],
                parent_id: parentCollection,
                parent_table: 'collection'
              }
            }
          },
          collection: { [sourceId]: { value: { id: sourceId, schema } } },
          collection_view: {
            [viewId]: { value: { id: viewId, type: 'table' } }
          }
        }
      })),
      fetch: jest.fn(async () => ({
        recordMap: {
          collection: {
            [parentCollection]: {
              value: {
                id: parentCollection,
                parent_id: rootId,
                parent_table: 'block'
              }
            }
          }
        }
      }))
    }
    expect((await loadPublicDatabase(blockId, c)).collection.id).toBe(sourceId)
    expect(c.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          requests: [{ table: 'collection', id: parentCollection, version: -1 }]
        }
      })
    )
    c.fetch.mockResolvedValue({ recordMap: {} })
    await expect(loadPublicDatabase(blockId, c)).rejects.toMatchObject({
      status: 404
    })
  })

  it('keeps directory links and inline metadata but excludes rows, child bodies and unrelated views', () => {
    const block = {
      root: {
        value: { id: 'root', type: 'page', content: ['db', 'inline', 'child'] }
      },
      db: {
        value: {
          id: 'db',
          type: 'collection_view_page',
          collection_id: 'collection',
          view_ids: ['view'],
          content: ['row']
        }
      },
      inline: {
        value: {
          id: 'inline',
          type: 'collection_view',
          collection_id: 'collection',
          view_ids: ['view']
        }
      },
      child: { value: { id: 'child', type: 'page', content: ['body'] } },
      row: { value: { id: 'row', type: 'page' } },
      body: { value: { id: 'body', type: 'text' } }
    }
    const original = {
      block,
      collection: { collection: {}, unrelated: {} },
      collection_view: { view: {}, other: {} },
      collection_query: { collection: { view: { blockIds: ['row'] } } }
    }
    const pruned = prunePageScope(original, 'root')
    expect(Object.keys(pruned.block).sort()).toEqual([
      'child',
      'db',
      'inline',
      'root'
    ])
    expect(pruned.collection_query).toEqual({})
    expect(Object.keys(pruned.collection_view)).toEqual(['view'])
    expect(Object.keys(original.block)).toHaveLength(6)
  })
})

it('combines OR-of-AND saved rules with visitor conditions within two query levels', () => {
  const a = { property: 'a', checkbox: { equals: true } }
  const b = { property: 'b', checkbox: { equals: true } }
  const c = { property: 'c', checkbox: { equals: true } }
  expect(combineFilters([{ or: [{ and: [a, b] }, a] }, c])).toEqual({
    or: [{ and: [a, b, c] }, { and: [a, c] }]
  })
})

it('hydrates missing view and collection metadata without loading database rows', async () => {
  const map = {
    block: {
      db: { value: { id: 'db', type: 'collection_view', view_ids: [viewId] } }
    }
  }
  const fetchRecords = jest
    .fn()
    .mockResolvedValueOnce({
      recordMap: {
        collection_view: {
          [viewId]: {
            value: {
              id: viewId,
              format: { collection_pointer: { id: sourceId } }
            }
          }
        }
      }
    })
    .mockResolvedValueOnce({
      recordMap: {
        collection: { [sourceId]: { value: { id: sourceId, schema } } }
      }
    })
  await hydrateDatabaseMetadata(map, fetchRecords)
  expect(fetchRecords).toHaveBeenNthCalledWith(1, [
    { id: viewId, table: 'collection_view', version: -1 }
  ])
  expect(fetchRecords).toHaveBeenNthCalledWith(2, [
    { id: sourceId, table: 'collection', version: -1 }
  ])
  expect(Object.keys(map.block)).toEqual(['db'])
})
