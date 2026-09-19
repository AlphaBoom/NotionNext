/** @jest-environment node */

let handler

const makeResponse = () => {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn(),
    end: jest.fn(),
    redirect: jest.fn()
  }
  res.status.mockReturnValue(res)
  return res
}

const request = (appId = '123') => ({ method: 'GET', query: { appId } })
const steamResponse = headerImage => ({
  ok: true,
  json: async () => ({
    123: {
      success: true,
      data: {
        header_image: headerImage,
        release_date: { coming_soon: true }
      }
    }
  })
})

beforeEach(() => {
  jest.isolateModules(() => {
    handler = require('@/pages/api/steam-cover/[appId]').default
  })
})

afterEach(() => jest.useRealTimers())

it.each([
  'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/123/header.jpg',
  'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/123/version/header_english.jpg?t=456'
])(
  'redirects to the exact Steam cover URL, including for unreleased games: %s',
  async url => {
    fetch.mockResolvedValue(steamResponse(url))
    const res = makeResponse()
    await handler(request(), res)
    expect(fetch).toHaveBeenCalledWith(
      'https://store.steampowered.com/api/appdetails?appids=123&l=english&filters=basic',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(res.redirect).toHaveBeenCalledWith(307, url)
    expect(res.setHeader).toHaveBeenLastCalledWith(
      'Cache-Control',
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=3600'
    )
  }
)

it('shares concurrent requests, reuses successful results, and refreshes after expiry', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(0)
  let complete
  fetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        complete = resolve
      })
  )
  const first = handler(request(), makeResponse())
  const second = handler(request(), makeResponse())
  expect(fetch).toHaveBeenCalledTimes(1)
  complete(
    steamResponse('https://shared.akamai.steamstatic.com/version-one.jpg')
  )
  await Promise.all([first, second])
  await handler(request(), makeResponse())
  expect(fetch).toHaveBeenCalledTimes(1)

  clock.mockReturnValue(24 * 60 * 60 * 1000 + 1)
  const updated = 'https://shared.akamai.steamstatic.com/version-two.jpg'
  fetch.mockResolvedValue(steamResponse(updated))
  const res = makeResponse()
  await handler(request(), res)
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(res.redirect).toHaveBeenCalledWith(307, updated)
})

it('rejects invalid IDs and methods before contacting Steam', async () => {
  for (const appId of [
    undefined,
    ['123', '456'],
    '0',
    '../123',
    '123?l=other'
  ]) {
    const res = makeResponse()
    await handler({ method: 'GET', query: { appId } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  }
  const res = makeResponse()
  await handler({ ...request(), method: 'POST' }, res)
  expect(res.status).toHaveBeenCalledWith(405)
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET')
  expect(fetch).not.toHaveBeenCalled()
})

it.each([
  [{ ok: false }, 502],
  [{ ok: true, json: async () => ({ 123: { success: false } }) }, 404],
  [steamResponse(undefined), 502],
  [steamResponse('https://steamstatic.com.evil.example/image.jpg'), 502]
])(
  'keeps missing or unusable upstream results out of the CDN cache',
  async (response, status) => {
    fetch.mockResolvedValue(response)
    const res = makeResponse()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(status)
    expect(res.redirect).not.toHaveBeenCalled()
    expect(res.setHeader).toHaveBeenLastCalledWith('Cache-Control', 'no-store')
  }
)

it('bounds Steam response time and allows recovery after the short failure cooldown', async () => {
  jest.useFakeTimers()
  fetch.mockImplementationOnce(
    (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Aborted')))
      })
  )
  const res = makeResponse()
  const pending = handler(request(), res)
  await jest.advanceTimersByTimeAsync(15000)
  await pending
  expect(res.status).toHaveBeenCalledWith(502)
  await handler(request(), makeResponse())
  expect(fetch).toHaveBeenCalledTimes(1)
  await jest.advanceTimersByTimeAsync(60001)
  const cover = 'https://shared.akamai.steamstatic.com/recovered.jpg'
  fetch.mockResolvedValue(steamResponse(cover))
  const recovered = makeResponse()
  await handler(request(), recovered)
  expect(recovered.redirect).toHaveBeenCalledWith(307, cover)
})
