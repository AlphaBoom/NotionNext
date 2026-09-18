/** @jest-environment node */
import { normalizeQuery, publicViewQuery } from '@/lib/notion/database/model'
import {
  createDatabaseService,
  decodeCursor,
  encodeCursor,
  loadPublicDatabase,
  publicRequest
} from '@/lib/notion/database/server'
import { hydrateDatabaseMetadata } from '@/lib/notion/database/hydrateMetadata'
import { prunePageScope } from '@/lib/notion/database/pageScope'
import { createHash } from 'crypto'

jest.mock('notion-client', () => ({ NotionAPI: jest.fn(() => ({})) }))
jest.mock('@/blog.config', () => ({
  NOTION_PAGE_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
}))
const blockId = '11111111-1111-1111-1111-111111111111'
const viewId = '22222222-2222-2222-2222-222222222222'
const sourceId = '33333333-3333-3333-3333-333333333333'
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
  views: { [viewId]: { id: viewId, type: 'table', query2: {} } }
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
      content: ['unrequested-body'],
      format: { page_cover: 'https://example.com/cover.png' }
    },
    role: 'reader'
  }
})
const publicResult = (count, more, total = count) => {
  const ids = Array.from({ length: count }, (_, i) => rowId(i))
  return {
    result: {
      sizeHint: 99999,
      reducerResults: {
        collection_group_results: {
          type: 'results',
          blockIds: ids,
          hasMore: more
        },
        database_total: {
          type: 'aggregation',
          aggregationResult: { type: 'number', value: total }
        }
      }
    },
    recordMap: { block: Object.fromEntries(ids.map(id => [id, row(id)])) }
  }
}
const service = (request, c = { getBlocks: jest.fn() }) =>
  createDatabaseService({
    request,
    client: c,
    loadMetadata: () => metadata,
    memo: (_, load) => load()
  })
const input = { blockId, viewId }
const digest = value =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

describe('anonymous public database queries', () => {
  it('uses the public numeric equality operators rather than silently matching no rows', () => {
    for (const operator of ['equals', 'does_not_equal']) {
      const query = normalizeQuery(
        {
          viewId,
          filters: [{ property: 'n', operator, value: 13 }]
        },
        schema,
        [viewId]
      )
      expect(publicViewQuery({}, query, schema).filter.filters[0]).toEqual({
        property: 'n',
        filter: {
          operator: `number_${operator}`,
          value: { type: 'exact', value: 13 }
        }
      })
    }
  })

  it('preserves nested saved rules and quick filters while adding native visitor conditions', () => {
    const saved = {
      operator: 'or',
      filters: [
        {
          property: 's',
          filter: { operator: 'enum_is', value: { type: 'exact', value: 'A' } }
        },
        {
          property: 's',
          filter: { operator: 'enum_is', value: { type: 'exact', value: 'B' } }
        }
      ]
    }
    const quick = {
      property: 'check',
      filter: { operator: 'checkbox_is', value: { type: 'exact', value: true } }
    }
    const view = {
      query2: {
        filter: saved,
        sort: [{ property: 'title', direction: 'ascending' }]
      },
      format: { property_filters: [{ filter: quick }] }
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
    expect(publicViewQuery(view, query, schema)).toEqual({
      filter: {
        operator: 'and',
        filters: [
          saved,
          quick,
          {
            property: 'n',
            filter: {
              operator: 'number_greater_than',
              value: { type: 'exact', value: 10 }
            }
          }
        ]
      },
      sort: view.query2.sort,
      searchQuery: '测试'
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
  ])('rejects malformed conditions before querying Notion: %j', async patch => {
    const request = jest.fn()
    await expect(
      service(request)({ ...input, ...patch })
    ).rejects.toMatchObject({ status: 400 })
    expect(request).not.toHaveBeenCalled()
  })

  it('extends the public prefix on demand past 999 and returns only 30 new rows without bodies', async () => {
    const c = { getBlocks: jest.fn() }
    const request = jest.fn(body => {
      const limit = body.loader.reducers.collection_group_results.limit
      return publicResult(Math.min(1576, limit), limit < 1576, 1576)
    })
    const query = service(request, c)
    let cursor
    const ids = []
    do {
      const response = await query({ ...input, cursor })
      expect(response.blockIds.length).toBeLessThanOrEqual(30)
      expect(JSON.stringify(response)).not.toContain('unrequested-body')
      ids.push(...response.blockIds)
      cursor = response.nextCursor
    } while (cursor)
    expect(new Set(ids).size).toBe(1576)
    expect(ids).toHaveLength(1576)
    expect(request).toHaveBeenCalledTimes(53)
    expect(
      request.mock.calls.map(
        ([body]) => body.loader.reducers.collection_group_results.limit
      )
    ).toEqual(Array.from({ length: 53 }, (_, i) => (i + 1) * 30))
    expect(c.getBlocks).not.toHaveBeenCalled()
  })

  it('bounds continuation hints and binds them to query and expiry without any secret', () => {
    const data = {
      fingerprint: 'one',
      offset: 30,
      prefix: digest(['row']),
      expires: Date.now() + 1000
    }
    expect(decodeCursor(encodeCursor(data), 'one')).toEqual(data)
    expect(() => decodeCursor(encodeCursor(data), 'two')).toThrow(
      'Query changed'
    )
    for (const offset of [-30, 0, 15, 31, 10000, 999999])
      expect(() =>
        decodeCursor(encodeCursor({ ...data, offset }), 'one')
      ).toThrow('Invalid cursor')
    expect(() =>
      decodeCursor(encodeCursor({ ...data, expires: 1 }), 'one')
    ).toThrow('Query expired')
    expect(() => decodeCursor('not-json', 'one')).toThrow('Invalid cursor')
  })

  it('sends search, filters and sorts to the public view, counts matches rather than sizeHint', async () => {
    const request = jest.fn(() => publicResult(1, false))
    const result = await service(request)({
      ...input,
      search: 'x',
      filters: [{ property: 's', operator: 'equals', value: 'A' }],
      sorts: [{ property: 'n', direction: 'descending' }]
    })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: { id: sourceId },
        collectionView: { id: viewId },
        loader: expect.objectContaining({
          searchQuery: 'x',
          sort: [{ property: 'n', direction: 'descending' }],
          filter: {
            operator: 'and',
            filters: [
              {
                property: 's',
                filter: {
                  operator: 'enum_is',
                  value: { type: 'exact', value: 'A' }
                }
              }
            ]
          }
        })
      })
    )
    expect(result.total).toBe(1)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('never returns denied, foreign or unrelated records and hydrates only absent batch rows', async () => {
    const data = publicResult(3, false)
    data.recordMap.block[rowId(0)] = {
      value: { value: row(rowId(0)).value.value, role: 'none' }
    }
    data.recordMap.block[rowId(1)].value.value.parent_id = rootId
    delete data.recordMap.block[rowId(2)]
    data.recordMap.block[rowId(99)] = row(rowId(99))
    const c = {
      getBlocks: jest.fn(() => ({
        recordMap: { block: { [rowId(2)]: row(rowId(2)) } }
      }))
    }
    const result = await service(() => data, c)(input)
    expect(result.blockIds).toEqual([rowId(2)])
    expect(Object.keys(result.recordMap.block)).toEqual([rowId(2)])
    expect(c.getBlocks).toHaveBeenCalledWith([rowId(2)])
    expect(result.total).toBeNull()
  })

  it('keeps only referenced public profile and relation metadata, including hydrated records', async () => {
    const data = publicResult(1, false)
    delete data.recordMap.block[rowId(0)]
    const selected = row(rowId(0))
    selected.value.value.properties.people = [
      [
        '‣',
        [
          ['u', 'alice'],
          ['‣', ['u', 'bob']]
        ]
      ]
    ]
    selected.value.value.properties.related = [
      [
        '‣',
        [
          ['p', rowId(9)],
          ['p', rowId(10)],
          ['‣', ['p', rowId(11)]]
        ]
      ]
    ]
    const related = row(rowId(9))
    related.value.value.properties = {
      title: [['关联页面']],
      secret: [['do not return']]
    }
    const hydrated = {
      recordMap: {
        block: {
          [rowId(0)]: selected,
          [rowId(9)]: related,
          [rowId(10)]: { role: 'none', value: row(rowId(10)).value.value },
          [rowId(11)]: {
            value: {
              id: rowId(11),
              type: 'collection_view_page',
              collection_id: sourceId
            }
          },
          [rowId(99)]: row(rowId(99))
        },
        notion_user: {
          alice: {
            value: {
              id: 'alice',
              given_name: 'Alice',
              family_name: 'A',
              profile_photo: '/avatar.png',
              email: 'private@example.com'
            }
          },
          bob: {
            value: { value: { id: 'bob', given_name: 'Bob' }, role: 'reader' }
          },
          unrelated: { value: { id: 'unrelated', given_name: 'Unrelated' } }
        },
        collection: {
          [sourceId]: {
            value: {
              id: sourceId,
              name: [['关联数据库']],
              icon: '📚',
              schema: { private: {} }
            }
          }
        },
        signed_urls: {
          [rowId(9)]: 'https://example.com/icon.png',
          [rowId(99)]: 'unrelated-url'
        },
        collection_query: { secret: 'unrequested query' }
      }
    }
    const result = await service(() => data, {
      getBlocks: jest.fn(() => hydrated)
    })(input)
    expect(result.blockIds).toEqual([rowId(0)])
    expect(Object.keys(result.recordMap.block).sort()).toEqual(
      [rowId(0), rowId(9), rowId(11)].sort()
    )
    expect(result.recordMap.block[rowId(9)].value.properties).toEqual({
      title: [['关联页面']]
    })
    expect(Object.keys(result.recordMap.notion_user).sort()).toEqual([
      'alice',
      'bob'
    ])
    expect(result.recordMap.notion_user.alice.value.profile_photo).toBe(
      '/avatar.png'
    )
    expect(result.recordMap.collection[sourceId].value).toEqual({
      id: sourceId,
      name: [['关联数据库']],
      icon: '📚'
    })
    expect(result.recordMap.signed_urls).toEqual({
      [rowId(9)]: 'https://example.com/icon.png'
    })
    expect(JSON.stringify(result)).not.toMatch(
      /unrequested-body|do not return|private@example|unrequested query|unrelated-url/
    )
  })

  it('uses a validated visitor timezone and isolates both cached queries and continuation hints', async () => {
    const request = jest.fn(() => publicResult(30, true))
    const memo = jest.fn((key, load) => load())
    const query = createDatabaseService({
      request,
      loadMetadata: () => metadata,
      memo
    })
    const first = await query({ ...input, timeZone: 'America/Los_Angeles' })
    expect(request.mock.calls[0][0].loader.userTimeZone).toBe(
      'America/Los_Angeles'
    )
    await query({ ...input, timeZone: 'Asia/Tokyo' })
    expect(request.mock.calls[1][0].loader.userTimeZone).toBe('Asia/Tokyo')
    expect(memo.mock.calls[0][0]).not.toBe(memo.mock.calls[1][0])
    await expect(
      query({ ...input, timeZone: 'Asia/Tokyo', cursor: first.nextCursor })
    ).rejects.toMatchObject({ code: 'CURSOR_EXPIRED' })
    await expect(
      query({ ...input, timeZone: 'Not/A_Timezone' })
    ).rejects.toMatchObject({ status: 400 })
    expect(request).toHaveBeenCalledTimes(2)
    await query(input)
    expect(request.mock.calls[2][0].loader.userTimeZone).toBe('UTC')
  })

  it('requires refresh if any previously loaded prefix row moved, even if the boundary is unchanged', async () => {
    const changed = publicResult(60, true)
    const ids = changed.result.reducerResults.collection_group_results.blockIds
    ;[ids[0], ids[1]] = [ids[1], ids[0]]
    const request = jest
      .fn()
      .mockResolvedValueOnce(publicResult(30, true))
      .mockResolvedValueOnce(changed)
    const query = service(request)
    const first = await query(input)
    await expect(
      query({ ...input, cursor: first.nextCursor })
    ).rejects.toMatchObject({ code: 'CURSOR_EXPIRED', status: 410 })
  })

  it('marks upstream truncation honestly instead of claiming all rows loaded or retrying forever', async () => {
    const result = await service(() => publicResult(20, true, 1000))(input)
    expect(result).toMatchObject({
      incomplete: true,
      hasMore: false,
      nextCursor: null,
      total: 1000
    })
  })

  it('uses the public web endpoint without authorization headers or token configuration', async () => {
    const c = { fetch: jest.fn(() => publicResult(0, false)) }
    const body = { collection: { id: sourceId } }
    await publicRequest(body, c)
    expect(c.fetch).toHaveBeenCalledWith({ endpoint: 'queryCollection', body })
  })
})

describe('public scope', () => {
  it('follows collection parents using the right record table and rejects unrelated databases', async () => {
    const parentCollection = '55555555-5555-5555-5555-555555555555'
    const c = {
      getPageRaw: jest.fn(() => ({
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
      fetch: jest.fn(() => ({
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
