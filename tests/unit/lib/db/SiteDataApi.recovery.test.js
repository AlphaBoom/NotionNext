/** @jest-environment node */

jest.mock('notion-utils', () => ({ idToUuid: value => value }))
jest.mock('react-notion-x', () => ({}))
jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {}
}))
jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchNotionPageBlocks: jest.fn(),
  fetchInBatches: jest.fn(),
  formatNotionBlock: value => value
}))
jest.mock('@/lib/db/notion/getNotionPost', () => ({
  fetchPageFromNotion: jest.fn()
}))
jest.mock('@/lib/cache/local_file_cache', () => ({
  entries: new Map(),
  getCache(key) {
    return this.entries.get(key)
  },
  setCache(key, value) {
    this.entries.set(key, value)
  }
}))
jest.mock('@/lib/cache/redis_cache', () => ({
  getCache: () => null,
  setCache: () => {}
}))
jest.mock('@/lib/cache/memory_cache', () => ({
  entries: new Map(),
  getCache(key) {
    return this.entries.get(key)
  },
  setCache(key, value) {
    this.entries.set(key, value)
  }
}))
jest.mock('@/lib/utils/post', () => ({ processPostData: jest.fn() }))
jest.mock('@/lib/utils/rss', () => ({ buildRssFeeds: jest.fn() }))
jest.mock('@/lib/db/notion/getPageProperties', () => ({
  __esModule: true,
  default: jest.fn(),
  adjustPageProperties: jest.fn()
}))

import BLOG from '@/blog.config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import {
  fetchInBatches,
  fetchNotionPageBlocks
} from '@/lib/db/notion/getPostBlocks'
import { fetchPageFromNotion } from '@/lib/db/notion/getNotionPost'
import MemoryCache from '@/lib/cache/memory_cache'
import FileCache from '@/lib/cache/local_file_cache'
import getPageProperties from '@/lib/db/notion/getPageProperties'
import { buildRssFeeds } from '@/lib/utils/rss'
import rssHandler from '@/pages/api/rss'

describe('site data failure recovery', () => {
  const database = BLOG.NOTION_PAGE_ID
  const validEmptyDatabase = () => ({
    block: {
      [database]: {
        value: {
          id: database,
          type: 'collection_view_page',
          collection_id: 'collection',
          view_ids: ['view']
        }
      }
    },
    collection: { collection: { value: { schema: {} } } },
    collection_query: { collection: { view: { blockIds: [] } } },
    collection_view: {}
  })
  beforeEach(() => {
    BLOG.ENABLE_CACHE = true
    BLOG.BUNDLE_ANALYZER = false
    MemoryCache.entries.clear()
    FileCache.entries.clear()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('does not cache an upstream failure and can recover to a genuinely empty database', async () => {
    fetchNotionPageBlocks.mockRejectedValueOnce(new Error('temporary failure'))
    await expect(fetchGlobalAllData({ from: 'test' })).rejects.toThrow(
      'temporary failure'
    )
    expect(FileCache.entries.size).toBe(0)
    fetchNotionPageBlocks.mockResolvedValueOnce(validEmptyDatabase())
    await expect(fetchGlobalAllData({ from: 'test' })).resolves.toEqual(
      expect.objectContaining({ allPages: [], postCount: 0 })
    )
    expect(fetchNotionPageBlocks).toHaveBeenCalledTimes(2)
  })

  it.each([null, { block: {} }, { ...validEmptyDatabase(), collection: {} }])(
    'rejects unavailable database metadata without caching an error placeholder',
    async recordMap => {
      fetchNotionPageBlocks.mockResolvedValue(recordMap)
      await expect(fetchGlobalAllData({ from: 'test' })).rejects.toThrow(
        /Notion publishing database/
      )
      expect(FileCache.entries.size).toBe(0)
    }
  )

  it('rejects missing publishing rows rather than replacing the list with partial results', async () => {
    const recordMap = validEmptyDatabase()
    recordMap.collection_query = {
      collection: { view: { blockIds: ['missing-row'] } }
    }
    fetchNotionPageBlocks.mockResolvedValue(recordMap)
    fetchInBatches.mockResolvedValue({})
    await expect(fetchGlobalAllData({ from: 'test' })).rejects.toThrow(
      'Notion publishing database rows are incomplete'
    )
    expect(FileCache.entries.size).toBe(0)
  })

  it('rejects a failed selected query without caching it and accepts a successful empty query on recovery', async () => {
    const missingQuery = validEmptyDatabase()
    missingQuery.collection_query = { collection: { unused: { blockIds: [] } } }
    fetchNotionPageBlocks.mockResolvedValueOnce(missingQuery)
    await expect(fetchGlobalAllData({ from: 'test' })).rejects.toThrow(
      'Notion collection query is unavailable'
    )
    expect(FileCache.entries.size).toBe(0)
    fetchNotionPageBlocks.mockResolvedValueOnce(validEmptyDatabase())
    await expect(fetchGlobalAllData({ from: 'test' })).resolves.toEqual(
      expect.objectContaining({ allPages: [], postCount: 0 })
    )
    expect(fetchNotionPageBlocks).toHaveBeenCalledTimes(2)
  })

  it('does not turn a failed UUID lookup into a not-found response', async () => {
    fetchNotionPageBlocks.mockResolvedValue(validEmptyDatabase())
    fetchPageFromNotion.mockRejectedValueOnce(
      new Error('temporary article failure')
    )
    await expect(
      resolvePostProps({ prefix: 'abcdef0123456789abcdef0123456789' })
    ).rejects.toThrow('temporary article failure')
    fetchPageFromNotion.mockResolvedValueOnce(null)
    await expect(
      resolvePostProps({ prefix: 'abcdef0123456789abcdef0123456789' })
    ).resolves.toEqual(expect.objectContaining({ post: null }))
  })

  it('preserves the cached RSS after a publishing query failure and recovers to a truly empty feed through the real site pipeline', async () => {
    const response = () => ({
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value
      },
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    })
    const now = jest.spyOn(Date, 'now').mockReturnValue(0)
    getPageProperties.mockReturnValue({
      id: 'row',
      type: 'Post',
      status: 'Published',
      title: 'Article',
      slug: 'article',
      href: '/article',
      tags: [],
      tagItems: [],
      summary: '',
      publishDate: Date.UTC(2026, 9, 2),
      date: { start_date: '2026-10-02' }
    })
    buildRssFeeds.mockImplementation(async ({ allPages }) => ({
      xml: allPages.length ? '<rss>article</rss>' : '<rss/>',
      atomXml: '<feed/>',
      json: '{"items":[]}'
    }))
    const published = validEmptyDatabase()
    published.block.row = {
      value: { id: 'row', type: 'page', parent_id: 'collection' }
    }
    published.collection_query.collection.view.blockIds = ['row']
    fetchNotionPageBlocks.mockResolvedValueOnce(published)
    const initial = response()
    await rssHandler({ method: 'GET', query: {} }, initial)
    expect(initial.send).toHaveBeenCalledWith('<rss>article</rss>')

    now.mockReturnValue(600001)
    FileCache.entries.clear()
    MemoryCache.entries.clear()
    const failedQuery = validEmptyDatabase()
    failedQuery.collection_query = {}
    fetchNotionPageBlocks.mockResolvedValueOnce(failedQuery)
    const failed = response()
    await rssHandler({ method: 'GET', query: {} }, failed)
    expect(failed.send).toHaveBeenCalledWith('<rss>article</rss>')
    expect(failed.headers['Cache-Control']).toBe('no-store')
    expect(buildRssFeeds).toHaveBeenCalledTimes(1)
    expect(FileCache.entries.size).toBe(0)

    fetchNotionPageBlocks.mockResolvedValueOnce(validEmptyDatabase())
    const recovered = response()
    await rssHandler({ method: 'GET', query: {} }, recovered)
    expect(recovered.send).toHaveBeenCalledWith('<rss/>')
    expect(recovered.headers['Cache-Control']).toContain('s-maxage=600')
  })

  it('rejects an incomplete article body instead of generating a page without its content', async () => {
    const id = 'abcdef0123456789abcdef0123456789'
    fetchNotionPageBlocks
      .mockResolvedValueOnce(validEmptyDatabase())
      .mockResolvedValueOnce({ block: {} })
    fetchPageFromNotion.mockResolvedValueOnce({ id, title: 'Article' })
    await expect(resolvePostProps({ prefix: id })).rejects.toThrow(
      'Notion article content is unavailable'
    )
  })
})
