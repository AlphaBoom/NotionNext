import { webcrypto } from 'crypto'

let client
const originalFetch = global.fetch
beforeEach(() => {
  jest.resetModules()
  localStorage.clear()
  process.env.NEXT_PUBLIC_QUILL_LEADERBOARD_URL = 'https://rank.example/'
  Object.defineProperty(window.crypto, 'randomUUID', {
    configurable: true,
    value: () => webcrypto.randomUUID()
  })
  global.fetch = jest.fn()
  client = require('@/themes/medium/lib/survivorsLeaderboard')
})
afterEach(() => {
  global.fetch = originalFetch
  delete process.env.NEXT_PUBLIC_QUILL_LEADERBOARD_URL
})
const respond = body => ({ ok: true, json: async () => body })

test('one browser identity survives module reload; a new run gets a fresh ticket', async () => {
  fetch.mockResolvedValue(respond({ id: 'run', token: 'token' }))
  await client.beginLeaderboardRun().ticket
  const first = JSON.parse(fetch.mock.calls[0][1].body)
  jest.resetModules()
  const reloaded = require('@/themes/medium/lib/survivorsLeaderboard')
  await reloaded.beginLeaderboardRun().ticket
  const second = JSON.parse(fetch.mock.calls.at(-1)[1].body)
  expect(first.playerId).toBe(second.playerId)
  expect(first.season).toBe('endless-v1')
  expect(fetch.mock.calls[0][0]).toBe('https://rank.example/v1/runs')
})

test('upload failure retries the same ticket and exact frozen stats', async () => {
  fetch.mockResolvedValueOnce(respond({ id: 'run-1', token: 'secret' }))
  const entry = client.beginLeaderboardRun()
  entry.result = { durationMs: 95000, kills: 31, bosses: 1, level: 5 }
  await entry.ticket
  fetch.mockRejectedValueOnce(new TypeError('offline'))
  await expect(client.submitLeaderboardRun(entry, '刺猬')).rejects.toThrow(
    '稍后重试'
  )
  fetch.mockResolvedValueOnce(respond({ accepted: true }))
  await expect(client.submitLeaderboardRun(entry, '刺猬')).resolves.toEqual({
    accepted: true
  })
  expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[2][1].body)
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({
    runId: 'run-1',
    token: 'secret',
    nickname: '刺猬',
    ...entry.result
  })
  expect(client.savedNickname()).toBe('刺猬')
})

test('failed start is caught and never creates a replacement ticket at upload time', async () => {
  fetch.mockRejectedValue(new TypeError('offline'))
  const entry = client.beginLeaderboardRun()
  entry.result = { durationMs: 1000 }
  await expect(entry.ticket).resolves.toHaveProperty('error')
  await expect(client.submitLeaderboardRun(entry, '刺猬')).rejects.toThrow(
    '本局开始时'
  )
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('format keeps long runs readable and no credentials are sent with board requests', async () => {
  expect(client.formatSurvivalTime(3671234)).toBe('61:11.2')
  fetch.mockResolvedValue(respond({ entries: [] }))
  await client.loadLeaderboard()
  expect(fetch.mock.calls[0][0]).toContain('season=endless-v1')
  expect(fetch.mock.calls[0][1].credentials).toBe('omit')
})

test('rank preview follows score tie breakers and never invents a rank below the top 20', () => {
  const score = { durationMs: 90000, kills: 30, bosses: 1 }
  const rows = [
    { ...score, durationMs: 91000 },
    { ...score, kills: 31 },
    { ...score, bosses: 2 },
    { ...score },
    { ...score, bosses: 0 }
  ]
  expect(client.estimateLeaderboardRank(score, rows)).toBe(5)
  expect(client.estimateLeaderboardRank(score, [])).toBe(1)
  expect(client.estimateLeaderboardRank(score, null)).toBeNull()
  expect(
    client.estimateLeaderboardRank(score, Array(20).fill(score))
  ).toBeNull()
  expect(client.estimateLeaderboardRank(score, Array(19).fill(score))).toBe(20)
})
