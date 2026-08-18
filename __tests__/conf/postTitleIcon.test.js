/**
 * @jest-environment node
 */
import BLOG from '@/blog.config'

describe('post title icon configuration', () => {
  it('does not render Notion page icons by default', () => {
    expect(BLOG.POST_TITLE_ICON).toBe(false)
  })
})
