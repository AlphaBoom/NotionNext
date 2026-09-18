// Shared by the server query boundary and the database controls. No server imports.
export const DATABASE_PAGE_SIZE = 30
export const MAX_FILTERS = 8
export const MAX_SORTS = 3
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

const empty = [
  ['is_empty', '为空'],
  ['is_not_empty', '不为空']
]
export function filterOperators(type) {
  switch (type) {
    case 'number':
      return [
        ['equals', '等于'],
        ['does_not_equal', '不等于'],
        ['greater_than', '大于'],
        ['less_than', '小于'],
        ['greater_than_or_equal_to', '大于等于'],
        ['less_than_or_equal_to', '小于等于'],
        ...empty
      ]
    case 'select':
    case 'status':
      return [['equals', '是'], ['does_not_equal', '不是'], ...empty]
    case 'multi_select':
      return [['contains', '包含'], ['does_not_contain', '不包含'], ...empty]
    case 'checkbox':
      return [
        ['equals', '是'],
        ['does_not_equal', '不是']
      ]
    case 'date':
    case 'created_time':
    case 'last_edited_time':
      return [
        ['equals', '是'],
        ['before', '早于'],
        ['after', '晚于'],
        ['on_or_before', '不晚于'],
        ['on_or_after', '不早于'],
        ...empty
      ]
    case 'title':
    case 'text':
    case 'url':
    case 'email':
    case 'phone_number':
      return [
        ['contains', '包含'],
        ['does_not_contain', '不包含'],
        ['equals', '等于'],
        ['does_not_equal', '不等于'],
        ['starts_with', '开头是'],
        ['ends_with', '结尾是'],
        ...empty
      ]
    default:
      return []
  }
}

export function normalizeQuery(input = {}, schema = {}, viewIds = []) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid query')
  const viewId = uuid(input.viewId || viewIds[0])
  if (!viewIds.some(id => compactId(id) === compactId(viewId)))
    throw new Error('Unknown view')
  const search = String(input.search || '').trim()
  if (search.length > 200) throw new Error('Search is too long')
  if (input.filters != null && !Array.isArray(input.filters))
    throw new Error('Invalid filters')
  if (input.sorts != null && !Array.isArray(input.sorts))
    throw new Error('Invalid sorts')
  if (
    (input.filters?.length || 0) > MAX_FILTERS ||
    (input.sorts?.length || 0) > MAX_SORTS
  )
    throw new Error('Too many conditions')
  const filters = (input.filters || []).map(({ property, operator, value }) => {
    const field = Object.hasOwn(schema, property) ? schema[property] : null
    if (!field || !filterOperators(field.type).some(([op]) => op === operator))
      throw new Error('Invalid filter')
    if (operator === 'is_empty' || operator === 'is_not_empty')
      return { property, operator, value: true }
    if (field.type === 'number') {
      if (value === '' || value == null || !Number.isFinite(Number(value)))
        throw new Error('Invalid number')
      value = Number(value)
    } else if (field.type === 'checkbox') {
      if (![true, false, 'true', 'false'].includes(value))
        throw new Error('Invalid checkbox')
      value = value === true || value === 'true'
    } else {
      if (typeof value !== 'string' || value.length > 500 || !value.trim())
        throw new Error('Invalid value')
      if (
        ['date', 'created_time', 'last_edited_time'].includes(field.type) &&
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      )
        throw new Error('Invalid date')
    }
    return { property, operator, value }
  })
  const sorts = (input.sorts || []).map(({ property, direction }) => {
    if (
      !Object.hasOwn(schema, property) ||
      !['ascending', 'descending'].includes(direction)
    )
      throw new Error('Invalid sort')
    return { property, direction }
  })
  return { viewId, search, filters, sorts }
}

export function dataSourceQuery(view, query, schema) {
  // Preserve the entire saved predicate, including nested OR/AND and quick filters.
  const filters = []
  if (view.filter && Object.keys(view.filter).length) filters.push(view.filter)
  for (const [property, condition] of Object.entries(
    view.quick_filters || {}
  )) {
    if (condition && Object.keys(condition).length)
      filters.push({ property, ...condition })
  }
  for (const item of query.filters) {
    const field = schema[item.property]
    const type = field.type === 'text' ? 'rich_text' : field.type
    filters.push({
      property: field.name,
      [type]: { [item.operator]: item.value }
    })
  }
  if (query.search) {
    const title = Object.values(schema).find(field => field.type === 'title')
    if (!title) throw new Error('Missing title property')
    filters.push({ property: title.name, title: { contains: query.search } })
  }
  return {
    ...(filters.length ? { filter: combineFilters(filters) } : {}),
    sorts: query.sorts.length
      ? query.sorts.map(sort => ({
          property: schema[sort.property].name,
          direction: sort.direction
        }))
      : view.sorts || []
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

// Keep compound predicates within Notion's two-level nesting limit.
export function combineFilters(filters) {
  const flattened = filters.flatMap(filter => filter.and || [filter])
  if (flattened.length === 1) return flattened[0]
  const depth = filter =>
    Math.max(
      0,
      ...(filter.and || filter.or || []).map(child => 1 + depth(child))
    )
  const combined = { and: flattened }
  if (depth(combined) <= 2) return combined
  const clauses = filter => {
    if (filter.or) return filter.or.flatMap(clauses)
    if (!filter.and) return [[filter]]
    let result = [[]]
    for (const child of filter.and) {
      const next = clauses(child)
      if (result.length * next.length > 100)
        throw new Error('Filter is too complex')
      result = result.flatMap(left => next.map(right => [...left, ...right]))
    }
    return result
  }
  const groups = clauses(combined)
  if (groups.some(group => group.length > 100))
    throw new Error('Filter is too complex')
  return {
    or: groups.map(group => (group.length === 1 ? group[0] : { and: group }))
  }
}
