export const WALK_SECONDS = 60
export const PLAYER_LINE = 0.8

export function createWalk(mode = 'intro', seed = Date.now()) {
  return {
    mode,
    phase: 'ready',
    time: 0,
    lane: 1,
    hp: 3,
    cones: 0,
    score: 0,
    invincible: 0,
    items: [],
    nextWave: 0.7,
    id: 0,
    seed: seed >>> 0
  }
}

function random(run) {
  run.seed = (Math.imul(run.seed, 1664525) + 1013904223) >>> 0
  return run.seed / 4294967296
}

export function moveWalk(run, lane) {
  if (run.phase !== 'playing' || !Number.isFinite(lane)) return
  run.lane = Math.max(0, Math.min(2, Math.round(lane)))
}

function spawnWave(run) {
  const safe = Math.floor(random(run) * 3)
  const blocked = (safe + 1 + Math.floor(random(run) * 2)) % 3
  const hard = run.mode === 'endless' && run.time > 15
  for (let lane = 0; lane < 3; lane++) {
    if (lane === safe || lane === blocked || (hard && random(run) > 0.35)) {
      run.items.push({
        id: ++run.id,
        lane,
        y: -0.08,
        kind: lane === safe ? 'cone' : 'rock',
        speed:
          run.mode === 'intro'
            ? 0.19 + run.time * 0.0007
            : Math.min(0.45, 0.25 + run.time * 0.0015)
      })
    }
  }
  run.nextWave +=
    run.mode === 'intro' ? 1.65 : Math.max(0.85, 1.35 - run.time * 0.004)
}

// Normalized coordinates survive rotation/resizing; large gaps never skip hazards.
export function stepWalk(run, elapsed) {
  if (run.phase !== 'playing' || !Number.isFinite(elapsed) || elapsed <= 0)
    return
  const dt = Math.min(elapsed, 0.1)
  run.time += dt
  run.invincible = Math.max(0, run.invincible - dt)
  if (run.mode === 'intro' && run.time >= WALK_SECONDS) {
    run.time = WALK_SECONDS
    run.phase = 'won'
    return
  }
  if (run.time >= run.nextWave) spawnWave(run)
  for (const item of run.items) {
    const before = item.y
    item.y += item.speed * dt
    if (
      before < PLAYER_LINE &&
      item.y >= PLAYER_LINE &&
      item.lane === run.lane
    ) {
      if (item.kind === 'cone') {
        run.cones++
        run.score += 10
        if (run.cones % 6 === 0) run.hp = Math.min(3, run.hp + 1)
        item.collected = true
      } else if (!run.invincible) {
        run.hp--
        run.invincible = 1.3
        if (run.hp <= 0) run.phase = 'lost'
      }
    }
  }
  run.items = run.items.filter(item => item.y < 1.15 && !item.collected)
}

export function swipeLane(startLane, dx, width) {
  if (width <= 0 || Math.abs(dx) < 22) return startLane
  const steps = Math.max(1, Math.round(Math.abs(dx) / (width / 3)))
  return Math.max(0, Math.min(2, startLane + Math.sign(dx) * steps))
}
