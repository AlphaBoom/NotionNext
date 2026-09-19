import { collectionIdFor, textContent, unwrapRecord } from './model'

// Only use metadata present in the anonymous response; never fetch a relation's
// page body or copy unrelated profiles, private fields or collection queries.
export function readableRecord(entry) {
  let current = entry
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current.role === 'none') return null
    if (!current.value) break
    current = current.value
  }
  const record = unwrapRecord(entry)
  return record?.id && record.alive !== false ? record : null
}

export function withRowMetadata(blocks, source) {
  const result = {
    block: { ...blocks },
    notion_user: {},
    collection: {},
    signed_urls: {}
  }
  const pageIds = new Set()
  const userIds = new Set()
  const scan = value => {
    if (!Array.isArray(value)) return
    const [type, reference] = value
    if (typeof reference === 'string') {
      if (type === 'p') pageIds.add(reference)
      if (type === 'u') userIds.add(reference)
    }
    if (type === '‣' && Array.isArray(reference)) {
      const [table, id] = reference
      if (typeof id === 'string') (table === 'u' ? userIds : pageIds).add(id)
    }
    value.forEach(scan)
  }
  for (const entry of Object.values(blocks)) {
    Object.values(entry.value.properties || {}).forEach(scan)
  }
  for (const id of pageIds) {
    if (result.block[id]) continue
    const block = readableRecord(source.block?.[id])
    if (
      !block ||
      !['page', 'collection_view', 'collection_view_page'].includes(block.type)
    )
      continue
    const collectionId = collectionIdFor(block, source)
    result.block[id] = {
      value: {
        id: block.id,
        type: block.type,
        properties: { title: [[textContent(block.properties?.title)]] },
        format: {
          ...(block.format?.page_icon && { page_icon: block.format.page_icon })
        },
        ...(collectionId && { collection_id: collectionId })
      }
    }
    if (collectionId) {
      const collection = readableRecord(source.collection?.[collectionId])
      if (collection)
        result.collection[collectionId] = {
          value: {
            id: collection.id,
            name: [[textContent(collection.name)]],
            ...(collection.icon && { icon: collection.icon })
          }
        }
    }
  }
  for (const id of userIds) {
    const user = readableRecord(source.notion_user?.[id])
    if (!user) continue
    result.notion_user[id] = {
      value: Object.fromEntries(
        ['id', 'given_name', 'family_name', 'profile_photo']
          .filter(key => user[key] !== undefined)
          .map(key => [key, user[key]])
      )
    }
  }
  for (const id of Object.keys(result.block)) {
    if (source.signed_urls?.[id])
      result.signed_urls[id] = source.signed_urls[id]
  }
  return result
}
