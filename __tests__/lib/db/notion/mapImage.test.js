/** @jest-environment node */

jest.mock('@/blog.config', () => ({
  NOTION_HOST: 'https://www.notion.so',
  RANDOM_IMAGE_URL: ''
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(() => 800)
}))

const BLOG = require('@/blog.config')
const { compressImage, mapImgUrl } = require('@/lib/db/notion/mapImage')

describe('mapImgUrl signed attachments', () => {
  const attachment = 'attachment:file-id:blog-home.jpg'
  const block = {
    id: 'image-block-id',
    type: 'image',
    properties: { source: [[attachment]] }
  }
  const signedUrl = expiration =>
    `https://file.notion.com/f/f/space-id/file-id/blog-home.jpg?expirationTimestamp=${expiration}&signature=temporary`

  it('uses the same stable attachment URL before and after the signature expires', () => {
    const expected = mapImgUrl(attachment, block)
    const expired = mapImgUrl(signedUrl(1), block)
    const fresh = mapImgUrl(signedUrl(Date.now() + 86400000), block)

    expect(expired).toBe(expected)
    expect(fresh).toBe(expected)
    const result = new URL(expired)
    expect(decodeURIComponent(result.pathname)).toBe(`/image/${attachment}`)
    expect(result.searchParams.get('id')).toBe(block.id)
    expect(result.searchParams.get('table')).toBe('block')
    expect(result.searchParams.has('expirationTimestamp')).toBe(false)
    expect(result.searchParams.has('signature')).toBe(false)
    expect(result.searchParams.has('width')).toBe(false)
  })

  it('respects the configured Notion image CDN', () => {
    const host = BLOG.NOTION_HOST
    BLOG.NOTION_HOST = 'https://cdn.example.com'
    try {
      expect(new URL(mapImgUrl(signedUrl(1), block)).origin).toBe(
        BLOG.NOTION_HOST
      )
    } finally {
      BLOG.NOTION_HOST = host
    }
  })

  it('also supports the older Notion file domain', () => {
    expect(mapImgUrl(signedUrl(1).replace('file.notion.com', 'file.notion.so'), block))
      .toBe(mapImgUrl(attachment, block))
  })

  it('leaves external image sources alone', () => {
    const source = 'https://images.example.com/cover.png'
    expect(mapImgUrl(source, block)).toBe(`${source}?t=${block.id}`)
  })

  it('keeps the input when an original attachment is unavailable', () => {
    const source = signedUrl(1)
    expect(mapImgUrl(source, { id: block.id, type: 'image' })).toBe(
      `${source}&t=${block.id}`
    )
  })

  it('preserves the renderer GIF path so animations are not converted to still images', () => {
    const source = signedUrl(1).replace('.jpg', '.gif')
    const gifBlock = {
      ...block,
      properties: { source: [['attachment:file-id:animated.gif']] }
    }
    expect(mapImgUrl(source, gifBlock)).toBe(`${source}&t=${block.id}`)
  })

  it('does not substitute an unrelated page icon with the block attachment', () => {
    const source = signedUrl(1)
    expect(mapImgUrl(source, { ...block, type: 'page' })).toBe(
      `${source}&t=${block.id}`
    )
  })
})

describe('compressImage', () => {
  it('compresses non-attachment Notion proxy URLs', () => {
    const source =
      'https://www.notion.so/image/https%3A%2F%2Fimages.example.test%2Ffile.png?table=block&id=page-id'

    const result = new URL(compressImage(source, 800))

    expect(result.searchParams.get('width')).toBe('800')
    expect(result.searchParams.get('cache')).toBe('v2')
  })

  it('leaves newer attachment proxy URLs unchanged', () => {
    const source =
      'https://www.notion.so/image/attachment%3Apage-id%3Acover.png?table=block&id=page-id'

    expect(compressImage(source, 800)).toBe(source)
  })

  it('does not append Notion parameters to unrelated image hosts', () => {
    const source = 'https://example.com/cover.png'

    expect(compressImage(source, 800)).toBe(source)
  })
})
