import { collectionIdFor, compactId, unwrapRecord } from './model'

/** Keep this page's content and link metadata; stop at child pages/databases. */
export function prunePageScope(recordMap, rootId) {
  const root = Object.keys(recordMap?.block || {}).find(
    id => compactId(id) === compactId(rootId)
  )
  if (!root) return recordMap
  const keep = new Set()
  const visit = id => {
    if (keep.has(id)) return
    keep.add(id)
    const block = unwrapRecord(recordMap.block[id])
    if (!block) return
    // Rich-text mentions need metadata, but never their complete page bodies.
    const mentions = value => {
      if (!Array.isArray(value)) return
      if (['p', 'eoi'].includes(value[0]) && typeof value[1] === 'string')
        keep.add(value[1])
      value.forEach(mentions)
    }
    Object.values(block.properties || {}).forEach(mentions)
    if (id !== root && ['page', 'collection_view_page'].includes(block.type))
      return
    ;(block.content || []).forEach(visit)
  }
  visit(root)
  const block = Object.fromEntries(
    [...keep]
      .filter(id => recordMap.block[id])
      .map(id => [id, recordMap.block[id]])
  )
  const collections = new Set()
  const views = new Set()
  Object.values(block).forEach(entry => {
    const value = unwrapRecord(entry)
    const cid = collectionIdFor(value, recordMap)
    if (cid) collections.add(cid)
    if (value?.parent_table === 'collection') collections.add(value.parent_id)
    value?.view_ids?.forEach(id => views.add(id))
  })
  const pick = (map, ids) =>
    Object.fromEntries(Object.entries(map || {}).filter(([id]) => ids.has(id)))
  return {
    ...recordMap,
    block,
    collection: pick(recordMap.collection, collections),
    collection_view: pick(recordMap.collection_view, views),
    collection_query: {},
    signed_urls: pick(recordMap.signed_urls, keep)
  }
}
