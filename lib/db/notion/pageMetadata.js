import { getTextContent, idToUuid } from 'notion-utils'

const normalizeId = id => String(id || '').replace(/-/g, '').toLowerCase()

/** Resolve the page title without assuming a database view has a title property. */
export function getNotionPageTitle(block, recordMap) {
  const collectionId =
    block?.collection_id || block?.format?.collection_pointer?.id
  const collection = recordMap?.collection?.[collectionId]?.value

  return (
    getTextContent(block?.properties?.title || []).trim() ||
    getTextContent(collection?.name || []).trim() ||
    '无标题'
  )
}

/**
 * A publishing-database record is a blog page, not an auxiliary database entry.
 * For all other pages, stop at the nearest owning collection. Do not inspect
 * collections merely embedded in, or linked from, an article's body.
 */
export async function isDatabaseEntryPage({
  pageId,
  recordMap,
  publishingPageIds = [],
  loadBlock
}) {
  const publishingPages = new Set(publishingPageIds.map(normalizeId))
  const blocks = new Map(
    Object.entries(recordMap?.block || {}).map(([id, entry]) => [
      normalizeId(id), entry?.value
    ])
  )
  const collections = new Set(
    Object.keys(recordMap?.collection || {}).map(normalizeId)
  )
  const visited = new Set()
  let currentId = normalizeId(pageId)

  // Bound malformed/cyclic parent chains and any missing-ancestor requests.
  while (currentId && !visited.has(currentId) && visited.size < 32) {
    if (publishingPages.has(currentId)) return false
    visited.add(currentId)

    let block = blocks.get(currentId)
    if (!block && loadBlock) {
      block = await loadBlock(idToUuid(currentId))
    }
    // Incomplete ancestry must not accidentally make an auxiliary entry indexable.
    if (!block) return true

    const parentId = normalizeId(block.parent_id)
    if (block.parent_table === 'collection' || collections.has(parentId)) {
      return true
    }
    if (!parentId || block.parent_table === 'space') return false
    currentId = parentId
  }

  return true
}
