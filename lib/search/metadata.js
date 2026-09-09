export function normalizeKeyword(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function matchesMetadata(post, keyword) {
  const query = normalizeKeyword(keyword).toLowerCase()
  if (!query) return false
  const text = [post.title, post.summary, post.tags, post.category]
    .flat()
    .filter(value => typeof value === 'string')
    .join(' ')
  return text.toLowerCase().includes(query)
}
