import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { NotionAPI } from 'notion-client'
import BLOG from '@/blog.config'
import {
  DATABASE_PAGE_SIZE,
  collectionIdFor,
  compactId,
  dataSourceQuery,
  normalizeQuery,
  unwrapRecord,
  uuid
} from './model'

const VERSION = '2026-03-11'
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

export function encodeCursor(data, secret) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
}
export function decodeCursor(cursor, secret, fingerprint) {
  if (typeof cursor !== 'string' || cursor.length > 8192)
    fail('INVALID_CURSOR', 400, 'Invalid cursor')
  const [payload, signature, extra] = cursor.split('.')
  if (!payload || !signature || extra)
    fail('INVALID_CURSOR', 400, 'Invalid cursor')
  const expected = createHmac('sha256', secret).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    fail('INVALID_CURSOR', 400, 'Invalid cursor')
  let data
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    fail('INVALID_CURSOR', 400, 'Invalid cursor')
  }
  if (data.fingerprint !== fingerprint)
    fail('INVALID_CURSOR', 400, 'Query changed')
  if (!Number.isFinite(data.expires) || data.expires <= Date.now())
    fail('CURSOR_EXPIRED', 410, 'Query expired')
  return data
}

export async function officialRequest(path, body, token) {
  let response
  try {
    response = await fetch(`https://api.notion.com/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': VERSION,
        'Content-Type': 'application/json'
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    fail('UPSTREAM_UNAVAILABLE', 502, 'Notion request failed')
  }
  if (response.status === 429) fail('RATE_LIMITED', 429, 'Notion rate limit')
  if ([401, 403, 404].includes(response.status))
    fail(
      'NOTION_ACCESS',
      response.status,
      'Notion connection cannot read this database'
    )
  if (!response.ok)
    fail('UPSTREAM_UNAVAILABLE', 502, `Notion returned ${response.status}`)
  return response.json()
}

// A token must never turn this endpoint into a proxy for private workspace data.
// Authorize through an anonymous read, then follow only the public parent chain.
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

/** Injectable boundaries allow pagination/permissions to be tested without credentials. */
export function createDatabaseService({
  client = publicNotion,
  request = officialRequest,
  loadMetadata = id =>
    cached(`meta:${id}`, () => loadPublicDatabase(id, client)),
  token = () =>
    process.env.NOTION_DATABASE_TOKEN || process.env.NOTION_API_TOKEN,
  memo = cached
} = {}) {
  return async input => {
    let blockId
    try {
      blockId = uuid(input?.blockId)
    } catch {
      fail('INVALID_QUERY', 400, 'Invalid database')
    }
    const secret = token()
    if (!secret)
      fail('NOT_CONFIGURED', 503, 'NOTION_DATABASE_TOKEN is required')
    const metadata = await loadMetadata(blockId)
    const { block, collection } = metadata
    let query
    try {
      query = normalizeQuery(input, collection.schema, block.view_ids)
    } catch (error) {
      fail('INVALID_QUERY', 400, error.message)
    }
    const fingerprint = digest({ blockId, collectionId: collection.id, query })
    const cursor = input.cursor
      ? decodeCursor(input.cursor, secret, fingerprint)
      : null
    const custom = Boolean(
      query.search || query.filters.length || query.sorts.length
    )
    if (cursor && cursor.mode !== (custom ? 'source' : 'view'))
      fail('INVALID_CURSOR', 400, 'Cursor type mismatch')
    const requestKey = `query:${digest(secret)}:${fingerprint}:${input.cursor || 'first'}`
    return memo(requestKey, async () => {
      let result
      let queryId = cursor?.queryId
      let expires = cursor?.expires || Date.now() + 14 * 60_000
      if (custom) {
        const view = await memo(`view:${digest(secret)}:${query.viewId}`, () =>
          request(`views/${query.viewId}`, undefined, secret)
        )
        if (compactId(view.data_source_id) !== compactId(collection.id))
          fail('NOT_FOUND', 404, 'View source mismatch')
        let conditions
        try {
          conditions = dataSourceQuery(view, query, collection.schema)
        } catch {
          fail('INVALID_QUERY', 400, 'Filter is too complex')
        }
        const body = {
          ...conditions,
          page_size: DATABASE_PAGE_SIZE,
          ...(cursor ? { start_cursor: cursor.next } : {})
        }
        result = await request(
          `data_sources/${uuid(view.data_source_id)}/query`,
          body,
          secret
        )
      } else if (cursor) {
        try {
          result = await request(
            `views/${query.viewId}/queries/${uuid(queryId)}?${new URLSearchParams({ start_cursor: cursor.next, page_size: String(DATABASE_PAGE_SIZE) }).toString()}`,
            undefined,
            secret
          )
        } catch (error) {
          if (error.status === 404) fail('CURSOR_EXPIRED', 410, 'Query expired')
          throw error
        }
      } else {
        result = await request(
          `views/${query.viewId}/queries`,
          { page_size: DATABASE_PAGE_SIZE },
          secret
        )
        queryId = result.id
        const expiry = Date.parse(result.expires_at)
        if (Number.isFinite(expiry))
          expires = Math.min(expires, expiry - 15_000)
      }
      if (
        !Array.isArray(result.results) ||
        result.results.length > DATABASE_PAGE_SIZE
      )
        fail('UPSTREAM_UNAVAILABLE', 502, 'Invalid result page')
      const ids = [
        ...new Set(
          result.results
            .filter(page => page.object === 'page')
            .map(page => uuid(page.id))
        )
      ]
      // One anonymous batch fetch supplies row properties AND enforces public access.
      // Never call getPage here: that would fetch every row's body and nested databases.
      const rows = ids.length
        ? (await client.getBlocks(ids))?.recordMap?.block || {}
        : {}
      const blocks = {}
      ids.forEach(id => {
        const row = rowRecord(rows[id])
        if (row) blocks[id] = row
      })
      const omitted =
        Boolean(cursor?.omitted) || Object.keys(blocks).length !== ids.length
      const incomplete =
        result.request_status?.type === 'incomplete' ||
        Boolean(cursor?.incomplete)
      const hasMore = Boolean(result.has_more)
      if (
        hasMore &&
        (!result.next_cursor || result.next_cursor === cursor?.next)
      )
        fail('UPSTREAM_UNAVAILABLE', 502, 'Pagination did not advance')
      const nextCursor = hasMore
        ? encodeCursor(
            {
              fingerprint,
              mode: custom ? 'source' : 'view',
              queryId,
              next: result.next_cursor,
              expires,
              incomplete,
              omitted,
              total: result.total_count ?? cursor?.total ?? null
            },
            secret
          )
        : null
      return {
        blockIds: ids.filter(id => blocks[id]),
        recordMap: { block: blocks },
        nextCursor,
        hasMore,
        total:
          custom || omitted
            ? null
            : Number.isFinite(result.total_count)
              ? result.total_count
              : (cursor?.total ?? null),
        incomplete,
        // No database token, raw upstream errors, unrelated records or page content.
        query
      }
    })
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
