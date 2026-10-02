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

import BLOG from '@/blog.config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import {
  fetchInBatches,
  fetchNotionPageBlocks
} from '@/lib/db/notion/getPostBlocks'
import { fetchPageFromNotion } from '@/lib/db/notion/getNotionPost'
import MemoryCache from '@/lib/cache/memory_cache'
import FileCache from '@/lib/cache/local_file_cache'

describe('site data failure recovery', () => {
  const database = BLOG.NOTION_PAGE_ID
  const validEmptyDatabase = () => ({
    block: {
      [database]: {
        value: {
          id: database,
          type: 'collection_view_page',
          collection_id: 'collection',
          view_ids: []
        }
      }
    },
    collection: { collection: { value: { schema: {} } } },
    collection_query: {},
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
