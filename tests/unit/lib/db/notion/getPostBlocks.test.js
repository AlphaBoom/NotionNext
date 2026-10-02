jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: { getPage: jest.fn() }
}))
jest.mock('@/lib/cache/cache_manager', () => ({ getDataFromCache: jest.fn() }))
jest.mock('p-limit', () => () => fn => fn())
jest.mock('notion-utils', () => ({
  getBlockValue: jest.fn(entry => entry?.value?.value || entry?.value || entry)
}))

import {
  formatNotionBlock,
  getMissingExternalObjectInstanceIds,
  hasExpiredSignedUrls,
  hydrateExternalObjectInstances,
  preferStablePdfSignedUrls,
  getPageWithRetry
} from '@/lib/db/notion/getPostBlocks'
import notionAPI from '@/lib/db/notion/getNotionAPI'
import { getDataFromCache } from '@/lib/cache/cache_manager'
import { execFileSync } from 'node:child_process'

describe('Notion read failure recovery', () => {
  beforeEach(() => {
    getDataFromCache.mockResolvedValue(null)
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('rejects exhausted upstream failures instead of returning an empty successful page', async () => {
    notionAPI.getPage.mockRejectedValue(new Error('temporary network failure'))
    await expect(getPageWithRetry('page-id', 'test')).rejects.toThrow(
      'Notion page data is unavailable'
    )
    expect(notionAPI.getPage).toHaveBeenCalledTimes(3)
  })

  it('can use the existing successful page after a transport failure', async () => {
    const previous = { block: { page: { value: { type: 'page' } } } }
    notionAPI.getPage.mockRejectedValue(new Error('temporary network failure'))
    getDataFromCache.mockResolvedValue(previous)
    await expect(getPageWithRetry('page-id', 'test')).resolves.toBe(previous)
    expect(notionAPI.getPage).toHaveBeenCalledTimes(1)
  })

  it('preserves confirmed missing pages and permits a subsequent successful retry after incomplete data', async () => {
    notionAPI.getPage.mockRejectedValueOnce(
      new Error('Notion page not found "pageid"')
    )
    await expect(getPageWithRetry('page-id', 'test')).resolves.toBeNull()
    const page = {
      block: { 'page-id': { value: { id: 'page-id', type: 'page' } } }
    }
    notionAPI.getPage
      .mockResolvedValueOnce({ block: {} })
      .mockResolvedValueOnce(page)
    await expect(
      getPageWithRetry('page-id', 'test', 3, 'key', { fetchCollections: true })
    ).resolves.toEqual(page)
    expect(notionAPI.getPage).toHaveBeenLastCalledWith('page-id', {
      fetchCollections: true
    })
  })

  it('allows private related databases and unused views with the real notion-client', async () => {
    notionAPI.getPage.mockImplementation(async (id, options) =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            '--input-type=module',
            '-e',
            `
      import { NotionAPI } from 'notion-client'
      const recordMap = {
        block: {
          root: { value: { id: 'root', type: 'collection_view_page', collection_id: 'publishing', view_ids: ['selected', 'private-view'], content: ['private-table'] } },
          'private-table': { value: { id: 'private-table', type: 'collection_view', collection_id: 'private', view_ids: ['private-view'] } }
        },
        collection: { publishing: { value: { schema: {} } } },
        collection_view: {}, notion_user: {}
      }
      const client = new NotionAPI()
      client.getPageRaw = async () => ({ recordMap })
      client.getCollectionData = async (collectionId, viewId) => {
        if (collectionId !== 'publishing' || viewId !== 'selected') throw new Error('private collection: 400')
        return { recordMap: { block: {}, collection: {}, collection_view: {}, notion_user: {} }, result: { reducerResults: { collection_group_results: { blockIds: [] } } } }
      }
      console.warn = console.error = () => {}
      const data = await client.getPage('root', { ...${JSON.stringify(options)}, fetchMissingBlocks: false, signFileUrls: false })
      process.stdout.write(JSON.stringify(data))
    `
          ],
          { encoding: 'utf8' }
        )
      )
    )
    const result = await getPageWithRetry('root', 'test', 3, 'key', {
      fetchCollections: true
    })
    expect(
      result.collection_query.publishing.selected.collection_group_results
        .blockIds
    ).toEqual([])
    expect(notionAPI.getPage).toHaveBeenCalledTimes(1)
  })

  it('retries a missing required query instead of accepting page_sort or another view', async () => {
    const missing = {
      block: {
        root: {
          value: {
            id: 'root',
            type: 'collection_view_page',
            collection_id: 'publishing',
            view_ids: ['selected', 'other']
          }
        }
      },
      collection_query: { publishing: { other: { blockIds: ['row'] } } },
      collection_view: {
        selected: { value: { value: { page_sort: ['row'] } } }
      }
    }
    const complete = {
      ...missing,
      collection_query: { publishing: { selected: { blockIds: [] } } }
    }
    notionAPI.getPage
      .mockResolvedValueOnce(missing)
      .mockResolvedValueOnce(complete)
    await expect(
      getPageWithRetry('root', 'test', 3, 'key', { fetchCollections: true })
    ).resolves.toEqual(complete)
    expect(notionAPI.getPage).toHaveBeenCalledTimes(2)
  })

  it('validates only the first configuration table used by the parser', async () => {
    const recordMap = {
      block: {
        config: {
          value: {
            id: 'config',
            type: 'page',
            content: ['table', 'private-table']
          }
        },
        table: {
          value: {
            id: 'table',
            type: 'collection_view',
            collection_id: 'settings',
            view_ids: ['selected']
          }
        },
        'private-table': {
          value: {
            id: 'private-table',
            type: 'collection_view',
            collection_id: 'private',
            view_ids: ['view']
          }
        }
      },
      collection_query: { settings: { selected: { blockIds: [] } } }
    }
    notionAPI.getPage.mockResolvedValueOnce(recordMap)
    const options = { fetchCollections: true, validateConfigTable: true }
    await expect(
      getPageWithRetry('config', 'test', 3, 'key', options)
    ).resolves.toEqual(recordMap)
    notionAPI.getPage.mockResolvedValue({
      ...recordMap,
      collection_query: { private: { view: { blockIds: [] } } }
    })
    await expect(
      getPageWithRetry('config', 'test', 3, 'key', options)
    ).rejects.toThrow('Notion page data is unavailable')
  })
})

describe('formatNotionBlock', () => {
  it('finds rich-text external object instances missing from the block map', () => {
    const recordMap = {
      block: {
        list: {
          value: {
            id: 'list',
            type: 'bulleted_list',
            properties: {
              title: [['‣', [['eoi', 'github-mention']]], [' description']]
            }
          }
        }
      }
    }

    expect(getMissingExternalObjectInstanceIds(recordMap)).toEqual([
      'github-mention'
    ])
  })

  it('hydrates rich-text external object instances for the renderer', async () => {
    const recordMap = {
      block: {
        list: {
          value: {
            id: 'list',
            properties: {
              title: [['‣', [['eoi', 'github-mention']]]]
            }
          }
        }
      }
    }
    const githubMention = {
      value: {
        id: 'github-mention',
        type: 'external_object_instance',
        format: {
          domain: 'github.com',
          original_url: 'https://github.com/example/repo',
          attributes: []
        }
      }
    }
    const fetchBlocks = jest.fn().mockResolvedValue({
      'github-mention': githubMention
    })

    await expect(
      hydrateExternalObjectInstances(recordMap, fetchBlocks)
    ).resolves.toBe(true)
    expect(fetchBlocks).toHaveBeenCalledWith(['github-mention'])
    expect(recordMap.block['github-mention']).toEqual(githubMention)
    expect(getMissingExternalObjectInstanceIds(recordMap)).toEqual([])
  })

  it.each([
    [
      'Apple Music track',
      'https://embed.music.apple.com/us/song/neon-blue/324357768',
      'embed'
    ],
    [
      'Apple Music album',
      'https://embed.music.apple.com/us/album/girls-come-too/324357208',
      'video'
    ],
    [
      'external player',
      'https://www.happinessrailway.com/dplayer.htm?n=https%3A%2F%2Fvip.lz-cdn16.com%2F20230312%2F12364_a86fbcc4%2Findex.m3u8',
      'embed'
    ],
    ['YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video'],
    ['hosted video', 'https://cdn.example.com/videos/demo.mp4', 'video']
  ])('formats %s through the renderer entry point', (_label, url, type) => {
    const formatted = formatNotionBlock({
      video: {
        value: { id: 'video', type: 'video', properties: { source: [[url]] } }
      }
    })
    expect(formatted.video.value.type).toBe(type)
  })

  it('relinks synced block content children to the original parent', () => {
    const formatted = formatNotionBlock({
      page: {
        value: {
          id: 'page',
          type: 'page',
          content: ['sync']
        }
      },
      sync: {
        value: {
          id: 'sync',
          type: 'sync_block',
          parent_id: 'page',
          content: ['notice-line']
        }
      },
      'notice-line': {
        value: {
          id: 'notice-line',
          type: 'text',
          parent_id: 'sync',
          properties: {
            title: [['Notice']]
          }
        }
      }
    })

    expect(formatted.page.value.content).toEqual(['sync_child_0'])
    expect(formatted.sync).toBeUndefined()
    expect(formatted['notice-line']).toBeUndefined()
    expect(formatted.sync_child_0.value.id).toBe('sync_child_0')
    expect(formatted.sync_child_0.value.parent_id).toBe('page')
  })

  it('relinks synced block inline children to the original parent', () => {
    const formatted = formatNotionBlock({
      page: {
        value: {
          id: 'page',
          type: 'page',
          content: ['sync']
        }
      },
      sync: {
        value: {
          id: 'sync',
          type: 'sync_block',
          parent_id: 'page',
          children: [
            {
              value: {
                id: 'inline-child',
                type: 'text',
                parent_id: 'sync',
                properties: {
                  title: [['Inline notice']]
                }
              }
            }
          ]
        }
      }
    })

    expect(formatted.page.value.content).toEqual(['sync_child_0'])
    expect(formatted.sync).toBeUndefined()
    expect(formatted.sync_child_0.value.id).toBe('sync_child_0')
    expect(formatted.sync_child_0.value.parent_id).toBe('page')
  })

  it('marks newer Notion callouts with removed icons', () => {
    const formatted = formatNotionBlock({
      callout: {
        value: {
          id: 'callout',
          type: 'callout',
          format: {
            page_icon: '💡'
          },
          callout: {
            icon: null,
            color: 'gray_background',
            rich_text: [
              {
                plain_text: 'No icon',
                annotations: { bold: true }
              }
            ]
          }
        }
      }
    })

    expect(formatted.callout.value.format.page_icon).toBeUndefined()
    expect(formatted.callout.value.format.callout_no_icon).toBe(true)
    expect(formatted.callout.value.format.block_color).toBe('gray_background')
    expect(formatted.callout.value.properties.title).toEqual([
      ['No icon', [['b']]]
    ])
  })

  it('maps newer Notion callout emoji icons to legacy renderer fields', () => {
    const formatted = formatNotionBlock({
      callout: {
        value: {
          id: 'callout',
          type: 'callout',
          callout: {
            icon: {
              type: 'emoji',
              emoji: '✅'
            }
          }
        }
      }
    })

    expect(formatted.callout.value.format.page_icon).toBe('✅')
    expect(formatted.callout.value.format.callout_no_icon).toBeUndefined()
  })

  it('rewrites newer Notion pdf file URLs to signed URLs', () => {
    const formatted = formatNotionBlock({
      pdf: {
        value: {
          id: 'pdf-block',
          type: 'pdf',
          properties: {
            source: [
              [
                'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/file.pdf'
              ]
            ]
          }
        }
      }
    })

    expect(formatted.pdf.value.properties.source[0][0]).toBe(
      'https://notion.so/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fspace%2Ffile.pdf?table=block&id=pdf-block'
    )
  })

  it('does not rewrite lookalike Notion file URLs', () => {
    const url = 'https://evil.example/secure.notion-static.com/file.pdf'
    const formatted = formatNotionBlock({
      pdf: {
        value: {
          id: 'pdf-block',
          type: 'pdf',
          properties: {
            source: [[url]]
          }
        }
      }
    })

    expect(formatted.pdf.value.properties.source[0][0]).toBe(url)
  })

  it('detects expired cached Notion signed URLs', () => {
    expect(
      hasExpiredSignedUrls({
        signed_urls: {
          pdf: 'https://file.notion.so/f/file.pdf?expirationTimestamp=1'
        }
      })
    ).toBe(true)
  })

  it('uses stable Notion signed entry for pdf preview URLs', () => {
    const recordMap = {
      signed_urls: {
        pdf: 'https://file.notion.so/f/file.pdf?expirationTimestamp=1'
      },
      block: {
        pdf: {
          value: {
            id: 'pdf',
            type: 'pdf',
            properties: {
              source: [
                [
                  'https://prod-files-secure.s3.us-west-2.amazonaws.com/file.pdf'
                ]
              ]
            }
          }
        }
      }
    }

    preferStablePdfSignedUrls(recordMap)

    expect(recordMap.signed_urls.pdf).toBe(
      'https://notion.so/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Ffile.pdf?table=block&id=pdf'
    )
  })

  it.each(['tab', 'tabs'])(
    'maps Notion %s containers to internal tabs embeds',
    originalType => {
      const formatted = formatNotionBlock({
        tabs: {
          value: {
            id: 'tabs',
            type: originalType,
            format: {
              block_color: 'gray_background'
            },
            content: ['tab-a', 'tab-b']
          }
        },
        'tab-a': {
          value: {
            id: 'tab-a',
            type: 'text',
            parent_id: 'tabs',
            properties: {
              title: [['First']]
            }
          }
        }
      })

      expect(formatted.tabs.value.type).toBe('embed')
      expect(formatted.tabs.value.content).toEqual(['tab-a', 'tab-b'])
      expect(formatted.tabs.value.format).toMatchObject({
        block_color: 'gray_background',
        embed_variant: 'notion_tabs',
        notion_next_original_type: originalType
      })
      expect(formatted['tab-a'].value.type).toBe('text')
    }
  )
})
