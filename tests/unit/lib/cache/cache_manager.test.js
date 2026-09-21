/** @jest-environment node */
const mockRedisSet = jest.fn()
jest.mock('@/blog.config', () => ({
  isProd: true,
  REDIS_URL: 'redis://test',
  ENABLE_CACHE: true
}))
jest.mock('@/lib/config', () => ({ siteConfig: () => 600 }))
jest.mock('ioredis', () =>
  jest.fn(() => ({ set: mockRedisSet, get: async () => null }))
)
jest.mock('@/lib/cache/local_file_cache', () => ({
  getCache: async () => null
}))
jest.mock('@/lib/cache/memory_cache', () => ({
  setCache: jest.fn(),
  getCache: async () => null
}))
jest.mock('@/lib/cache/file_lock', () => ({
  withFileLock: (_key, work) => Promise.resolve().then(work)
}))

afterEach(() => {
  delete process.env.npm_lifecycle_event
})

test('failed Redis writes reach the memory fallback', async () => {
  jest.resetModules()
  mockRedisSet.mockRejectedValue(Error('Redis unavailable'))
  const { setDataToCache } = require('@/lib/cache/cache_manager')
  const memory = require('@/lib/cache/memory_cache')
  await setDataToCache('test-key', { title: 'Article' }, 60)
  expect(memory.setCache).toHaveBeenCalledWith(
    'test-key',
    { title: 'Article' },
    60
  )
})

test('a rejected build fetch can be handled and retried without an unhandled rejection', async () => {
  jest.resetModules()
  process.env.npm_lifecycle_event = 'build'
  const { getOrSetDataWithCache } = require('@/lib/cache/cache_manager')
  const fetcher = jest
    .fn()
    .mockRejectedValueOnce(Error('upstream failed'))
    .mockResolvedValueOnce(null)
  await expect(getOrSetDataWithCache('test-key', fetcher)).rejects.toThrow(
    'upstream failed'
  )
  await expect(getOrSetDataWithCache('test-key', fetcher)).resolves.toBeNull()
  await new Promise(resolve => setImmediate(resolve))
  expect(fetcher).toHaveBeenCalledTimes(2)
})
