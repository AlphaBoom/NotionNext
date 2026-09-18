/** @jest-environment node */
import { prunePageScope } from '@/lib/notion/database/pageScope'

const record = (id, type, rest = {}) => ({ value: { id, type, ...rest } })

it('keeps synced content, even when previously mentioned, without traversing child pages or cycles', () => {
  const block = {
    root: record('root', 'page', {
      properties: { title: [['Reference', [['p', 'original']]]] },
      content: ['reference']
    }),
    reference: record('reference', 'transclusion_reference', {
      format: { transclusion_reference_pointer: { id: 'original' } }
    }),
    original: record('original', 'transclusion_container', {
      content: ['paragraph', 'nested', 'child']
    }),
    paragraph: record('paragraph', 'text', {
      properties: { title: [['Synced text']] }
    }),
    nested: record('nested', 'transclusion_reference', {
      format: { transclusion_reference_pointer: { id: 'nested-original' } }
    }),
    'nested-original': record('nested-original', 'transclusion_container', {
      content: ['nested-paragraph', 'reference']
    }),
    'nested-paragraph': record('nested-paragraph', 'text'),
    child: record('child', 'page', { content: ['child-body'] }),
    'child-body': record('child-body', 'text'),
    unrelated: record('unrelated', 'text')
  }
  const result = prunePageScope({ block }, 'root')
  expect(Object.keys(result.block).sort()).toEqual([
    'child',
    'nested',
    'nested-original',
    'nested-paragraph',
    'original',
    'paragraph',
    'reference',
    'root'
  ])
  expect(result.block.paragraph).toEqual(block.paragraph)
  expect(block['child-body']).toBeDefined()
})

it('keeps link-to-page and database alias metadata without loading their contents', () => {
  const block = {
    root: record('root', 'page', {
      content: ['page-link', 'database-link', 'broken-link']
    }),
    'page-link': record('page-link', 'alias', {
      format: { alias_pointer: { id: 'target' } }
    }),
    target: record('target', 'page', { content: ['target-body'] }),
    'target-body': record('target-body', 'text'),
    'database-link': record('database-link', 'alias', {
      format: { alias_pointer: { id: 'database' } }
    }),
    database: record('database', 'collection_view_page', {
      collection_id: 'collection',
      view_ids: ['view'],
      content: ['row']
    }),
    row: record('row', 'page'),
    'broken-link': record('broken-link', 'alias', {
      format: { alias_pointer: { id: 'missing' } }
    })
  }
  const result = prunePageScope(
    {
      block,
      collection: {
        collection: { value: { id: 'collection', name: [['Database']] } },
        unrelated: {}
      },
      collection_view: { view: { value: { id: 'view' } }, unrelated: {} },
      collection_query: { collection: { view: { blockIds: ['row'] } } },
      signed_urls: { target: 'target-icon', unrelated: 'unrelated-icon' }
    },
    'root'
  )
  expect(result.block.target).toEqual(block.target)
  expect(result.block.database).toEqual(block.database)
  expect(result.block['target-body']).toBeUndefined()
  expect(result.block.row).toBeUndefined()
  expect(result.block.missing).toBeUndefined()
  expect(Object.keys(result.collection)).toEqual(['collection'])
  expect(Object.keys(result.collection_view)).toEqual(['view'])
  expect(result.collection_query).toEqual({})
  expect(result.signed_urls).toEqual({ target: 'target-icon' })
})
