/** @jest-environment node */
import clearCache from '@/pages/api/cache'
import revalidate from '@/pages/api/revalidate'
import subscribe from '@/pages/api/subscribe'
import { cleanCache } from '@/lib/cache/local_file_cache'
import subscribeToMailchimpApi from '@/lib/plugins/mailchimp'

jest.mock('@/blog.config', () => ({}))
jest.mock('@/lib/cache/local_file_cache', () => ({ cleanCache: jest.fn() }))
jest.mock('@/lib/plugins/mailchimp', () => ({
  __esModule: true,
  default: jest.fn()
}))
const response = () => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  revalidate: jest.fn().mockResolvedValue(undefined)
})
afterEach(() => {
  delete process.env.CACHE_REVALIDATION_TOKEN
  delete process.env.REVALIDATION_TOKEN
})

test('cache clearing requires a configured token and the matching credential', () => {
  const req = { method: 'POST', headers: {} }
  const res = response()
  clearCache(req, res)
  expect(res.status).toHaveBeenLastCalledWith(503)
  process.env.CACHE_REVALIDATION_TOKEN = 'test-token'
  clearCache(req, res)
  expect(res.status).toHaveBeenLastCalledWith(401)
  expect(cleanCache).not.toHaveBeenCalled()
  req.headers.authorization = 'Bearer test-token'
  clearCache(req, res)
  expect(res.status).toHaveBeenLastCalledWith(200)
  expect(cleanCache).toHaveBeenCalledTimes(1)
})

test('revalidation validates paths and reports partial or homepage failures', async () => {
  process.env.REVALIDATION_TOKEN = 'test-token'
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: { paths: '/' }
  }
  const res = response()
  await revalidate(req, res)
  expect(res.status).toHaveBeenLastCalledWith(400)
  expect(res.revalidate).not.toHaveBeenCalled()
  req.body = { paths: ['/', '/article/test'] }
  res.revalidate.mockRejectedValueOnce(Error('regeneration failed'))
  await revalidate(req, res)
  expect(res.status).toHaveBeenLastCalledWith(500)
  expect(res.json).toHaveBeenLastCalledWith(
    expect.objectContaining({ ok: false })
  )
  req.body = { all: true }
  res.revalidate.mockRejectedValueOnce(Error('regeneration failed'))
  await revalidate(req, res)
  expect(res.status).toHaveBeenLastCalledWith(500)
  req.body = { path: '/article/test' }
  await revalidate(req, res)
  expect(res.status).toHaveBeenLastCalledWith(200)
})

test('subscriptions forward client names and only report success when the provider accepts', async () => {
  const req = {
    method: 'POST',
    body: {
      email: 'reader@example.com',
      first_name: 'Reader',
      last_name: 'Test'
    }
  }
  const res = response()
  for (const [upstream, status] of [
    [null, 503],
    [{ ok: false, status: 400 }, 400],
    [{ ok: false, status: 500 }, 502],
    [{ ok: true, status: 200 }, 200]
  ]) {
    subscribeToMailchimpApi.mockResolvedValueOnce(upstream)
    await subscribe(req, res)
    expect(res.status).toHaveBeenLastCalledWith(status)
  }
  expect(subscribeToMailchimpApi).toHaveBeenLastCalledWith(req.body)
  await subscribe({ method: 'POST', body: {} }, res)
  expect(res.status).toHaveBeenLastCalledWith(400)
  expect(subscribeToMailchimpApi).toHaveBeenCalledTimes(4)
})
