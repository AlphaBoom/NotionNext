import { NotionAPI } from 'notion-client'
import BLOG from '@/blog.config'
import {
  DATABASE_PREVIEW_LIMIT,
  DATABASE_CACHE_SECONDS,
  collectionIdFor,
  compactId,
  isSupportedView,
  savedViewQuery,
  mergeRecordMaps,
  unwrapRecord,
  visibleProperties,
  uuid
} from './model'
import { readableRecord, withRowMetadata } from './rowMetadata'

// Anonymous public web requests only. No API key, cookies or user-specific query.
const publicNotion = new NotionAPI({
  apiBaseUrl: 'https://app.notion.com/api/v3',
  ofetchOptions: { timeout: 15_000, retry: 0 }
})

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

// Reject old search/pagination inputs before metadata or any upstream request.
export function previewBlockId(input) {
  if (
    !input ||
    Object.keys(input).length !== 1 ||
    typeof input.blockId !== 'string' ||
    !/^[a-f0-9]{32}$/.test(input.blockId)
  )
    fail('INVALID_QUERY', 400, 'Expected a canonical database ID only')
  return uuid(input.blockId)
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
  const block = readableRecord(map?.block?.[blockId])
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

function rowRecord(entry, properties) {
  const block = readableRecord(entry)
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
      properties: Object.fromEntries(
        Object.entries(block.properties || {}).filter(([id]) =>
          properties.has(id)
        )
      ),
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

/** One bounded snapshot per database, shared across visitors to this instance.
 * CDN hits are served before the function; this cache also collapses cold requests.
 */
export function createDatabasePreview({
  client = publicNotion,
  request = body => publicRequest(body, client),
  loadMetadata = id => loadPublicDatabase(id, client),
  now = Date.now
} = {}) {
  const cache = new Map()
  const pending = new Map()
  return async input => {
    const blockId = previewBlockId(input)
    const hit = cache.get(blockId)
    if (hit?.expires > now()) return hit.value
    if (pending.has(blockId)) return pending.get(blockId)
    if (pending.size >= 4) fail('RATE_LIMITED', 429, 'Database server is busy')
    const promise = Promise.resolve()
      .then(async () => {
        const { block, collection, views } = await loadMetadata(blockId)
        const view = views[block.view_ids[0]]
        if (!view) fail('NOT_FOUND', 404, 'Default view not found')
        const presentation = {
          collection: {
            id: collection.id,
            name: collection.name || [],
            schema: collection.schema
          },
          view: {
            id: view.id,
            type: view.type,
            name: view.name || '',
            format: view.format || {}
          }
        }
        if (!isSupportedView(view.type))
          return {
            ...presentation,
            supported: false,
            blockIds: [],
            recordMap: {},
            hasMore: false
          }
        const timeZone = new Intl.DateTimeFormat('en', {
          timeZone: BLOG.NOTION_DATABASE_TIMEZONE || 'UTC'
        }).resolvedOptions().timeZone
        const result = await request({
          collection: { id: collection.id },
          collectionView: { id: view.id },
          source: { type: 'collection', id: collection.id },
          loader: {
            type: 'reducer',
            reducers: {
              collection_group_results: {
                type: 'results',
                limit: DATABASE_PREVIEW_LIMIT,
                loadContentCover: false
              }
            },
            ...savedViewQuery(view),
            userTimeZone: timeZone
          }
        })
        const page = result?.result?.reducerResults?.collection_group_results
        if (!Array.isArray(page?.blockIds) || typeof page.hasMore !== 'boolean')
          fail('UPSTREAM_UNAVAILABLE', 502, 'Invalid result page')
        let ids
        try {
          // Bound even an unexpectedly oversized upstream response before hydration.
          ids = page.blockIds.slice(0, DATABASE_PREVIEW_LIMIT).map(uuid)
        } catch {
          fail('UPSTREAM_UNAVAILABLE', 502, 'Invalid row IDs')
        }
        if (new Set(ids).size !== ids.length)
          fail('UPSTREAM_UNAVAILABLE', 502, 'Duplicate row IDs')
        let source = result.recordMap || {}
        const missing = ids.filter(id => !source.block?.[id])
        if (missing.length) {
          const hydrated = await client.getBlocks(missing)
          source = mergeRecordMaps(source, hydrated?.recordMap)
        }
        const properties = new Set([
          'title',
          ...visibleProperties(collection, view).map(field => field.id)
        ])
        const coverProperty = view.format?.gallery_cover?.property
        const groupProperty =
          view.format?.board_columns_by?.property ||
          view.format?.collection_group_by?.property
        if (coverProperty) properties.add(coverProperty)
        if (groupProperty) properties.add(groupProperty)
        const blocks = {}
        for (const id of ids) {
          const row = rowRecord(source.block?.[id], properties)
          if (
            row &&
            compactId(row.value.parent_id) === compactId(collection.id)
          )
            blocks[id] = row
        }
        return {
          ...presentation,
          supported: true,
          blockIds: ids.filter(id => blocks[id]),
          recordMap: withRowMetadata(blocks, source),
          hasMore:
            page.hasMore || page.blockIds.length > DATABASE_PREVIEW_LIMIT,
          omitted: Object.keys(blocks).length !== ids.length
        }
      })
      .then(value => {
        cache.delete(blockId)
        while (cache.size >= 20) cache.delete(cache.keys().next().value)
        cache.set(blockId, {
          value,
          expires: now() + DATABASE_CACHE_SECONDS * 1000
        })
        return value
      })
      .finally(() => pending.delete(blockId))
    pending.set(blockId, promise)
    return promise
  }
}

export const getDatabasePreview = createDatabasePreview()
