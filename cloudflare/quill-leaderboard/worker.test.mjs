import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import worker from './worker.mjs'

// Exercise the actual migration and SQL on SQLite, with D1's transactional batch
// contract. No mocked ranking, SQL parser, or external Cloudflare account needed.
function database() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(
    readFileSync(
      new URL('./migrations/0001_leaderboard.sql', import.meta.url),
      'utf8'
    )
  )
  return {
    sqlite,
    prepare(sql) {
      let args = []
      const execute = () => ({
        results: sqlite.prepare(sql).all(...args),
        success: true
      })
      return {
        bind(...values) {
          args = values
          return this
        },
        async first() {
          return execute().results[0] || null
        },
        async all() {
          return execute()
        },
        async run() {
          return execute()
        },
        execute
      }
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try {
        const results = statements.map(statement => statement.execute())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    }
  }
}
function setup(t) {
  const env = {
    DB: database(),
    ALLOWED_ORIGINS: 'https://blog.example',
    RATE_LIMIT_SALT: 'test-salt'.repeat(8),
    SEASON: 'endless-v1'
  }
  let now = 1800000000000
  t.mock.method(Date, 'now', () => now)
  t.after(() => env.DB.sqlite.close())
  const call = async (path, body, extra = {}) => {
    const request = new Request(`https://rank.example${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Origin: env.ALLOWED_ORIGINS,
        'CF-Connecting-IP': '192.0.2.1',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...extra
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
    const response = await worker.fetch(request, env)
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json()
    }
  }
  return {
    env,
    call,
    advance(ms) {
      now += ms
    },
    async start(playerId = crypto.randomUUID()) {
      return (await call('/v1/runs', { playerId, season: env.SEASON })).body
    },
    submit(ticket, score = {}) {
      return call('/v1/scores', {
        runId: ticket.id,
        token: ticket.token,
        nickname: '小刺猬',
        durationMs: 90000,
        kills: 30,
        bosses: 1,
        level: 5,
        ...score
      })
    }
  }
}

test('empty board, CORS/preflight, unsupported origin and unavailable config', async t => {
  const s = setup(t)
  const empty = await s.call('/v1/leaderboard?season=endless-v1')
  assert.deepEqual(empty.body.entries, [])
  assert.equal(empty.headers.get('Cache-Control'), 'public, max-age=30')
  assert.equal(
    (
      await s.call('/v1/leaderboard?season=endless-v1', null, {
        Origin: 'https://evil.example'
      })
    ).status,
    403
  )
  const preflight = await worker.fetch(
    new Request('https://rank.example/v1/runs', {
      method: 'OPTIONS',
      headers: { Origin: s.env.ALLOWED_ORIGINS }
    }),
    s.env
  )
  assert.equal(preflight.status, 204)
  delete s.env.RATE_LIMIT_SALT
  assert.equal((await s.call('/v1/leaderboard?season=endless-v1')).status, 503)
})

test('best-only ranking, survival first, tie-breaks and idempotent retries', async t => {
  const s = setup(t)
  const player = crypto.randomUUID()
  const first = await s.start(player)
  s.advance(90000)
  const result = await s.submit(first)
  assert.equal(result.status, 200)
  assert.equal(result.body.personalBest, true)
  assert.equal(result.body.entries[0].rank, 1)
  assert.equal(result.body.entries[0].playerId, undefined)
  assert.equal(result.body.entries[0].token, undefined)
  const retry = await s.submit(first, { nickname: '改名', kills: 1000 })
  assert.deepEqual(retry.body, result.body)
  const worse = await s.start(player)
  const tied = await s.start()
  const longer = await s.start()
  s.advance(100000)
  assert.equal(
    (await s.submit(worse, { durationMs: 70000 })).body.personalBest,
    false
  )
  await s.submit(tied, { kills: 31 })
  await s.submit(longer, { durationMs: 91000, kills: 20 })
  const board = (await s.call('/v1/leaderboard?season=endless-v1')).body.entries
  assert.equal(board.length, 3)
  assert.deepEqual(
    board.map(row => row.id),
    [longer.id, tied.id, first.id]
  )
  const better = await s.start(player)
  s.advance(100000)
  assert.equal(
    (await s.submit(better, { durationMs: 100000 })).body.entries[0].id,
    better.id
  )
  assert.equal(
    (await s.call('/v1/leaderboard?season=endless-v1')).body.entries.length,
    3
  )
})

test('simultaneous submissions cannot replace a run or create duplicate entries', async t => {
  const s = setup(t)
  const ticket = await s.start()
  s.advance(90000)
  const results = await Promise.all([
    s.submit(ticket),
    s.submit(ticket, { kills: 999 })
  ])
  assert.equal(results[0].status, 200)
  assert.equal(results[1].status, 200)
  const board = (await s.call('/v1/leaderboard?season=endless-v1')).body.entries
  assert.equal(board.length, 1)
  assert.equal(board[0].kills, results[0].body.best.kills)
  assert.equal(board[0].kills, results[1].body.best.kills)
})

test('reject forged token, future time, invalid stats and unsafe nickname', async t => {
  const s = setup(t)
  const ticket = await s.start()
  assert.equal((await s.submit(ticket)).status, 400)
  s.advance(90000)
  assert.equal(
    (await s.submit({ ...ticket, token: 'x'.repeat(72) })).status,
    403
  )
  for (const score of [
    { kills: -1 },
    { kills: 0, level: 5 },
    { durationMs: 1.5 },
    { bosses: 2 },
    { nickname: '<img>' },
    { nickname: '\u202etest' },
    { nickname: 'x'.repeat(17) }
  ]) {
    assert.equal((await s.submit(ticket, score)).status, 400)
  }
  assert.equal((await s.submit(ticket, { nickname: '刺猬🎮' })).status, 200)
})

test('old seasons and expired runs cannot submit; scheduled cleanup retains bests', async t => {
  const s = setup(t)
  const ticket = await s.start()
  s.advance(90000)
  await s.submit(ticket)
  s.env.SEASON = 'endless-v2'
  assert.equal((await s.submit(ticket)).status, 409)
  assert.equal((await s.call('/v1/leaderboard?season=endless-v1')).status, 409)
  assert.deepEqual(
    (await s.call('/v1/leaderboard?season=endless-v2')).body.entries,
    []
  )
  s.env.SEASON = 'endless-v1'
  s.advance(2 * 86400000)
  assert.equal((await s.submit(ticket)).status, 410)
  await worker.scheduled({}, s.env)
  assert.equal(
    s.env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM runs').get().n,
    0
  )
  assert.equal(
    s.env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM scores').get().n,
    1
  )
})

test('persistent rate limits reset after the window', async t => {
  const s = setup(t)
  for (let i = 0; i < 30; i++) assert.ok((await s.start()).id)
  const limited = await s.call('/v1/runs', {
    playerId: crypto.randomUUID(),
    season: 'endless-v1'
  })
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('Retry-After'), '600')
  s.advance(600001)
  assert.ok((await s.start()).id)
})

test('streamed large body, malformed JSON and missing Origin are rejected', async t => {
  const s = setup(t)
  assert.equal(
    (await s.call('/v1/runs', { padding: 'x'.repeat(3000) })).status,
    413
  )
  const invalid = await worker.fetch(
    new Request('https://rank.example/v1/runs', {
      method: 'POST',
      headers: {
        Origin: s.env.ALLOWED_ORIGINS,
        'Content-Type': 'application/json'
      },
      body: '{'
    }),
    s.env
  )
  assert.equal(invalid.status, 400)
  const noOrigin = await worker.fetch(
    new Request('https://rank.example/v1/leaderboard?season=endless-v1'),
    s.env
  )
  assert.equal(noOrigin.status, 403)
})
