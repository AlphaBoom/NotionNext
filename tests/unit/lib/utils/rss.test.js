import fs from 'fs'
import {
  buildRssFeeds,
  generateRss,
  shouldGenerateRssForLocale
} from '@/lib/utils/rss'
import { getPostBlocks } from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'

const addItemMock = jest.fn()
const rss2Mock = jest.fn(() => '<rss>ok</rss>')
const atom1Mock = jest.fn(() => '<atom>ok</atom>')
const json1Mock = jest.fn(() => '{"ok":true}')

jest.mock('feed', () => ({
  Feed: jest.fn().mockImplementation(() => ({
    addItem: addItemMock,
    rss2: rss2Mock,
    atom1: atom1Mock,
    json1: json1Mock
  }))
}))

jest.mock('react-dom/server', () => ({
  __esModule: true,
  default: {
    renderToString: jest.fn(() => '<div>rss-content</div>')
  }
}))

jest.mock('@/components/NotionPage', () => ({
  __esModule: true,
  default: () => null
}))

jest.mock('@/lib/db/SiteDataApi', () => ({
  getPostBlocks: jest.fn()
}))

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  formatNotionBlock: jest.fn(block => block)
}))

jest.mock('@/lib/utils/notion.util', () => ({
  adapterNotionBlockMap: jest.fn(blockMap => blockMap)
}))

describe('generateRss', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    adapterNotionBlockMap.mockImplementation(value => value)
    formatNotionBlock.mockImplementation(value => value)
    jest.spyOn(fs, 'statSync').mockImplementation(() => {
      throw new Error('ENOENT')
    })
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {})
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('adapts and formats blockMap before rendering RSS content', async () => {
    const rawBlockMap = {
      block: {
        'post-1': { id: 'post-1', type: 'page' }
      }
    }
    const adaptedBlockMap = {
      block: {
        'post-1': { id: 'post-1', type: 'page' },
        y1: { id: 'y1', type: 'text' }
      }
    }
    const formattedBlock = {
      y1: { id: 'y1', type: 'text', properties: {} }
    }

    getPostBlocks.mockResolvedValue(rawBlockMap)
    adapterNotionBlockMap.mockReturnValue(adaptedBlockMap)
    formatNotionBlock.mockReturnValue(formattedBlock)

    await generateRss({
      NOTION_CONFIG: {
        AUTHOR: 'author',
        LANG: 'zh-CN',
        SUB_PATH: '',
        CONTACT_EMAIL: ''
      },
      siteInfo: {
        title: 'site',
        description: 'desc',
        link: 'https://example.com'
      },
      allPages: [
        {
          type: 'Post',
          status: 'Published',
          id: 'post-1',
          slug: 'hello',
          title: 'Hello',
          summary: 'Summary',
          publishDay: '2026-02-18'
        }
      ]
    })

    expect(getPostBlocks).toHaveBeenCalledWith('post-1', 'rss-content', {
      cacheVersion: undefined
    })
    expect(adapterNotionBlockMap).toHaveBeenCalledWith(rawBlockMap)
    expect(formatNotionBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        y1: expect.objectContaining({ id: 'y1', type: 'text' })
      })
    )
    expect(addItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '<div>rss-content</div>'
      })
    )
    expect(fs.writeFileSync).toHaveBeenCalledTimes(3)
  })

  it('generates RSS only for the default locale during multi-locale builds', () => {
    expect(shouldGenerateRssForLocale({ locale: undefined })).toBe(true)
    expect(
      shouldGenerateRssForLocale({ locale: 'zh-CN', defaultLocale: 'zh-CN' })
    ).toBe(true)
    expect(
      shouldGenerateRssForLocale({ locale: 'en', defaultLocale: 'zh-CN' })
    ).toBe(false)
  })

  it('includes AI disclosure in full feeds and in the summary-only locked article path', async () => {
    getPostBlocks.mockResolvedValue({
      block: { generated: { value: { id: 'generated', type: 'page' } } }
    })
    await generateRss({
      NOTION_CONFIG: {
        AUTHOR: 'author',
        LANG: 'zh-CN',
        SUB_PATH: '',
        CONTACT_EMAIL: ''
      },
      siteInfo: {
        title: 'site',
        description: 'desc',
        link: 'https://example.com'
      },
      allPages: [
        {
          type: 'Post',
          status: 'Published',
          id: 'generated',
          slug: 'generated',
          title: 'Generated',
          summary: '摘要',
          publishDay: '2026-09-08',
          writingMode: 'ai-generated'
        },
        {
          type: 'Post',
          status: 'Published',
          id: 'polished',
          slug: 'polished',
          title: 'Polished',
          summary: '锁定摘要',
          publishDay: '2026-09-08',
          writingMode: 'ai-polished',
          password: 'locked'
        }
      ]
    })
    expect(addItemMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: 'Generated',
        description:
          '[AI 生成] 本文由我提供大纲和写作思路，使用 AI 辅助生成正文。 摘要',
        content:
          '<p>本文由我提供大纲和写作思路，使用 AI 辅助生成正文。</p><div>rss-content</div>'
      })
    )
    expect(addItemMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        title: 'Polished',
        description:
          '[AI 润色] 本文由我撰写初稿，使用 AI 辅助润色措辞和语句，保留原有观点和主要内容。 锁定摘要',
        content:
          '[AI 润色] 本文由我撰写初稿，使用 AI 辅助润色措辞和语句，保留原有观点和主要内容。 锁定摘要'
      })
    )
    expect(getPostBlocks).toHaveBeenCalledTimes(1)
  })

  it('uses the same 20 published articles and original dates in real RSS, Atom and JSON feeds', async () => {
    const { Feed } = require('feed')
    const ActualFeed = jest.requireActual('feed').Feed
    Feed.mockImplementationOnce(options => new ActualFeed(options))
    getPostBlocks.mockImplementation(async id => ({
      block: { [id]: { value: { id, type: 'page' } } }
    }))
    adapterNotionBlockMap.mockImplementation(value => value)
    formatNotionBlock.mockImplementation(value => value)
    const allPages = Array.from({ length: 25 }, (_, index) => ({
      id: `post-${index + 1}`,
      type: 'Post',
      status: 'Published',
      title: `Post ${index + 1}`,
      slug: `article/${index + 1}`,
      href: `/article/${index + 1}.html`,
      publishDate: Date.UTC(2026, 0, index + 1, 12),
      lastEditedDate: Date.UTC(2026, 8, 25 - index)
    }))
    allPages.push(
      { ...allPages[0], id: 'draft', status: 'Draft' },
      { ...allPages[0], id: 'page', type: 'Page' },
      { ...allPages[0], id: 'invalid', publishDate: 'invalid' }
    )
    const content = await buildRssFeeds({
      siteInfo: { title: 'site', link: 'https://example.com/' },
      NOTION_CONFIG: { SUB_PATH: 'blog' },
      allPages,
      latestPosts: [allPages[0]]
    })
    const rss = new DOMParser().parseFromString(content.xml, 'application/xml')
    const atom = new DOMParser().parseFromString(
      content.atomXml,
      'application/xml'
    )
    const json = JSON.parse(content.json)
    expect(rss.querySelectorAll('item')).toHaveLength(20)
    expect(atom.querySelectorAll('entry')).toHaveLength(20)
    expect(json.items).toHaveLength(20)
    expect(rss.querySelector('item title').textContent).toBe('Post 25')
    expect(rss.querySelector('item pubDate').textContent).toBe(
      'Sun, 25 Jan 2026 12:00:00 GMT'
    )
    expect(json.items[0].url).toBe('https://example.com/blog/article/25.html')
    expect(json.items[0].content_html).toBe('<div>rss-content</div>')
    expect(getPostBlocks).toHaveBeenCalledTimes(20)
    expect(allPages[0]).not.toHaveProperty('blockMap')
  })

  it('does not write a partial static feed when an article fetch fails', async () => {
    getPostBlocks.mockRejectedValue(new Error('Notion unavailable'))
    await expect(
      generateRss({
        siteInfo: { link: 'https://example.com' },
        allPages: [
          {
            id: 'post',
            type: 'Post',
            status: 'Published',
            title: 'Post',
            slug: 'post',
            publishDay: '2026-10-02'
          }
        ]
      })
    ).rejects.toThrow('Notion unavailable')
    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  it.each([null, { block: {} }, { block: { unrelated: {} } }])(
    'rejects missing article roots without writing an incomplete feed',
    async blockMap => {
      getPostBlocks.mockResolvedValue(blockMap)
      await expect(
        generateRss({
          siteInfo: { link: 'https://example.com' },
          allPages: [
            {
              id: 'post',
              type: 'Post',
              status: 'Published',
              title: 'Post',
              slug: 'post',
              publishDay: '2026-10-02'
            }
          ]
        })
      ).rejects.toThrow('RSS content is unavailable')
      expect(fs.writeFileSync).not.toHaveBeenCalled()
    }
  )
})
