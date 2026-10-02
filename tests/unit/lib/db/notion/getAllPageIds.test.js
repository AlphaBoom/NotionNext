import getAllPageIds from '@/lib/db/notion/getAllPageIds'

// Keep the ESM dependency outside this unit; exercise the selected-view logic.
jest.mock('notion-utils', () => ({ idToUuid: id => id }))

describe('Notion collection page IDs', () => {
  it('requires a result from the used view and preserves explicitly empty results', () => {
    const staleView = {
      selected: { value: { value: { page_sort: ['old-row'] } } }
    }
    const read = queries =>
      getAllPageIds(
        queries,
        'publishing',
        staleView,
        ['selected', 'unused'],
        {},
        { requireQuery: true }
      )
    expect(() => read({ publishing: { unused: { blockIds: [] } } })).toThrow(
      'Notion collection query is unavailable'
    )
    expect(() => read({ publishing: { selected: {} } })).toThrow(
      'Notion collection query is unavailable'
    )
    expect(
      read({
        publishing: { selected: { collection_group_results: { blockIds: [] } } }
      })
    ).toEqual([])
  })

  it.each([
    { collection_group_results: { blockIds: ['row'] } },
    { reducerResults: { collection_group_results: { blockIds: ['row'] } } },
    { results: { blockIds: ['row'] } },
    { blockIds: ['row'] }
  ])(
    'accepts supported query result shapes during strict validation',
    result => {
      expect(
        getAllPageIds(
          { publishing: { selected: result } },
          'publishing',
          {},
          ['selected'],
          {},
          { requireQuery: true }
        )
      ).toEqual(['row'])
    }
  )

  it('extracts page ids from collection view page_sort in newer payloads', () => {
    const pageIds = getAllPageIds(
      {},
      'collection_1',
      {
        view_1: {
          value: {
            value: {
              page_sort: ['page_1', 'page_2']
            }
          }
        }
      },
      ['view_1'],
      {}
    )

    expect(pageIds).toEqual(['page_1', 'page_2'])
  })

  it('supplements truncated page_sort from the selected view query only', () => {
    const pageIds = getAllPageIds(
      {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: ['page_1', 'page_2']
            }
          },
          view_2: {
            blockIds: ['hidden_page']
          }
        }
      },
      'collection_1',
      {
        view_1: {
          value: {
            value: {
              page_sort: ['page_1']
            }
          }
        }
      },
      ['view_1'],
      {}
    )

    expect(pageIds).toEqual(['page_1', 'page_2'])
    expect(pageIds).not.toContain('hidden_page')
  })

  it('extracts page ids from reducerResults collection group data', () => {
    const pageIds = getAllPageIds(
      {
        collection_1: {
          view_1: {
            reducerResults: {
              collection_group_results: {
                blockIds: ['page_1', 'page_2']
              }
            }
          }
        }
      },
      'collection_1',
      {},
      ['view_1'],
      {}
    )

    expect(pageIds).toEqual(['page_1', 'page_2'])
  })

  it('does not merge reducerResults when collection group results are explicitly empty', () => {
    const pageIds = getAllPageIds(
      {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: []
            },
            reducerResults: {
              collection_group_results: {
                blockIds: ['filtered_out_page']
              }
            }
          }
        }
      },
      'collection_1',
      {
        view_1: {
          value: {
            value: {
              page_sort: ['filtered_out_page']
            }
          }
        }
      },
      ['view_1'],
      {}
    )

    expect(pageIds).toEqual([])
  })

  it('matches selected view query when collection ids use different uuid formats', () => {
    const pageIds = getAllPageIds(
      {
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee': {
          view_1: { blockIds: ['page_1'] },
          view_2: { blockIds: ['hidden_page'] }
        }
      },
      'aaaaaaaabbbbccccddddeeeeeeeeeeee',
      {},
      ['view_1'],
      {}
    )

    expect(pageIds).toEqual(['page_1'])
    expect(pageIds).not.toContain('hidden_page')
  })

  it('matches selected view data when view ids use different uuid formats', () => {
    const pageIds = getAllPageIds(
      {
        collection_1: {
          '11111111-2222-3333-4444-555555555555': {
            blockIds: ['page_1']
          },
          '66666666-7777-8888-9999-000000000000': {
            blockIds: ['hidden_page']
          }
        }
      },
      'collection_1',
      {},
      ['11111111222233334444555555555555'],
      {}
    )

    expect(pageIds).toEqual(['page_1'])
    expect(pageIds).not.toContain('hidden_page')
  })

  it('falls back to all query blocks when no selected view is available', () => {
    const pageIds = getAllPageIds(
      {
        collection_1: {
          view_1: { blockIds: ['page_1'] },
          view_2: { blockIds: ['page_2'] }
        }
      },
      'collection_1',
      {},
      [],
      {}
    )

    expect(pageIds).toEqual(['page_1', 'page_2'])
  })
})
