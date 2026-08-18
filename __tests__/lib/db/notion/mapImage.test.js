/** @jest-environment node */

jest.mock('@/blog.config', () => ({
  NOTION_HOST: 'https://www.notion.so',
  RANDOM_IMAGE_URL: ''
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(() => 800)
}))

const { compressImage } = require('@/lib/db/notion/mapImage')

describe('compressImage', () => {
  it('compresses newer Notion attachment proxy URLs', () => {
    const source =
      'https://www.notion.so/image/attachment%3Apage-id%3Acover.png?table=block&id=page-id'

    const result = new URL(compressImage(source, 800))

    expect(result.searchParams.get('width')).toBe('800')
    expect(result.searchParams.get('cache')).toBe('v2')
  })

  it('does not append Notion parameters to unrelated image hosts', () => {
    const source = 'https://example.com/cover.png'

    expect(compressImage(source, 800)).toBe(source)
  })
})
