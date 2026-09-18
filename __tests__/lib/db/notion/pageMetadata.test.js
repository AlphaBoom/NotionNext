/** @jest-environment node */
import { getNotionPageTitle, isDatabaseEntryPage } from '@/lib/db/notion/pageMetadata'

// notion-utils is ESM-only; match the dependency boundary used by the other Notion tests.
jest.mock('notion-utils', () => ({
  getTextContent: text => text.map(segment => segment[0]).join(''),
  idToUuid: id => id.replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    '$1-$2-$3-$4-$5'
  )
}))

const entry = value => ({ value })
const publishingPageIds = ['article', 'directory']
const recordMap = {
  block: {
    article: entry({ type: 'page', parent_id: 'blog', parent_table: 'collection' }),
    directory: entry({ type: 'page', parent_id: 'blog', parent_table: 'collection' }),
    list: entry({ type: 'collection_view_page', collection_id: 'aux', parent_id: 'directory' }),
    row: entry({ type: 'page', parent_id: 'aux', parent_table: 'collection' }),
    child: entry({ type: 'page', parent_id: 'row', parent_table: 'block' }),
    articleChild: entry({ type: 'page', parent_id: 'article', parent_table: 'block' })
  },
  collection: {
    blog: entry({ name: [['Blog']] }),
    aux: entry({ name: [['Any new database']], parent_id: 'list' })
  }
}

describe('Notion page metadata', () => {
  it('uses the collection name for a full-page database without a page title', () => {
    expect(getNotionPageTitle(recordMap.block.list.value, recordMap)).toBe('Any new database')
    expect(getNotionPageTitle({ format: { collection_pointer: { id: 'aux' } } }, recordMap))
      .toBe('Any new database')
  })

  it('joins formatted title segments and handles genuinely untitled pages', () => {
    expect(getNotionPageTitle({ properties: { title: [['First', [['b']]], [' second']] } }, {}))
      .toBe('First second')
    expect(getNotionPageTitle({}, {})).toBe('无标题')
  })

  it.each([
    ['article', false],
    ['directory', false],
    ['list', false],
    ['row', true],
    ['child', true],
    ['articleChild', false]
  ])('classifies %s by its nearest owning database, not embedded collections', async (pageId, expected) => {
    expect(await isDatabaseEntryPage({ pageId, recordMap, publishingPageIds })).toBe(expected)
  })

  it('recognizes a collection parent even if parent_table was omitted', async () => {
    const map = { ...recordMap, block: { row: entry({ parent_id: 'aux' }) } }
    expect(await isDatabaseEntryPage({ pageId: 'row', recordMap: map, publishingPageIds })).toBe(true)
  })

  it('loads a missing ancestor before deciding whether a descendant is indexable', async () => {
    const parentId = '11111111-1111-1111-1111-111111111111'
    const map = { block: { child: entry({ parent_id: parentId }) } }
    const loadBlock = jest.fn().mockResolvedValue({ parent_id: 'aux', parent_table: 'collection' })
    expect(await isDatabaseEntryPage({ pageId: 'child', recordMap: map, publishingPageIds, loadBlock })).toBe(true)
    expect(loadBlock).toHaveBeenCalledWith(parentId)
  })

  it('recognizes compact UUID aliases of publishing pages', async () => {
    expect(await isDatabaseEntryPage({
      pageId: '11111111111111111111111111111111',
      recordMap: {},
      publishingPageIds: ['11111111-1111-1111-1111-111111111111']
    })).toBe(false)
  })

  it('does not index pages with incomplete or cyclic ancestry', async () => {
    expect(await isDatabaseEntryPage({ pageId: 'missing', recordMap, publishingPageIds })).toBe(true)
    expect(await isDatabaseEntryPage({
      pageId: 'loop',
      recordMap: { block: { loop: entry({ parent_id: 'loop' }) } },
      publishingPageIds
    })).toBe(true)
  })
})
