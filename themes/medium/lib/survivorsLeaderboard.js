const API = (process.env.NEXT_PUBLIC_QUILL_LEADERBOARD_URL || '').replace(
  /\/$/,
  ''
)
export const LEADERBOARD_ENABLED = Boolean(API)
export const LEADERBOARD_SEASON =
  process.env.NEXT_PUBLIC_QUILL_LEADERBOARD_SEASON || 'endless-v1'
const PLAYER_KEY = 'quill-leaderboard-player-v1'
const NAME_KEY = 'quill-leaderboard-name-v1'
let memoryPlayer

export function savedNickname() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}
export function saveNickname(name) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* Private browsing. */
  }
}
function playerId() {
  if (memoryPlayer) return memoryPlayer
  try {
    const saved = localStorage.getItem(PLAYER_KEY)
    if (/^[0-9a-f-]{36}$/i.test(saved || '')) memoryPlayer = saved
  } catch {
    /* Use an in-memory identity if storage is unavailable. */
  }
  if (!memoryPlayer) memoryPlayer = crypto.randomUUID()
  try {
    localStorage.setItem(PLAYER_KEY, memoryPlayer)
  } catch {
    /* Optional. */
  }
  return memoryPlayer
}

async function request(path, body) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(`${API}${path}`, {
      method: body ? 'POST' : 'GET',
      ...(body
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        : {}),
      signal: controller.signal,
      credentials: 'omit',
      cache: body ? 'no-store' : 'default'
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '排行榜暂时连不上。')
    return data
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      throw new Error('排行榜暂时连不上，请稍后重试。')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function loadLeaderboard() {
  return request(
    `/v1/leaderboard?season=${encodeURIComponent(LEADERBOARD_SEASON)}`
  )
}

// Begin once per new game, never on resume or upgrade. A slow or failed request
// cannot hold up play; the caught promise cannot produce an unhandled rejection.
export function beginLeaderboardRun() {
  let ticket
  try {
    ticket = request('/v1/runs', {
      playerId: playerId(),
      season: LEADERBOARD_SEASON
    }).then(
      value => ({ value }),
      error => ({ error })
    )
  } catch (error) {
    ticket = Promise.resolve({ error })
  }
  return { ticket, result: null }
}

export async function submitLeaderboardRun(entry, nickname) {
  const { value, error } = await entry.ticket
  if (error) throw new Error('本局开始时未连上排行榜，请下次挑战时再上传。')
  const data = await request('/v1/scores', {
    runId: value.id,
    token: value.token,
    nickname,
    ...entry.result
  })
  saveNickname(nickname)
  return data
}

export function formatSurvivalTime(ms) {
  const seconds = Math.floor(ms / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`
}
