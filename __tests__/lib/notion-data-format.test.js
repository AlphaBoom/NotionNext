import getAllPageIds from '@/lib/db/notion/getAllPageIds'
import { filterCollectionViewData } from '@/lib/db/notion/filterCollectionViewData'
import {
  adapterNotionBlockMap,
  normalizeNotionBlockType
} from '@/lib/utils/notion.util'

jest.mock('p-limit', () => ({
  __esModule: true,
  default: jest.fn(() => fn => fn())
}))

jest.mock('notion-utils', () => ({
  getTextContent: jest.fn(value => {
    if (!Array.isArray(value)) return ''
    return value.map(item => item?.[0] || '').join('')
  })
}))

jest.mock('@/lib/cache/cache_manager', () => ({
  getDataFromCache: jest.fn(),
  getOrSetDataWithCache: jest.fn(),
  setDataToCache: jest.fn()
}))

jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {
    getPage: jest.fn(),
    getBlocks: jest.fn()
  }
}))

const { formatNotionBlock } = require('@/lib/db/notion/getPostBlocks')
const {
  getPageTableOfContents
} = require('@/lib/db/notion/getPageTableOfContents')

describe('Notion data format compatibility', () => {
  it('unwraps nested block values returned by newer Notion payloads', () => {
    const blockMap = {
      block: {
        page_1: {
          spaceId: 'space_1',
          value: {
            role: 'editor',
            value: {
              id: 'page_1',
              type: 'page',
              properties: { title: [['Hello']] }
            }
          }
        }
      },
      collection: {}
    }

    const adapted = adapterNotionBlockMap(blockMap)

    expect(adapted.block.page_1.value).toMatchObject({
      id: 'page_1',
      type: 'page',
      properties: { title: [['Hello']] }
    })
  })

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

  it('does not fall back to page_sort when the selected view query is empty', () => {
    const pageIds = getAllPageIds(
      {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: []
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

  it('filters embedded collection query results by selected view filters', () => {
    const blockMap = {
      block: {
        published_page: {
          value: {
            id: 'published_page',
            type: 'page',
            properties: {
              type: [['Post']],
              status: [['Published']]
            }
          }
        },
        draft_page: {
          value: {
            id: 'draft_page',
            type: 'page',
            properties: {
              type: [['Post']],
              status: [['Draft']]
            }
          }
        },
        invisible_page: {
          value: {
            id: 'invisible_page',
            type: 'page',
            properties: {
              type: [['Post']],
              status: [['Invisible']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              type: { name: 'type', type: 'select' },
              status: { name: 'status', type: 'select' }
            }
          }
        }
      },
      collection_view: {
        view_1: {
          value: {
            value: {
              id: 'view_1',
              page_sort: ['published_page', 'draft_page', 'invisible_page'],
              format: {
                collection_pointer: { id: 'collection_1' },
                property_filters: [
                  {
                    filter: {
                      property: 'type',
                      filter: {
                        operator: 'enum_is',
                        value: { type: 'exact', value: 'Post' }
                      }
                    }
                  },
                  {
                    filter: {
                      property: 'status',
                      filter: {
                        operator: 'enum_is',
                        value: { type: 'exact', value: 'Published' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: ['published_page', 'draft_page', 'invisible_page']
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['published_page'])
    expect(blockMap.collection_view.view_1.value.value.page_sort).toEqual([
      'published_page'
    ])
  })

  it('matches multi-select contains filters when values are comma-separated', () => {
    const blockMap = {
      block: {
        tech_page: {
          value: {
            id: 'tech_page',
            type: 'page',
            properties: {
              tags: [['Tech,Life']]
            }
          }
        },
        life_page: {
          value: {
            id: 'life_page',
            type: 'page',
            properties: {
              tags: [['Life']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              tags: { name: 'Tags', type: 'multi_select' }
            }
          }
        }
      },
      collection_view: {
        view_1: {
          value: {
            value: {
              id: 'view_1',
              page_sort: ['tech_page', 'life_page'],
              format: {
                collection_pointer: { id: 'collection_1' },
                property_filters: [
                  {
                    filter: {
                      property: 'tags',
                      filter: {
                        operator: 'multi_select_contains',
                        value: { type: 'exact', value: 'Tech' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: ['tech_page', 'life_page']
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['tech_page'])
    expect(blockMap.collection_view.view_1.value.value.page_sort).toEqual([
      'tech_page'
    ])
  })

  it('matches multi-select does-not-contain filters when values are comma-separated', () => {
    const blockMap = {
      block: {
        tech_page: {
          value: {
            id: 'tech_page',
            type: 'page',
            properties: {
              tags: [['Tech,Life']]
            }
          }
        },
        life_page: {
          value: {
            id: 'life_page',
            type: 'page',
            properties: {
              tags: [['Life']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              tags: { name: 'Tags', type: 'multi_select' }
            }
          }
        }
      },
      collection_view: {
        view_1: {
          value: {
            value: {
              id: 'view_1',
              page_sort: ['tech_page', 'life_page'],
              format: {
                collection_pointer: { id: 'collection_1' },
                property_filters: [
                  {
                    filter: {
                      property: 'tags',
                      filter: {
                        operator: 'multi_select_does_not_contain',
                        value: { type: 'exact', value: 'Tech' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: ['tech_page', 'life_page']
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['life_page'])
    expect(blockMap.collection_view.view_1.value.value.page_sort).toEqual([
      'life_page'
    ])
  })

  it('normalizes reducerResults collection group data for gallery rendering', () => {
    const blockMap = {
      block: {
        page_1: {
          value: {
            id: 'page_1',
            type: 'page',
            properties: {
              title: [['Gallery item']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              title: { name: 'title', type: 'title' }
            }
          }
        }
      },
      collection_view: {
        view_1: {
          value: {
            value: {
              id: 'view_1',
              type: 'gallery',
              format: {
                collection_pointer: { id: 'collection_1' },
                gallery_cover: { type: 'page_content' }
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          view_1: {
            reducerResults: {
              collection_group_results: {
                blockIds: ['page_1'],
                hasMore: false,
                type: 'results'
              }
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['page_1'])
  })

  it('does not replace existing collection group results with reducerResults', () => {
    const blockMap = {
      block: {
        visible_page: {
          value: {
            id: 'visible_page',
            type: 'page',
            properties: {
              title: [['Visible']]
            }
          }
        },
        reducer_only_page: {
          value: {
            id: 'reducer_only_page',
            type: 'page',
            properties: {
              title: [['Reducer only']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              title: { name: 'title', type: 'title' }
            }
          }
        }
      },
      collection_view: {
        view_1: {
          value: {
            value: {
              id: 'view_1',
              type: 'gallery',
              format: {
                collection_pointer: { id: 'collection_1' }
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: ['visible_page']
            },
            reducerResults: {
              collection_group_results: {
                blockIds: ['reducer_only_page']
              }
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['visible_page'])
  })

  it('matches localized Notion status values through status groups', () => {
    const blockMap = {
      block: {
        progress_page: {
          value: {
            id: 'progress_page',
            type: 'page',
            properties: {
              status: [['进行中']],
              title: [['照片标题2']]
            }
          }
        },
        todo_page: {
          value: {
            id: 'todo_page',
            type: 'page',
            properties: {
              title: [['照片标题1']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              status: {
                name: '状态',
                type: 'status',
                groups: [
                  {
                    name: 'In progress',
                    optionIds: ['option_progress']
                  }
                ],
                options: [
                  {
                    id: 'option_progress',
                    value: '进行中'
                  }
                ]
              }
            }
          }
        }
      },
      collection_view: {
        view_1: {
          value: {
            value: {
              id: 'view_1',
              page_sort: ['progress_page', 'todo_page'],
              format: {
                collection_pointer: { id: 'collection_1' },
                property_filters: [
                  {
                    filter: {
                      property: 'status',
                      filter: {
                        operator: 'status_is',
                        value: { type: 'is_group', value: 'In progress' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: ['progress_page', 'todo_page']
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['progress_page'])
    expect(blockMap.collection_view.view_1.value.value.page_sort).toEqual([
      'progress_page'
    ])
  })

  it('filters embedded collection results from query2 compound filters', () => {
    const blockMap = {
      block: {
        selected_page: {
          value: {
            id: 'selected_page',
            type: 'page',
            properties: {
              title: [['Alpha release']],
              priority: [['5']]
            }
          }
        },
        low_priority_page: {
          value: {
            id: 'low_priority_page',
            type: 'page',
            properties: {
              title: [['Alpha draft']],
              priority: [['1']]
            }
          }
        },
        wrong_title_page: {
          value: {
            id: 'wrong_title_page',
            type: 'page',
            properties: {
              title: [['Beta release']],
              priority: [['5']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              title: { name: 'title', type: 'title' },
              priority: { name: 'priority', type: 'number' }
            }
          }
        }
      },
      collection_view: {
        view_1: {
          value: {
            value: {
              id: 'view_1',
              format: {
                collection_pointer: { id: 'collection_1' }
              },
              query2: {
                filter: {
                  operator: 'and',
                  filters: [
                    {
                      property: 'title',
                      filter: {
                        operator: 'string_contains',
                        value: { type: 'exact', value: 'Alpha' }
                      }
                    },
                    {
                      property: 'priority',
                      filter: {
                        operator: 'number_greater_than',
                        value: { type: 'exact', value: 3 }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          view_1: {
            collection_group_results: {
              blockIds: [
                'selected_page',
                'low_priority_page',
                'wrong_title_page'
              ]
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['selected_page'])
  })

  it.each([
    {
      label: 'text by property name',
      key: 'slug',
      schema: { name: 'Slug', type: 'text' },
      property: 'Slug',
      direction: 'ascending',
      values: [[['beta']], [['alpha']]]
    },
    {
      label: 'numbers by property id',
      key: 'priority',
      schema: { name: 'Priority', type: 'number' },
      property: 'priority',
      direction: 'descending',
      values: [[['1']], [['9']]]
    },
    {
      label: 'dates',
      key: 'date',
      schema: { name: 'Date', type: 'date' },
      property: 'Date',
      direction: 'ascending',
      values: [
        [['‣', [['d', { start_date: '2026-07-18' }]]]],
        [['‣', [['d', { start_date: '2026-07-01' }]]]]
      ]
    },
    {
      label: 'times on the same date without page_sort',
      key: 'date',
      schema: { name: 'Date', type: 'date' },
      property: 'date',
      direction: 'ascending',
      pageSort: false,
      values: [
        [['‣', [['d', { start_date: '2026-07-18', start_time: '18:00' }]]]],
        [['‣', [['d', { start_date: '2026-07-18', start_time: '09:00' }]]]]
      ]
    },
    {
      label: 'select option order',
      key: 'category',
      schema: {
        name: 'Category',
        type: 'select',
        options: [
          { id: 'option_apple', name: '苹果', value: '苹果' },
          { id: 'option_cherry', name: '樱桃', value: '樱桃' }
        ]
      },
      property: 'Category',
      direction: 'ascending',
      values: [[['樱桃']], [['苹果']]]
    }
  ])(
    'sorts embedded collection results by $label',
    ({ key, schema, property, direction, values, pageSort = true }) => {
      const ids = ['first_page', 'second_page']
      const view = {
        id: 'view_1',
        ...(pageSort ? { page_sort: [...ids] } : {}),
        format: { collection_pointer: { id: 'collection_1' } },
        query2: { sort: [{ property, direction }] }
      }
      const blockMap = {
        block: Object.fromEntries(
          ids.map((id, i) => [
            id,
            {
              value: { id, type: 'page', properties: { [key]: values[i] } }
            }
          ])
        ),
        collection: {
          collection_1: { value: { schema: { [key]: schema } } }
        },
        collection_view: { view_1: { value: { value: view } } },
        collection_query: {
          collection_1: {
            view_1: { collection_group_results: { blockIds: [...ids] } }
          }
        }
      }

      filterCollectionViewData(blockMap)

      const sorted = ['second_page', 'first_page']
      expect(
        blockMap.collection_query.collection_1.view_1.collection_group_results
          .blockIds
      ).toEqual(sorted)
      if (pageSort) expect(view.page_sort).toEqual(sorted)
    }
  )

  it('inherits sibling filters for embedded collection views without filters', () => {
    const blockMap = {
      block: {
        collection_block: {
          value: {
            id: 'collection_block',
            type: 'collection_view',
            view_ids: ['gallery_view', 'board_view', 'list_view']
          }
        },
        progress_page: {
          value: {
            id: 'progress_page',
            type: 'page',
            properties: {
              status: [['进行中']],
              title: [['照片标题2']]
            }
          }
        },
        todo_page: {
          value: {
            id: 'todo_page',
            type: 'page',
            properties: {
              title: [['照片标题1']]
            }
          }
        }
      },
      collection: {
        collection_1: {
          value: {
            schema: {
              status: {
                name: '状态',
                type: 'status',
                groups: [
                  {
                    name: 'In progress',
                    optionIds: ['option_progress']
                  }
                ],
                options: [
                  {
                    id: 'option_progress',
                    value: '进行中'
                  }
                ]
              }
            }
          }
        }
      },
      collection_view: {
        gallery_view: {
          value: {
            value: {
              id: 'gallery_view',
              type: 'gallery',
              format: {
                collection_pointer: { id: 'collection_1' }
              }
            }
          }
        },
        board_view: {
          value: {
            value: {
              id: 'board_view',
              type: 'board',
              format: {
                collection_pointer: { id: 'collection_1' },
                property_filters: [
                  {
                    filter: {
                      property: 'status',
                      filter: {
                        operator: 'status_is',
                        value: { type: 'is_group', value: 'In progress' }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        list_view: {
          value: {
            value: {
              id: 'list_view',
              type: 'list',
              format: {
                collection_pointer: { id: 'collection_1' }
              }
            }
          }
        }
      },
      collection_query: {
        collection_1: {
          gallery_view: {
            collection_group_results: {
              blockIds: ['progress_page', 'todo_page']
            }
          },
          board_view: {
            collection_group_results: {
              blockIds: ['progress_page', 'todo_page']
            }
          },
          list_view: {
            collection_group_results: {
              blockIds: ['progress_page', 'todo_page']
            }
          }
        }
      }
    }

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.gallery_view
        .collection_group_results.blockIds
    ).toEqual(['progress_page'])
    expect(
      blockMap.collection_query.collection_1.list_view.collection_group_results
        .blockIds
    ).toEqual(['progress_page'])
  })

  it('normalizes nested blocks and strips crdt fields before rendering', () => {
    const formatted = formatNotionBlock({
      page_1: {
        value: {
          value: {
            id: 'page_1',
            type: 'image',
            crdt_data: { noisy: true },
            crdt_format_version: 1,
            properties: {
              source: [['https:example.com/image.png']]
            }
          },
          role: 'editor'
        }
      }
    })

    expect(formatted.page_1.value).toMatchObject({
      id: 'page_1',
      type: 'image'
    })
    expect(formatted.page_1.value.crdt_data).toBeUndefined()
    expect(formatted.page_1.value.crdt_format_version).toBeUndefined()
    expect(formatted.page_1.value.properties.source[0][0]).toBe(
      'https://example.com/image.png'
    )
  })

  it('downgrades newer heading block types for older renderers', () => {
    expect(normalizeNotionBlockType('heading_1')).toBe('header')
    expect(normalizeNotionBlockType('heading_2')).toBe('sub_header')
    expect(normalizeNotionBlockType('heading_3')).toBe('sub_sub_header')
    expect(normalizeNotionBlockType('heading_4')).toBe('header_4')
    expect(normalizeNotionBlockType('header_4')).toBe('header_4')
  })

  it('keeps header_4 blocks as renderable fourth-level headings', () => {
    const formatted = formatNotionBlock({
      page_1: {
        value: {
          id: 'page_1',
          type: 'header_4',
          properties: {
            title: [['Section 4']]
          }
        }
      }
    })

    expect(formatted.page_1.value.type).toBe('header_4')
  })

  it('builds a stable toc for newer heading block types', () => {
    const page = {
      id: 'page_root',
      content: ['h1', 'h4']
    }
    const recordMap = {
      block: {
        h1: {
          value: {
            id: 'h1',
            type: 'header',
            properties: { title: [['Top']] }
          }
        },
        h4: {
          value: {
            id: 'h4',
            type: 'header_4',
            properties: { title: [['Deep']] }
          }
        }
      }
    }

    expect(getPageTableOfContents(page, recordMap)).toEqual([
      expect.objectContaining({ id: 'h1', indentLevel: 0 }),
      expect.objectContaining({ id: 'h4', indentLevel: 1 })
    ])
  })
})
