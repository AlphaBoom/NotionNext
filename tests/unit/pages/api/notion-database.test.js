/** @jest-environment node */
import handler from '@/pages/api/notion-database'
import { DatabaseError, getDatabasePreview } from '@/lib/db/notion/database/server'
jest.mock('notion-client', () => ({ NotionAPI: jest.fn(() => ({})) }))
jest.mock('@/lib/db/notion/database/server', () => ({
  ...jest.requireActual('@/lib/db/notion/database/server'),
  getDatabasePreview: jest.fn()
}))
const blockId = '11111111111111111111111111111111'
const res = () => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
})
it('serves fixed public GET responses with browser and CDN cache headers', async () => {
  const result = { blockIds: [], hasMore: false }
  getDatabasePreview.mockResolvedValue(result)
  const response = res()
  await handler({ method: 'GET', query: { blockId } }, response)
  expect(getDatabasePreview).toHaveBeenCalledWith({ blockId })
  expect(response.status).toHaveBeenCalledWith(200)
  expect(response.json).toHaveBeenCalledWith(result)
  expect(response.setHeader).toHaveBeenLastCalledWith(
    'CDN-Cache-Control',
    'public, s-maxage=600, stale-while-revalidate=60'
  )
  expect(response.setHeader).toHaveBeenCalledWith(
    'Cache-Control',
    'public, max-age=60'
  )
})
it.each(['POST', 'PUT', 'DELETE'])(
  'rejects %s before reaching the service',
  async method => {
    const response = res()
    await handler(
      { method, query: { blockId }, body: { cursor: 'forged' } },
      response
    )
    expect(response.status).toHaveBeenCalledWith(405)
    expect(response.setHeader).toHaveBeenCalledWith('Allow', 'GET')
    expect(getDatabasePreview).not.toHaveBeenCalled()
  }
)
it.each([
  { blockId, limit: '10000' },
  { blockId, cursor: 'forged' },
  { blockId, search: 'x' },
  { blockId: [blockId, blockId] },
  {}
])(
  'rejects request variants without public caching or upstream work: %j',
  async query => {
    const response = res()
    await handler({ method: 'GET', query }, response)
    expect(response.status).toHaveBeenCalledWith(400)
    expect(getDatabasePreview).not.toHaveBeenCalled()
    expect(response.setHeader).not.toHaveBeenCalledWith(
      'CDN-Cache-Control',
      expect.anything()
    )
  }
)
it.each([404, 429, 502])(
  'never CDN-caches an upstream error (%i)',
  async status => {
    getDatabasePreview.mockRejectedValue(
      new DatabaseError('UNAVAILABLE', status, 'failed')
    )
    const response = res()
    await handler({ method: 'GET', query: { blockId } }, response)
    expect(response.status).toHaveBeenCalledWith(status)
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store'
    )
    expect(response.setHeader).not.toHaveBeenCalledWith(
      'CDN-Cache-Control',
      expect.anything()
    )
    if (status === 429)
      expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '5')
  }
)
