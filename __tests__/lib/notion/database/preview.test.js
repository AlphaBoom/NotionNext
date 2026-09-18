/** @jest-environment node */
import {
  createDatabasePreview,
  loadPublicDatabase,
  publicRequest
} from '@/lib/notion/database/server'
import {
  savedViewQuery,
  DATABASE_CACHE_SECONDS
} from '@/lib/notion/database/model'
import { hydrateDatabaseMetadata } from '@/lib/notion/database/hydrateMetadata'
import { prunePageScope } from '@/lib/notion/database/pageScope'

jest.mock('notion-client', () => ({ NotionAPI: jest.fn(() => ({})) }))
jest.mock('@/blog.config', () => ({
  NOTION_PAGE_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  NOTION_DATABASE_TIMEZONE: 'Asia/Tokyo'
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
  check: { name: '启用', type: 'checkbox' },
  people: { name: '人员', type: 'person' },
  related: { name: '关联', type: 'relation' }
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

const service = (request, client = { getBlocks: jest.fn() }) =>
  createDatabasePreview({ request, client, loadMetadata: () => metadata })
const input = { blockId: blockId.replace(/-/g, '') }

describe('fixed public database previews', () => {
  it.each([
    [0, false],
    [20, false],
    [100, false],
    [100, true],
    [101, false]
  ])(
    'bounds %i upstream rows with hasMore=%s to one preview request',
    async (count, hasMore) => {
      const request = jest.fn(() => publicResult(count, hasMore, 99999))
      const result = await service(request)(input)
      expect(request).toHaveBeenCalledTimes(1)
      const body = request.mock.calls[0][0]
      expect(body.collectionView.id).toBe(viewId)
      expect(body.loader.reducers).toEqual({
        collection_group_results: {
          type: 'results',
          limit: 100,
          loadContentCover: false
        }
      })
      expect(body.loader.userTimeZone).toBe('Asia/Tokyo')
      expect(body.loader.searchQuery).toBeUndefined()
      expect(result.blockIds).toHaveLength(Math.min(count, 100))
      expect(result.hasMore).toBe(hasMore || count > 100)
      expect(result.nextCursor).toBeUndefined()
      expect(result.total).toBeUndefined()
      expect(JSON.stringify(result)).not.toContain('unrequested-body')
    }
  )

  it.each([
    { cursor: 'forged-cursor' },
    { offset: 9990 },
    { limit: 10000 },
    { search: 'other rows' },
    { filters: [] },
    { sorts: [] },
    { viewId: sourceId },
    { timeZone: 'America/Los_Angeles' },
    { blockId },
    { blockId: [input.blockId, input.blockId] },
    { blockId: 'A'.repeat(32) }
  ])('rejects request variants before upstream work: %j', async patch => {
    const request = jest.fn()
    const loadMetadata = jest.fn()
    const preview = createDatabasePreview({ request, loadMetadata })
    await expect(preview({ ...input, ...patch })).rejects.toMatchObject({
      status: 400
    })
    expect(loadMetadata).not.toHaveBeenCalled()
    expect(request).not.toHaveBeenCalled()
  })

  it('preserves saved filters and ordering without accepting visitor query conditions', async () => {
    const filter = {
      operator: 'or',
      filters: [
        {
          property: 's',
          filter: { operator: 'enum_is', value: { type: 'exact', value: 'A' } }
        }
      ]
    }
    const quick = {
      property: 'check',
      filter: { operator: 'checkbox_is', value: { type: 'exact', value: true } }
    }
    const view = {
      id: viewId,
      type: 'table',
      query2: { filter, sort: [{ property: 'n', direction: 'descending' }] },
      format: { property_filters: [{ filter: quick }] }
    }
    const before = JSON.stringify(view)
    const request = jest.fn(() => publicResult(1, false))
    await createDatabasePreview({
      request,
      loadMetadata: () => ({ ...metadata, views: { [viewId]: view } })
    })(input)
    expect(request.mock.calls[0][0].loader).toMatchObject({
      filter: { operator: 'and', filters: [filter, quick] },
      sort: view.query2.sort
    })
    expect(savedViewQuery(view)).not.toHaveProperty('searchQuery')
    expect(JSON.stringify(view)).toBe(before)
  })

  it('shares in-flight and cached previews, then refreshes metadata and data after expiry', async () => {
    let time = 1000
    const request = jest.fn(() => publicResult(100, true))
    const loadMetadata = jest.fn(() => metadata)
    const preview = createDatabasePreview({
      request,
      loadMetadata,
      now: () => time
    })
    const [a, b] = await Promise.all([preview(input), preview(input)])
    expect(a).toBe(b)
    expect(await preview(input)).toBe(a)
    expect(request).toHaveBeenCalledTimes(1)
    expect(loadMetadata).toHaveBeenCalledTimes(1)
    time += DATABASE_CACHE_SECONDS * 1000 + 1
    await preview(input)
    expect(request).toHaveBeenCalledTimes(2)
    expect(loadMetadata).toHaveBeenCalledTimes(2)
  })

  it('does not retain failed requests and lets retries succeed', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue(publicResult(1, false))
    const preview = service(request)
    await expect(preview(input)).rejects.toThrow('temporary')
    expect((await preview(input)).blockIds).toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('limits distinct cold queries while allowing duplicate callers to share a slot', async () => {
    let resolve
    const wait = new Promise(r => {
      resolve = r
    })
    const preview = service(() => wait)
    const pending = Array.from({ length: 4 }, (_, i) =>
      preview({ blockId: rowId(i).replace(/-/g, '') })
    )
    const duplicate = preview({ blockId: rowId(0).replace(/-/g, '') })
    await expect(
      preview({ blockId: rowId(4).replace(/-/g, '') })
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' })
    resolve(publicResult(0, false))
    await Promise.all([...pending, duplicate])
    await expect(
      preview({ blockId: rowId(4).replace(/-/g, '') })
    ).resolves.toMatchObject({ blockIds: [] })
  })

  it('bounds its warm cache to twenty database previews', async () => {
    const request = jest.fn(() => publicResult(0, false))
    const preview = service(request)
    for (let i = 0; i < 21; i++)
      await preview({ blockId: rowId(i).replace(/-/g, '') })
    await preview({ blockId: rowId(20).replace(/-/g, '') })
    expect(request).toHaveBeenCalledTimes(21)
    await preview({ blockId: rowId(0).replace(/-/g, '') })
    expect(request).toHaveBeenCalledTimes(22)
  })

  it('skips querying unsupported default views even through the direct API', async () => {
    const request = jest.fn()
    const result = await createDatabasePreview({
      request,
      loadMetadata: () => ({
        ...metadata,
        views: { [viewId]: { id: viewId, type: 'calendar' } }
      })
    })(input)
    expect(result.supported).toBe(false)
    expect(result.blockIds).toEqual([])
    expect(request).not.toHaveBeenCalled()
  })

  it('hydrates at most 100 rows even when upstream ignores its requested limit', async () => {
    const data = publicResult(101, false)
    data.recordMap = { block: {} }
    const client = {
      getBlocks: jest.fn(ids => ({
        recordMap: { block: Object.fromEntries(ids.map(id => [id, row(id)])) }
      }))
    }
    const result = await service(() => data, client)(input)
    expect(client.getBlocks.mock.calls[0][0]).toHaveLength(100)
    expect(client.getBlocks.mock.calls[0][0]).not.toContain(rowId(100))
    expect(result.blockIds).toHaveLength(100)
    expect(result.hasMore).toBe(true)
  })

  it('keeps only visible properties plus the title and cover property', async () => {
    const data = publicResult(1, false)
    data.recordMap.block[rowId(0)].value.value.properties = {
      title: [['Title']],
      n: [['42']],
      s: [['Hidden']],
      cover: [['File']]
    }
    const view = {
      id: viewId,
      type: 'gallery',
      format: {
        gallery_properties: [
          { property: 'n', visible: true },
          { property: 's', visible: false }
        ],
        gallery_cover: { type: 'property', property: 'cover' }
      }
    }
    const result = await createDatabasePreview({
      request: () => data,
      loadMetadata: () => ({ ...metadata, views: { [viewId]: view } })
    })(input)
    expect(result.recordMap.block[rowId(0)].value.properties).toEqual({
      title: [['Title']],
      n: [['42']],
      cover: [['File']]
    })
  })

  it('uses only the anonymous public web request', async () => {
    const client = { fetch: jest.fn(() => publicResult(0, false)) }
    const body = { collection: { id: sourceId } }
    await publicRequest(body, client)
    expect(client.fetch).toHaveBeenCalledWith({
      endpoint: 'queryCollection',
      body
    })
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
    expect(result.omitted).toBe(true)
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
