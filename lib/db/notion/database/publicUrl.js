import BLOG from '@/blog.config'
import { compactId } from './model'

export function publicNotionUrl(id, viewId) {
  const host = (BLOG.NOTION_PUBLIC_HOST || 'https://www.notion.so').replace(
    /\/$/,
    ''
  )
  return `${host}/${compactId(id)}${viewId ? `?v=${compactId(viewId)}` : ''}`
}
