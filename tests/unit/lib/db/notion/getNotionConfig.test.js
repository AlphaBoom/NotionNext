jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchNotionPageBlocks: jest.fn()
}))
jest.mock('@/lib/plugins/mailEncrypt', () => ({
  encryptEmail: jest.fn(value => value)
}))
jest.mock('notion-utils', () => ({
  getDateValue: jest.fn(),
  getTextContent: jest.fn(value => value?.[0]?.[0] || '')
}))

import { parseConfigFromPage } from '@/lib/db/notion/getNotionConfig'

describe('parseConfigFromPage', () => {
  it('rejects a missing used config query while preserving a genuinely empty configuration table', () => {
    const recordMap = {
      block: {
        table: {
          value: {
            id: 'table',
            type: 'collection_view',
            collection_id: 'settings',
            view_ids: ['selected']
          }
        }
      },
      collection: { settings: { value: { schema: {} } } },
      collection_query: { settings: { unrelated: { blockIds: [] } } }
    }
    expect(() => parseConfigFromPage(recordMap, ['table'])).toThrow(
      'Notion collection query is unavailable'
    )
    recordMap.collection_query.settings = { selected: { blockIds: [] } }
    expect(parseConfigFromPage(recordMap, ['table'])).toEqual({})
  })

  it.each(['collection_view', 'collection_view_page'])(
    'reads config from a %s database block',
    type => {
      const recordMap = {
        block: {
          table: {
            value: {
              id: 'table',
              type,
              collection_id: 'collection',
              view_ids: ['view']
            }
          },
          row: {
            value: {
              id: 'row',
              properties: {
                key: [['AUTHOR']],
                value: [['Example Author']],
                enable: [['Yes']]
              }
            }
          }
        },
        collection: {
          collection: {
            value: {
              schema: {
                key: { name: '配置名', type: 'title' },
                value: { name: '配置值', type: 'text' },
                enable: { name: '启用', type: 'text' }
              }
            }
          }
        },
        collection_query: {
          collection: {
            view: {
              blockIds: ['row']
            }
          }
        },
        collection_view: {}
      }

      expect(parseConfigFromPage(recordMap, ['table'])).toEqual({
        AUTHOR: 'Example Author'
      })
    }
  )
})
