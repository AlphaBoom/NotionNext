import { collectionIdFor, unwrapRecord } from './model'

/** Load schemas/view names only. Never execute a collection query here. */
export async function hydrateDatabaseMetadata(map, fetchRecords) {
  const blocks = Object.values(map.block || {})
    .map(unwrapRecord)
    .filter(Boolean)
  const viewIds = [...new Set(blocks.flatMap(block => block.view_ids || []))]
  const merge = response => {
    for (const table of ['collection', 'collection_view']) {
      map[table] = { ...map[table], ...response?.recordMap?.[table] }
    }
  }
  const missingViews = viewIds.filter(
    id => !unwrapRecord(map.collection_view?.[id])?.id
  )
  if (missingViews.length)
    merge(
      await fetchRecords(
        missingViews.map(id => ({ id, table: 'collection_view', version: -1 }))
      )
    )
  const collectionIds = new Set()
  blocks.forEach(block => {
    const id = collectionIdFor(block, map)
    if (id) collectionIds.add(id)
    if (block.parent_table === 'collection') collectionIds.add(block.parent_id)
  })
  const missingCollections = [...collectionIds].filter(
    id => !unwrapRecord(map.collection?.[id])?.schema
  )
  if (missingCollections.length)
    merge(
      await fetchRecords(
        missingCollections.map(id => ({ id, table: 'collection', version: -1 }))
      )
    )
  return map
}
