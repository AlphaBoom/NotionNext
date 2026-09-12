/** @jest-environment node */

jest.mock('@/blog.config', () => ({
  NOTION_HOST: 'https://www.notion.so',
  RANDOM_IMAGE_URL: ''
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(() => 800)
}))

const BLOG = require('@/blog.config')
const {
  compressImage,
  getCoverThumbnailUrl,
  mapImgUrl
} = require('@/lib/db/notion/mapImage')
const { adapterNotionBlockMap } = require('@/lib/utils/notion.util')

describe('mapImgUrl signed attachments', () => {
  const attachment = 'attachment:file-id:blog-home.jpg'
  const block = {
    id: 'image-block-id',
    type: 'image',
    properties: { source: [[attachment]] }
  }
  const signedUrl = expiration =>
    `https://file.notion.com/f/f/space-id/file-id/blog-home.jpg?expirationTimestamp=${expiration}&signature=temporary`

  it('keeps page data and rendered image URLs stable across signature refreshes', () => {
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

    const raw = {
      block: {
        [block.id]: { value: { role: 'reader', value: block } }
      },
      signed_urls: { [block.id]: signedUrl(1) }
    }
    const original = JSON.stringify(raw)
    const expiredMap = adapterNotionBlockMap(raw)
    const freshMap = adapterNotionBlockMap({
      ...raw,
      signed_urls: { [block.id]: signedUrl(86400000) }
    })

    expect(JSON.stringify(expiredMap)).toBe(JSON.stringify(freshMap))
    expect(JSON.stringify(raw)).toBe(original)
    expect(expiredMap.signed_urls).not.toHaveProperty(block.id)
    const imageBlock = expiredMap.block[block.id].value
    const source = expiredMap.signed_urls[block.id] || imageBlock.properties.source[0][0]
    expect(mapImgUrl(source, imageBlock)).toBe(expected)
    const sourceWithSpace = new URL(source)
    sourceWithSpace.searchParams.set('spaceId', 'space-id')
    expect(mapImgUrl(sourceWithSpace.href, imageBlock)).toBe(expected)
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

  it.each([
    'https://prod-files-secure.s3.us-west-2.amazonaws.com/c4a7c895-d8f8-4d62-b40c-6661cf05a807/4bd3ef14-0a40-4e47-b7f9-81f22ab3da76/image.png',
    'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/file-id/image.png',
    'https://secure.notion-static.com/file-id/image.png'
  ])('keeps old uploaded images stable across signature refreshes: %s', original => {
    const imageBlock = { ...block, properties: { source: [[original]] } }
    const raw = {
      block: { [block.id]: { value: imageBlock } },
      signed_urls: { [block.id]: signedUrl(1) }
    }
    const expiredMap = adapterNotionBlockMap(raw)
    const freshMap = adapterNotionBlockMap({
      ...raw,
      signed_urls: { [block.id]: signedUrl(Date.now() + 86400000) }
    })
    expect(expiredMap).toEqual(freshMap)
    expect(expiredMap.signed_urls).not.toHaveProperty(block.id)
    expect(raw.signed_urls[block.id]).toBe(signedUrl(1))

    const expected = mapImgUrl(original, imageBlock)
    // Cover both an old ISR/cache payload and a newly normalized page.
    expect(mapImgUrl(signedUrl(1), imageBlock)).toBe(expected)
    expect(mapImgUrl(`${original}?spaceId=space-id`, imageBlock)).toBe(expected)
    expect(decodeURIComponent(new URL(expected).pathname)).toBe(`/image/${original}`)
    expect(expected).not.toMatch(/expirationTimestamp|signature/)
  })

  it('does not treat an unrelated original source as a Notion upload', () => {
    const imageBlock = {
      ...block,
      properties: { source: [['https://example.com/photo.png']] }
    }
    expect(mapImgUrl(signedUrl(1), imageBlock)).toBe(`${signedUrl(1)}&t=${block.id}`)
  })

  it('leaves external image sources alone', () => {
    const source = 'https://images.example.com/cover.png'
    expect(mapImgUrl(source, block)).toBe(`${source}?t=${block.id}`)
  })

  it('keeps the input when an original attachment is unavailable', () => {
    const source = signedUrl(1)
    const imageBlock = { id: block.id, type: 'image' }
    expect(mapImgUrl(source, imageBlock)).toBe(
      `${source}&t=${block.id}`
    )
    expect(adapterNotionBlockMap({
      block: { [block.id]: { value: imageBlock } },
      signed_urls: { [block.id]: source }
    }).signed_urls[block.id]).toBe(source)
  })

  it('preserves the renderer GIF path so animations are not converted to still images', () => {
    const source = signedUrl(1).replace('.jpg', '.gif')
    const gifBlock = {
      ...block,
      properties: { source: [['attachment:file-id:animated.gif']] }
    }
    expect(mapImgUrl(source, gifBlock)).toBe(`${source}&t=${block.id}`)
    expect(adapterNotionBlockMap({
      block: { [block.id]: { value: gifBlock } },
      signed_urls: { [block.id]: source }
    }).signed_urls[block.id]).toBe(source)
  })

  it('preserves signatures for page icons, files and other media', () => {
    const source = signedUrl(1)
    for (const type of ['page', 'file', 'pdf', 'video', 'audio', 'embed']) {
      const mediaBlock = { ...block, type }
      expect(mapImgUrl(source, mediaBlock)).toBe(`${source}&t=${block.id}`)
      expect(adapterNotionBlockMap({
        block: { [block.id]: { value: mediaBlock } },
        signed_urls: { [block.id]: source }
      }).signed_urls[block.id]).toBe(source)
    }
  })
})

describe('compressImage', () => {
  it('requests a small attachment cover while keeping article images unchanged', () => {
    const host = BLOG.NOTION_HOST
    try {
      for (const origin of ['https://www.notion.so', 'https://cdn.example.com']) {
        BLOG.NOTION_HOST = origin
        const source = `${origin}/image/attachment%3Afile-id%3Acover.png?table=block&id=page-id&t=page-id`
        const thumbnail = getCoverThumbnailUrl(source, 360)
        const url = new URL(thumbnail)
        expect(url.origin).toBe(origin)
        expect(url.searchParams.get('width')).toBe('360')
        expect(url.searchParams.get('id')).toBe('page-id')
        expect(url.searchParams.get('table')).toBe('block')
        expect(url.searchParams.has('cache')).toBe(false)
        expect(getCoverThumbnailUrl(`${thumbnail}&cache=v2`, 360)).toBe(thumbnail)
        expect(compressImage(thumbnail, 360)).toBe(thumbnail)
        expect(compressImage(source, 800)).toBe(source)
      }
    } finally {
      BLOG.NOTION_HOST = host
    }
  })

  it('does not rewrite unrelated cover hosts or relative files', () => {
    for (const source of [
      '/cover.jpg',
      'https://images.example/cover.jpg',
      'https://images.example/image/attachment%3Afile-id%3Acover.png',
      'https://www.notion.so/images/page-cover/woodcuts_4.jpg'
    ]) {
      expect(getCoverThumbnailUrl(source, 360)).toBe(source)
    }
  })

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
