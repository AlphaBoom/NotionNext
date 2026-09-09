const DAY = 86400000
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ORDER =
  'duration_ms DESC, kills DESC, bosses DESC, achieved_at ASC, run_id ASC'
const COLUMNS =
  'run_id AS id, nickname, duration_ms AS durationMs, kills, bosses, level'

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message)
}
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max
const hash = async value =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    ),
    byte => byte.toString(16).padStart(2, '0')
  ).join('')

async function readBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    fail(415, '请使用 JSON 提交成绩。')
  }
  // Bound streamed bodies too: Content-Length is not trustworthy.
  const reader = request.body?.getReader()
  if (!reader) fail(400, '请求内容为空。')
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 2048) {
      await reader.cancel()
      fail(413, '请求内容过大。')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes))
    if (!body || Array.isArray(body) || typeof body !== 'object')
      throw new Error()
    return body
  } catch {
    fail(400, '请求内容无效。')
  }
}

async function rateLimit(request, env, action, now) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local'
  const window = Math.floor(now / 600000)
  const bucket = await hash(`${env.RATE_LIMIT_SALT}:${ip}:${action}:${window}`)
  const limit = action === 'start' ? 30 : 60
  const result = await env.DB.prepare(
    `
    INSERT INTO rate_limits(bucket, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1 WHERE hits < ?
    RETURNING hits
  `
  )
    .bind(bucket, (window + 1) * 600000, limit)
    .first()
  if (!result) fail(429, '操作太频繁，请稍后再试。')
}

function validateScore(body, run, now) {
  const nickname =
    typeof body.nickname === 'string'
      ? body.nickname.normalize('NFKC').trim()
      : ''
  if (!nickname || [...nickname].length > 16 || /[\p{C}<>]/u.test(nickname)) {
    fail(400, '昵称请填写 1–16 个字符，不含控制字符或尖括号。')
  }
  const seconds = body.durationMs / 1000
  if (
    !integer(body.durationMs, 1000, DAY) ||
    body.durationMs > now - run.started_at + 5000 ||
    !integer(body.kills, 0, Math.ceil(seconds * 60) + 100) ||
    !integer(body.bosses, 0, Math.floor(seconds / 60)) ||
    body.bosses > body.kills ||
    !integer(body.level, 1, 1 + body.kills * 25)
  ) {
    fail(400, '成绩与本局记录不符，无法上传。')
  }
  return nickname
}

async function topScores(env, season) {
  const { results } = await env.DB.prepare(
    `
    SELECT ${COLUMNS} FROM scores WHERE season = ? ORDER BY ${ORDER} LIMIT 20
  `
  )
    .bind(season)
    .all()
  return { season, entries: results.map((row, i) => ({ rank: i + 1, ...row })) }
}

async function route(request, env, now) {
  const url = new URL(request.url)
  const season = env.SEASON || 'endless-v1'
  if (request.method === 'GET' && url.pathname === '/v1/leaderboard') {
    if (url.searchParams.get('season') !== season)
      fail(409, '排行榜已换季，请刷新博客。')
    return topScores(env, season)
  }
  if (request.method !== 'POST') fail(405, '不支持此请求方式。')
  if (!['/v1/runs', '/v1/scores'].includes(url.pathname))
    fail(404, '接口不存在。')
  await rateLimit(
    request,
    env,
    url.pathname === '/v1/runs' ? 'start' : 'submit',
    now
  )
  const body = await readBody(request)
  if (url.pathname === '/v1/runs') {
    if (body.season !== season) fail(409, '排行榜已换季，请刷新博客。')
    if (typeof body.playerId !== 'string' || !UUID.test(body.playerId))
      fail(400, '玩家标识无效。')
    const id = crypto.randomUUID()
    const token = crypto.randomUUID() + crypto.randomUUID()
    await env.DB.prepare(
      `
      INSERT INTO runs(id, token_hash, player_id, season, started_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(id, await hash(token), body.playerId, season, now, now + 2 * DAY)
      .run()
    return { id, token, season }
  }
  if (
    typeof body.runId !== 'string' ||
    !UUID.test(body.runId) ||
    typeof body.token !== 'string' ||
    body.token.length !== 72
  )
    fail(400, '本局凭证无效。')
  const run = await env.DB.prepare(
    'SELECT * FROM runs WHERE id = ? AND token_hash = ?'
  )
    .bind(body.runId, await hash(body.token))
    .first()
  if (!run) fail(403, '本局凭证无效。')
  if (run.expires_at < now) fail(410, '本局成绩已过期，请重新挑战。')
  if (run.season !== season) fail(409, '排行榜已换季，请重新挑战。')
  if (!run.submitted_at) {
    const nickname = validateScore(body, run, now)
    // One transaction: first submission wins, and only the persisted result can
    // update a personal best. Retries/concurrent submissions cannot replace it.
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE runs SET submitted_at = ?, nickname = ?, duration_ms = ?,
        kills = ?, bosses = ?, level = ? WHERE id = ? AND submitted_at IS NULL`
      ).bind(
        now,
        nickname,
        body.durationMs,
        body.kills,
        body.bosses,
        body.level,
        run.id
      ),
      env.DB.prepare(
        `INSERT INTO scores(season, player_id, run_id, nickname,
        duration_ms, kills, bosses, level, achieved_at)
        SELECT season, player_id, id, nickname, duration_ms, kills, bosses, level, submitted_at
        FROM runs WHERE id = ? AND submitted_at IS NOT NULL
        ON CONFLICT(season, player_id) DO UPDATE SET
          run_id = excluded.run_id, nickname = excluded.nickname,
          duration_ms = excluded.duration_ms, kills = excluded.kills,
          bosses = excluded.bosses, level = excluded.level, achieved_at = excluded.achieved_at
        WHERE (excluded.duration_ms, excluded.kills, excluded.bosses) >
          (scores.duration_ms, scores.kills, scores.bosses)`
      ).bind(run.id)
    ])
  }
  const best = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM scores WHERE season = ? AND player_id = ?`
  )
    .bind(season, run.player_id)
    .first()
  return {
    accepted: true,
    personalBest: best.id === run.id,
    best,
    ...(await topScores(env, season))
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin'
    }
    // Reject unconfigured deployments and unapproved browser origins before D1.
    if (!origin || !allowed.includes(origin)) {
      return Response.json(
        { error: '来源未获允许。' },
        { status: 403, headers }
      )
    }
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers })
    if (!env.DB || !env.RATE_LIMIT_SALT || env.RATE_LIMIT_SALT.length < 32) {
      return Response.json(
        { error: '排行榜暂未就绪。' },
        { status: 503, headers }
      )
    }
    try {
      const result = await route(request, env, Date.now())
      if (request.method === 'GET')
        headers['Cache-Control'] = 'public, max-age=30'
      return Response.json(result, { headers })
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 503
      if (status === 429) headers['Retry-After'] = '600'
      return Response.json(
        {
          error:
            status === 503 ? '排行榜暂时连不上，请稍后重试。' : error.message
        },
        { status, headers }
      )
    }
  },
  async scheduled(_event, env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM runs WHERE expires_at < ?').bind(Date.now()),
      env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(
        Date.now()
      )
    ])
  }
}
