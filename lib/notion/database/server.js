import { createHash } from 'crypto'
import { NotionAPI } from 'notion-client'
import BLOG from '@/blog.config'
import {
  DATABASE_PAGE_SIZE,
  collectionIdFor,
  compactId,
  publicViewQuery,
  normalizeQuery,
  unwrapRecord,
  uuid
} from './model'

// Public web requests only: no API key, cookies or authenticated client.
export const MAX_PUBLIC_WINDOW = 10_000
const publicNotion = new NotionAPI({
  apiBaseUrl: 'https://app.notion.com/api/v3',
  ofetchOptions: { timeout: 15_000, retry: 0 }
})
const cache = new Map()
const pending = new Map()
const TTL = 60_000
const MAX_CACHE_ENTRIES = 100

export class DatabaseError extends Error {
  constructor(code, status, message) {
    super(message)
    this.code = code
    this.status = status
  }
}
const fail = (code, status, message) => {
  throw new DatabaseError(code, status, message)
}
const digest = value =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

async function cached(key, load) {
  const hit = cache.get(key)
  if (hit?.expires > Date.now()) return hit.value
  if (pending.has(key)) return pending.get(key)
  const promise = Promise.resolve()
    .then(load)
    .then(value => {
      cache.delete(key)
      while (cache.size >= MAX_CACHE_ENTRIES)
        cache.delete(cache.keys().next().value)
      cache.set(key, { value, expires: Date.now() + TTL })
      return value
    })
    .finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}

// This is a bounded continuation hint, not an authorization credential. Every
// request independently checks public access, site ancestry and the allowed view.
export function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}
export function decodeCursor(cursor, fingerprint) {
  if (
    typeof cursor !== 'string' ||
    cursor.length > 2048 ||
    !/^[\w-]+$/.test(cursor)
  )
    fail('INVALID_CURSOR', 400, 'Invalid cursor')
  let data
  try {
    data = JSON.parse(Buffer.from(cursor, 'base64url').toString())
  } catch {
    fail('INVALID_CURSOR', 400, 'Invalid cursor')
  }
  if (
    !data ||
    !Number.isInteger(data.offset) ||
    data.offset < DATABASE_PAGE_SIZE ||
    data.offset >= MAX_PUBLIC_WINDOW ||
    data.offset % DATABASE_PAGE_SIZE ||
    !/^[a-f0-9]{64}$/.test(data.prefix || '')
  )
    fail('INVALID_CURSOR', 400, 'Invalid cursor')
  if (data.fingerprint !== fingerprint)
    fail('CURSOR_EXPIRED', 410, 'Query changed')
  if (
    !Number.isFinite(data.expires) ||
    data.expires <= Date.now() ||
    data.expires > Date.now() + 15 * 60_000
  )
    fail('CURSOR_EXPIRED', 410, 'Query expired')
  return data
}

export async function publicRequest(body, client = publicNotion) {
  try {
    return await client.fetch({ endpoint: 'queryCollection', body })
  } catch (error) {
    const status = error?.response?.status || error?.statusCode
    if (status === 429) fail('RATE_LIMITED', 429, 'Notion rate limit')
    if ([401, 403, 404].includes(status))
      fail('NOT_FOUND', 404, 'Public database not found')
    fail('UPSTREAM_UNAVAILABLE', 502, 'Notion request failed')
  }
}

// Follow only the anonymous public parent chain; this is not an arbitrary proxy.
export async function loadPublicDatabase(blockId, client = publicNotion) {
  const map = (await client.getPageRaw(blockId, { chunkLimit: 1 }))?.recordMap
  const block = unwrapRecord(map?.block?.[blockId])
  if (
    !block ||
    !['collection_view', 'collection_view_page'].includes(block.type) ||
    block.alive === false
  )
    fail('NOT_FOUND', 404, 'Public database not found')
  const roots = new Set(
    String(BLOG.NOTION_PAGE_ID || '')
      .split(',')
      .map(value => compactId(value.split(':').pop()))
  )
  let parent = block
  let allowed = false
  const seen = new Set()
  for (let depth = 0; depth < 32 && parent?.parent_id; depth++) {
    const parentId = parent.parent_id
    if (roots.has(compactId(parentId))) {
      allowed = true
      break
    }
    if (seen.has(parentId)) break
    seen.add(parentId)
    const parentTable =
      parent.parent_table === 'collection' ? 'collection' : 'block'
    parent = unwrapRecord(map?.block?.[parentId] || map?.collection?.[parentId])
    if (!parent) {
      const response = await client.fetch({
        endpoint: 'syncRecordValuesMain',
        body: {
          requests: [{ table: parentTable, id: parentId, version: -1 }]
        }
      })
      parent = unwrapRecord(
        response?.recordMap?.block?.[parentId] ||
          response?.recordMap?.collection?.[parentId]
      )
    }
  }
  if (!allowed) fail('NOT_FOUND', 404, 'Database is outside this site')
  const collectionId = collectionIdFor(block, map)
  const collection = unwrapRecord(map?.collection?.[collectionId])
  if (!collection?.schema || !block.view_ids?.length)
    fail('NOT_FOUND', 404, 'Database metadata missing')
  const views = Object.fromEntries(
    block.view_ids
      .map(id => [id, unwrapRecord(map.collection_view?.[id])])
      .filter(([, view]) => view)
  )
  return { block, collection, views }
}

function rowRecord(entry) {
  const block = unwrapRecord(entry)
  if (
    !block?.id ||
    block.type !== 'page' ||
    block.alive === false ||
    entry?.role === 'none' ||
    entry?.value?.role === 'none'
  )
    return null
  return {
    value: {
      id: block.id,
      type: 'page',
      properties: block.properties || {},
      parent_id: block.parent_id,
      parent_table: block.parent_table,
      created_time: block.created_time,
      last_edited_time: block.last_edited_time,
      format: Object.fromEntries(
        ['page_icon', 'page_cover', 'page_cover_position']
          .filter(key => block.format?.[key] !== undefined)
          .map(key => [key, block.format[key]])
      )
    }
  }
}

/** Injectable boundaries allow the public web contract to be tested offline. */
export function createDatabaseService({
  client = publicNotion,
  request = body => publicRequest(body, client),
  loadMetadata = id =>
    cached(`meta:${id}`, () => loadPublicDatabase(id, client)),
  memo = cached
} = {}) {
  return async input => {
    let blockId
    try {
      blockId = uuid(input?.blockId)
    } catch {
      fail('INVALID_QUERY', 400, 'Invalid database')
    }
    const { block, collection, views } = await loadMetadata(blockId)
    let query
    try {
      query = normalizeQuery(input, collection.schema, block.view_ids)
    } catch (error) {
      fail('INVALID_QUERY', 400, error.message)
    }
    const view = views[query.viewId]
    if (!view) fail('NOT_FOUND', 404, 'Public view not found')
    const conditions = publicViewQuery(view, query, collection.schema)
    const fingerprint = digest({
      blockId,
      collectionId: collection.id,
      query,
      conditions
    })
    const cursor = input.cursor ? decodeCursor(input.cursor, fingerprint) : null
    const offset = cursor?.offset || 0
    const limit = Math.min(offset + DATABASE_PAGE_SIZE, MAX_PUBLIC_WINDOW)
    return memo(
      `public-query:${fingerprint}:${input.cursor || 'first'}`,
      async () => {
        // queryCollection ignores offset. Expand its prefix only after Load More,
        // then return only the next batch. Do not pretend this is a native cursor.
        const result = await request({
          collection: { id: collection.id },
          collectionView: { id: query.viewId },
          source: { type: 'collection', id: collection.id },
          loader: {
            type: 'reducer',
            reducers: {
              collection_group_results: {
                type: 'results',
                limit,
                loadContentCover: false
              },
              database_total: {
                type: 'aggregation',
                aggregation: { aggregator: 'count' }
              }
            },
            ...conditions,
            userTimeZone: 'Asia/Tokyo'
          }
        })
        const page = result?.result?.reducerResults?.collection_group_results
        if (
          !Array.isArray(page?.blockIds) ||
          page.blockIds.length > limit ||
          typeof page.hasMore !== 'boolean'
        )
          fail('UPSTREAM_UNAVAILABLE', 502, 'Invalid result page')
        let allIds
        try {
          allIds = page.blockIds.map(uuid)
        } catch {
          fail('UPSTREAM_UNAVAILABLE', 502, 'Invalid row IDs')
        }
        if (new Set(allIds).size !== allIds.length)
          fail('UPSTREAM_UNAVAILABLE', 502, 'Duplicate row IDs')
        // Any insertion, removal or reorder in the prefix invalidates continuation.
        // The public endpoint does not promise a stable snapshot across clicks.
        if (
          cursor &&
          (allIds.length < offset ||
            digest(allIds.slice(0, offset)) !== cursor.prefix)
        )
          fail('CURSOR_EXPIRED', 410, 'Database changed')
        const ids = allIds.slice(offset)
        let rows = result.recordMap?.block || {}
        const missing = ids.filter(id => !rows[id])
        if (missing.length) {
          const hydrated = await client.getBlocks(missing)
          rows = { ...rows, ...hydrated?.recordMap?.block }
        }
        const blocks = {}
        for (const id of ids) {
          const row = rowRecord(rows[id])
          if (
            row &&
            compactId(row.value.parent_id) === compactId(collection.id)
          )
            blocks[id] = row
        }
        const omitted =
          Boolean(cursor?.omitted) || Object.keys(blocks).length !== ids.length
        const incomplete =
          page.hasMore && (allIds.length < limit || limit >= MAX_PUBLIC_WINDOW)
        const hasMore = page.hasMore && !incomplete
        const totalResult =
          result.result.reducerResults.database_total?.aggregationResult
        // sizeHint is the unfiltered database size, even for a one-row search.
        const total =
          totalResult?.type === 'number' &&
          Number.isInteger(totalResult.value) &&
          totalResult.value >= 0
            ? totalResult.value
            : null
        return {
          blockIds: ids.filter(id => blocks[id]),
          recordMap: { block: blocks },
          nextCursor: hasMore
            ? encodeCursor({
                fingerprint,
                offset: allIds.length,
                prefix: digest(allIds),
                expires: cursor?.expires || Date.now() + 14 * 60_000,
                omitted
              })
            : null,
          hasMore,
          total: omitted ? null : total,
          incomplete,
          query
        }
      }
    )
  }
}

const service = createDatabaseService()
let activeRequests = 0
export async function queryDatabase(input) {
  if (activeRequests >= 4) fail('RATE_LIMITED', 429, 'Database server is busy')
  activeRequests++
  try {
    return await service(input)
  } finally {
    activeRequests--
  }
}
