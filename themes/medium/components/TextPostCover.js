// Render from article metadata so covers are immediate, deterministic and editable in Notion.
const TextPostCover = ({ post }) => {
  const category = post.category || post.tagItems?.[0]?.name || '随笔'
  const tone = Array.from(category).reduce((sum, char) => sum + char.codePointAt(0), 0) % 3

  return (
    <span className={`medium-text-cover medium-text-cover-tone-${tone}`}>
      <span className='medium-text-cover-category'>{category}</span>
      <span className='medium-text-cover-title'>{post.title || '未命名文章'}</span>
      {post.summary && <span className='medium-text-cover-summary'>{post.summary}</span>}
    </span>
  )
}

export default TextPostCover
