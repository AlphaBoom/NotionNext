import { filterCollectionViewData } from '@/lib/db/notion/filterCollectionViewData'

// Wrap fixture values in the wire format once; each case supplies only its data.
function collectionMap({ pages, schema, views, blocks = {}, queries }) {
  return {
    block: Object.fromEntries([
      ...Object.entries(pages).map(([id, properties]) => [
        id,
        { value: { id, type: 'page', properties } }
      ]),
      ...Object.entries(blocks).map(([id, value]) => [id, { value }])
    ]),
    collection: { collection_1: { value: { schema } } },
    collection_view: Object.fromEntries(
      Object.entries(views).map(([id, { format = {}, ...view }]) => [
        id,
        {
          value: {
            value: {
              id,
              ...view,
              format: { collection_pointer: { id: 'collection_1' }, ...format }
            }
          }
        }
      ])
    ),
    collection_query: {
      collection_1:
        queries ??
        Object.fromEntries(
          Object.keys(views).map(id => [
            id,
            {
              collection_group_results: { blockIds: Object.keys(pages) }
            }
          ])
        )
    }
  }
}

describe('Notion collection filters and ordering', () => {
  it('filters embedded collection query results by selected view filters', () => {
    const blockMap = collectionMap({
      pages: {
        published_page: { type: [['Post']], status: [['Published']] },
        draft_page: { type: [['Post']], status: [['Draft']] },
        invisible_page: { type: [['Post']], status: [['Invisible']] }
      },
      schema: {
        type: { name: 'type', type: 'select' },
        status: { name: 'status', type: 'select' }
      },
      views: {
        view_1: {
          page_sort: ['published_page', 'draft_page', 'invisible_page'],
          format: {
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
    })

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
    const blockMap = collectionMap({
      pages: {
        tech_page: { tags: [['Tech,Life']] },
        life_page: { tags: [['Life']] }
      },
      schema: { tags: { name: 'Tags', type: 'multi_select' } },
      views: {
        view_1: {
          page_sort: ['tech_page', 'life_page'],
          format: {
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
    })

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
    const blockMap = collectionMap({
      pages: {
        tech_page: { tags: [['Tech,Life']] },
        life_page: { tags: [['Life']] }
      },
      schema: { tags: { name: 'Tags', type: 'multi_select' } },
      views: {
        view_1: {
          page_sort: ['tech_page', 'life_page'],
          format: {
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
    })

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
    const blockMap = collectionMap({
      pages: { page_1: { title: [['Gallery item']] } },
      schema: { title: { name: 'title', type: 'title' } },
      views: {
        view_1: {
          type: 'gallery',
          format: { gallery_cover: { type: 'page_content' } }
        }
      },
      queries: {
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
    })

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['page_1'])
  })

  it('does not replace existing collection group results with reducerResults', () => {
    const blockMap = collectionMap({
      pages: {
        visible_page: { title: [['Visible']] },
        reducer_only_page: { title: [['Reducer only']] }
      },
      schema: { title: { name: 'title', type: 'title' } },
      views: { view_1: { type: 'gallery' } },
      queries: {
        view_1: {
          collection_group_results: { blockIds: ['visible_page'] },
          reducerResults: {
            collection_group_results: { blockIds: ['reducer_only_page'] }
          }
        }
      }
    })

    filterCollectionViewData(blockMap)

    expect(
      blockMap.collection_query.collection_1.view_1.collection_group_results
        .blockIds
    ).toEqual(['visible_page'])
  })

  it('matches localized Notion status values through status groups', () => {
    const blockMap = collectionMap({
      pages: {
        progress_page: { status: [['进行中']], title: [['照片标题2']] },
        todo_page: { title: [['照片标题1']] }
      },
      schema: {
        status: {
          name: '状态',
          type: 'status',
          groups: [{ name: 'In progress', optionIds: ['option_progress'] }],
          options: [{ id: 'option_progress', value: '进行中' }]
        }
      },
      views: {
        view_1: {
          page_sort: ['progress_page', 'todo_page'],
          format: {
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
    })

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
    const blockMap = collectionMap({
      pages: {
        selected_page: { title: [['Alpha release']], priority: [['5']] },
        low_priority_page: { title: [['Alpha draft']], priority: [['1']] },
        wrong_title_page: { title: [['Beta release']], priority: [['5']] }
      },
      schema: {
        title: { name: 'title', type: 'title' },
        priority: { name: 'priority', type: 'number' }
      },
      views: {
        view_1: {
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
    })

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
    const blockMap = collectionMap({
      pages: {
        progress_page: { status: [['进行中']], title: [['照片标题2']] },
        todo_page: { title: [['照片标题1']] }
      },
      schema: {
        status: {
          name: '状态',
          type: 'status',
          groups: [{ name: 'In progress', optionIds: ['option_progress'] }],
          options: [{ id: 'option_progress', value: '进行中' }]
        }
      },
      views: {
        gallery_view: { type: 'gallery' },
        board_view: {
          type: 'board',
          format: {
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
        },
        list_view: { type: 'list' }
      },
      blocks: {
        collection_block: {
          id: 'collection_block',
          type: 'collection_view',
          view_ids: ['gallery_view', 'board_view', 'list_view']
        }
      }
    })

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
})
