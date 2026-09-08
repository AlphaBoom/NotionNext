export default function SearchHighlight({ text = '', keyword }) {
  if (!keyword) return text
  const source = String(text)
  const needle = keyword.toLowerCase()
  const lower = source.toLowerCase()
  const parts = []
  let offset = 0
  let index = lower.indexOf(needle)
  while (index !== -1) {
    parts.push(source.slice(offset, index))
    parts.push(
      <mark key={index} className='medium-search-highlight'>
        {source.slice(index, index + keyword.length)}
      </mark>
    )
    offset = index + keyword.length
    index = lower.indexOf(needle, offset)
  }
  parts.push(source.slice(offset))
  return parts
}
