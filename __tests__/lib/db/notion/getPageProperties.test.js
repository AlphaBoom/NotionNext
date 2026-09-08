/**
 * @jest-environment node
 */

import getPageProperties, { adjustPageProperties } from '@/lib/db/notion/getPageProperties'
import { getTextContent } from 'notion-utils'
import BLOG from '@/blog.config'

jest.mock('notion-utils', () => ({
  getDateValue: jest.fn(),
  getTextContent: jest.fn()
}))

jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {
    getUsers: jest.fn()
  }
}))

describe('adjustPageProperties', () => {
  it('uses category mapping for pages only when the page category is mapped', () => {
    const NOTION_CONFIG = {
      POST_URL_PREFIX: '%category%/%year%/%month%/%day%',
      POST_URL_PREFIX_MAPPING_CATEGORY: {
        Guide: 'manual'
      },
      PSEUDO_STATIC: false
    }

    const mappedPage = {
      id: 'page-id',
      type: 'Page',
      slug: 'a-manual',
      category: 'Guide'
    }
    const plainPage = {
      id: 'plain-id',
      type: 'Page',
      slug: 'a-book',
      category: 'Book'
    }

    adjustPageProperties(mappedPage, NOTION_CONFIG)
    adjustPageProperties(plainPage, NOTION_CONFIG)

    expect(mappedPage.slug).toBe('manual/a-manual')
    expect(mappedPage.href).toBe('/manual/a-manual')
    expect(plainPage.slug).toBe('a-book')
    expect(plainPage.href).toBe('/a-book')
  })
})

describe('optional writingMode property', () => {
  const schema = {
    title: { name: 'title', type: 'title' },
    kind: { name: 'type', type: 'select' },
    status: { name: 'status', type: 'select' },
    slug: { name: 'slug', type: 'text' }
  }
  const value = {
    properties: { title: [['测试文章']], kind: [['Post']], status: [['Published']], slug: [['existing-url']] },
    created_time: 1700000000000,
    last_edited_time: 1700000000000
  }

  beforeEach(() => {
    getTextContent.mockImplementation(parts => parts.map(part => part[0]).join(''))
  })

  it('adds an optional select without changing existing article properties', async () => {
    const baseline = await getPageProperties('post-id', value, schema)
    const newSchema = { ...schema, ai: { name: 'writingMode', type: 'select' } }
    const unfilled = await getPageProperties('post-id', value, newSchema)
    expect(unfilled).toEqual(baseline)
    expect(unfilled.writingMode).toBe('')

    for (const [label, expected] of [['AI 润色', 'ai-polished'], ['AI 生成', 'ai-generated']]) {
      const result = await getPageProperties('post-id', {
        ...value, properties: { ...value.properties, ai: [[label]] }
      }, newSchema)
      expect(result).toEqual({ ...baseline, writingMode: expected })
    }
  })

  it('respects the configured Notion property name', async () => {
    const previous = BLOG.NOTION_PROPERTY_NAME.writingMode
    BLOG.NOTION_PROPERTY_NAME.writingMode = '创作方式'
    try {
      const post = await getPageProperties('post-id', {
        ...value, properties: { ...value.properties, ai: [['AI 润色']] }
      }, { ...schema, ai: { name: '创作方式', type: 'select' } })
      expect(post.writingMode).toBe('ai-polished')
      expect(post.slug).toBe('existing-url')
      expect(post.status).toBe('Published')
    } finally {
      BLOG.NOTION_PROPERTY_NAME.writingMode = previous
    }
  })

  it('reads an optional multiline AI summary without changing the list summary or writing mode', async () => {
    const existing = { ...value, properties: { ...value.properties, summary: [['原有列表摘要']] } }
    const originalSchema = { ...schema, summary: { name: 'summary', type: 'text' } }
    const baseline = await getPageProperties('post-id', existing, originalSchema)
    const newSchema = { ...originalSchema, aiSummary: { name: 'aiSummary', type: 'text' } }
    expect(baseline.aiSummary).toBe('')
    expect(await getPageProperties('post-id', existing, newSchema)).toEqual(baseline)
    const result = await getPageProperties('post-id', {
      ...existing, properties: { ...existing.properties, aiSummary: [[' 第一段\n\n'], ['第二段 ', [['b']]]] }
    }, newSchema)
    expect(result).toEqual({ ...baseline, aiSummary: '第一段\n\n第二段' })
    const blank = await getPageProperties('post-id', {
      ...existing, properties: { ...existing.properties, aiSummary: [[' \n ']] }
    }, newSchema)
    expect(blank).toEqual(baseline)
  })

  it('supports a custom Notion column name for AI summaries', async () => {
    const previous = BLOG.NOTION_PROPERTY_NAME.aiSummary
    BLOG.NOTION_PROPERTY_NAME.aiSummary = 'AI 摘要'
    try {
      const post = await getPageProperties('post-id', {
        ...value, properties: { ...value.properties, abstract: [[' 手动选择的摘要 ']] }
      }, { ...schema, abstract: { name: 'AI 摘要', type: 'text' } })
      expect(post.aiSummary).toBe('手动选择的摘要')
      expect(post.writingMode).toBe('')
    } finally {
      BLOG.NOTION_PROPERTY_NAME.aiSummary = previous
    }
  })
})
