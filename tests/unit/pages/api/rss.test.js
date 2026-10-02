/** @jest-environment node */

jest.mock('@/lib/db/SiteDataApi', () => ({ fetchGlobalAllData: jest.fn() }))
jest.mock('@/lib/utils/rss', () => ({ buildRssFeeds: jest.fn() }))

const response = () => ({
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value
  },
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
})

describe('RSS endpoint', () => {
  let handler, fetchData, buildFeeds, now
  const feed = {
    xml: '<rss>first</rss>',
    atomXml: '<feed>first</feed>',
    json: '{"items":[]}'
  }
  beforeEach(() => {
    jest.resetModules()
    fetchData = require('@/lib/db/SiteDataApi').fetchGlobalAllData
    buildFeeds = require('@/lib/utils/rss').buildRssFeeds
    fetchData.mockResolvedValue({ allPages: [] })
    buildFeeds.mockResolvedValue(feed)
    handler = require('@/pages/api/rss').default
    now = jest.spyOn(Date, 'now').mockReturnValue(0)
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shares one concurrent refresh across formats and reuses the complete cached feed', async () => {
    let finish
    fetchData.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const rss = response(),
      atom = response(),
      json = response()
    const first = handler({ method: 'GET', query: {} }, rss)
    const second = handler({ method: 'GET', query: { format: 'atom' } }, atom)
    finish({ allPages: [] })
    await Promise.all([first, second])
    await handler({ method: 'GET', query: { format: 'json' } }, json)
    const head = response()
    await handler({ method: 'HEAD', query: {} }, head)
    expect(fetchData).toHaveBeenCalledTimes(1)
    expect(buildFeeds).toHaveBeenCalledTimes(1)
    expect(rss.send).toHaveBeenCalledWith(feed.xml)
    expect(atom.send).toHaveBeenCalledWith(feed.atomXml)
    expect(json.send).toHaveBeenCalledWith(feed.json)
    expect(head.status).toHaveBeenCalledWith(200)
    expect(head.headers['Content-Type']).toBe(
      'application/rss+xml; charset=utf-8'
    )
    expect(rss.headers['Cache-Control']).toContain('s-maxage=600')
  })

  it('retains the last complete feed after an expired refresh fails and retries on the next request', async () => {
    await handler({ method: 'GET', query: {} }, response())
    now.mockReturnValue(600001)
    buildFeeds.mockRejectedValueOnce(new Error('Notion unavailable'))
    const stale = response()
    await handler({ method: 'GET', query: {} }, stale)
    expect(stale.send).toHaveBeenCalledWith(feed.xml)
    expect(stale.headers['Cache-Control']).toBe('no-store')
    buildFeeds.mockResolvedValueOnce({ ...feed, xml: '<rss>updated</rss>' })
    const fresh = response()
    await handler({ method: 'GET', query: {} }, fresh)
    expect(fresh.send).toHaveBeenCalledWith('<rss>updated</rss>')
    expect(buildFeeds).toHaveBeenCalledTimes(3)
  })

  it('reports an unavailable cold feed without caching the error and allows recovery', async () => {
    fetchData.mockRejectedValueOnce(new Error('Notion unavailable'))
    const failed = response()
    await handler({ method: 'GET', query: {} }, failed)
    expect(failed.status).toHaveBeenCalledWith(503)
    expect(failed.headers['Cache-Control']).toBe('no-store')
    const recovered = response()
    await handler({ method: 'GET', query: {} }, recovered)
    expect(recovered.send).toHaveBeenCalledWith(feed.xml)
  })

  it.each([
    [{ method: 'POST', query: {} }, 405],
    [{ method: 'GET', query: { format: 'unknown' } }, 400]
  ])(
    'rejects invalid requests before fetching Notion data',
    async (request, status) => {
      const res = response()
      await handler(request, res)
      expect(res.status).toHaveBeenCalledWith(status)
      expect(fetchData).not.toHaveBeenCalled()
    }
  )
})
