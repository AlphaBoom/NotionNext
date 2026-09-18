// Shared by the server query boundary and the database controls. No server imports.
export const DATABASE_PREVIEW_LIMIT = 100
export const DATABASE_DISPLAY_STEP = 20
export const DATABASE_CACHE_SECONDS = 600
export const isSupportedView = type =>
  ['table', 'gallery', 'list', 'board'].includes(type)
export function mergeRecordMaps(previous = {}, next = {}) {
  const merged = { ...previous, ...next }
  for (const table of ['block', 'notion_user', 'collection', 'signed_urls']) {
    merged[table] = { ...previous[table], ...next[table] }
  }
  return merged
}

export const unwrapRecord = entry => {
  let value = entry
  for (let i = 0; i < 4 && value?.value && !value.id; i++) value = value.value
  return value
}
export const compactId = id =>
  String(id || '')
    .replace(/-/g, '')
    .toLowerCase()
export function uuid(id) {
  const value = compactId(id)
  if (!/^[a-f0-9]{32}$/.test(value)) throw new Error('Invalid Notion ID')
  return value.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
}
export const textContent = value =>
  (value || []).map(part => part?.[0] || '').join('')
export function collectionIdFor(block, map) {
  const view = unwrapRecord(map?.collection_view?.[block?.view_ids?.[0]])
  return (
    block?.collection_id ||
    block?.format?.collection_pointer?.id ||
    view?.format?.collection_pointer?.id
  )
}

// Only the owner's saved default view can affect the server-side query.
export function savedViewQuery(view) {
  const filters = []
  if (view.query2?.filter?.filters?.length) filters.push(view.query2.filter)
  for (const item of view.format?.property_filters || []) {
    if (item.filter?.filter && item.filter?.property) filters.push(item.filter)
  }
  return {
    ...(filters.length ? { filter: { operator: 'and', filters } } : {}),
    sort: view.query2?.sort || []
  }
}

export function visibleProperties(collection, view) {
  const schema = collection?.schema || {}
  const settings = view?.format?.[`${view.type}_properties`]
  const fields = settings
    ? settings.filter(
        field => field.visible !== false && schema[field.property]
      )
    : Object.keys(schema)
        .filter(
          property =>
            view?.type === 'table' || schema[property].type === 'title'
        )
        .map(property => ({ property }))
  // Table titles remain an accessible entry point; gallery may intentionally hide them.
  return fields.map(field => ({
    ...schema[field.property],
    ...field,
    id: field.property
  }))
}
