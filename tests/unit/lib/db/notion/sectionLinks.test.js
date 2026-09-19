import {
  getArticleSectionHref,
  getNotionLinkId,
  mapArticlePageUrl
} from '@/lib/db/notion/sectionLinks'

const pageId = '3dd41bc4-e39b-8073-a594-f90c420c5f30'
const headingId = '3dd41bc4-e39b-80a4-aa3c-c22d13c145ec'
const hash = '#3dd41bc4e39b80a4aa3cc22d13c145ec'
const otherId = '3d941bc4-e39b-80fd-84c8-f3795b147af2'
const article = {
  pageId,
  pageHref: '/article/20260917',
  siteOrigin: 'https://notion.alphaboom.cn',
  blockMap: {
    block: {
      [pageId]: { value: { id: pageId, type: 'page' } },
      [headingId]: {
        value: { id: headingId, type: 'sub_header', parent_id: pageId }
      },
      [otherId]: { value: { id: otherId, type: 'page', parent_id: pageId } }
    }
  }
}

it.each([
  hash,
  `#${headingId}`,
  `/3dd41bc4e39b8073a594f90c420c5f30${hash}`,
  `https://app.notion.com/p/3dd41bc4e39b8073a594f90c420c5f30?pvs=24${hash}`,
  `https://www.notion.so/${pageId}#${headingId}`,
  `https://alphaboom.notion.site/AI-3dd41bc4e39b8073a594f90c420c5f30?pvs=24${hash}`,
  `/article/20260917${hash}`,
  `https://notion.alphaboom.cn/article/20260917/${hash}`,
  `/${headingId}`
])(
  'resolves the current article section without a page navigation: %s',
  href => {
    expect(getArticleSectionHref(href, article)).toBe(hash)
  }
)

it('maps native block mentions to a fragment while keeping child pages as pages', () => {
  expect(mapArticlePageUrl(headingId, article)).toBe(hash)
  expect(mapArticlePageUrl(otherId, article)).toBe(
    '/3d941bc4e39b80fd84c8f3795b147af2'
  )
})

it('does not mistake another document or unrelated host for the current article', () => {
  for (const href of [
    `https://www.notion.so/${otherId}${hash}`,
    `https://example.com/${pageId}${hash}`,
    `https://notion.so.evil.test/${pageId}${hash}`,
    `https://example.com/article/20260917${hash}`,
    '/article/another-post#section',
    'mailto:someone@example.com',
    null
  ])
    expect(getArticleSectionHref(href, article)).toBeNull()
})

it('resolves nested current-page blocks but not headings from another article', () => {
  const nestedId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const blockMap = {
    block: {
      ...article.blockMap.block,
      [nestedId]: {
        value: { id: nestedId, type: 'sub_header', parent_id: headingId }
      }
    }
  }
  expect(mapArticlePageUrl(nestedId, { ...article, blockMap })).toBe(
    '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  blockMap.block[nestedId].value.parent_id = otherId
  expect(mapArticlePageUrl(nestedId, { ...article, blockMap })).toBe(
    '/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  blockMap.block[nestedId].value.parent_id = nestedId
  expect(mapArticlePageUrl(nestedId, { ...article, blockMap })).toBe(
    '/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
})

it('preserves non-UUID fragments and tolerates missing record data', () => {
  expect(getArticleSectionHref('#my-section', article)).toBe('#my-section')
  expect(mapArticlePageUrl(headingId, { pageId })).toBe(
    '/3dd41bc4e39b80a4aa3cc22d13c145ec'
  )
  expect(getNotionLinkId('not a URL')).toBeNull()
})
