export const RUN_SECONDS = 30
export const PLAYER_LINE = 0.82
export const MAX_POWER = 9999

export function createRunner(mode = 'intro', seed = Date.now()) {
  return {
    mode,
    phase: 'ready',
    time: 0,
    lane: 0,
    hp: 3,
    power: 1,
    kills: 0,
    score: 0,
    gates: 0,
    invincible: 0,
    items: [],
    shots: [],
    effects: [],
    nextGate: 0.5,
    nextEnemy: 4.5,
    nextShot: 0,
    id: 0,
    seed: seed >>> 0
  }
}

function random(run) {
  run.seed = (Math.imul(run.seed, 1664525) + 1013904223) >>> 0
  return run.seed / 4294967296
}

export function moveRunner(run, lane) {
  if (run.phase !== 'playing' || !Number.isFinite(lane)) return
  run.lane = Math.max(0, Math.min(1, Math.round(lane)))
}

export function gatePower(power, gate) {
  const next =
    gate.operation === 'multiply' ? power * gate.value : power + gate.value
  return Math.max(1, Math.min(MAX_POWER, Math.floor(next)))
}

export function gateLabel(gate) {
  return gate.operation === 'multiply'
    ? `×${gate.value}`
    : `${gate.value > 0 ? '+' : '−'}${Math.abs(gate.value)}`
}

function effect(run, lane, y, label, kind) {
  run.effects.push({ id: ++run.id, lane, y, label, kind, life: 0.8 })
}

function spawnGates(run) {
  const row = ++run.id
  const multiplyLane = Math.floor(random(run) * 2)
  const speed =
    run.mode === 'intro' ? 0.15 : Math.min(0.26, 0.17 + run.time * 0.0004)
  const risky = run.mode === 'endless' && run.time > 30 && random(run) < 0.35
  for (let lane = 0; lane < 2; lane++) {
    run.items.push({
      id: ++run.id,
      row,
      kind: 'gate',
      lane,
      y: -0.08,
      speed,
      operation: lane === multiplyLane ? 'multiply' : 'add',
      value:
        lane === multiplyLane
          ? 2
          : risky
            ? -Math.max(2, Math.round(run.power * 0.15))
            : 2 + Math.floor(run.time / 18) * 2
    })
  }
  run.nextGate += run.mode === 'intro' ? 6 : 5.5
}

function spawnEnemies(run) {
  const hard = run.mode === 'endless'
  const toughLane = Math.floor(random(run) * 2)
  // Health is fixed when a monster spawns. Taking a gate makes existing enemies easier.
  const base = Math.max(
    2,
    Math.round(run.power * (hard ? 5 + run.time * 0.08 : 2 + run.time * 0.025))
  )
  for (let lane = 0; lane < 2; lane++) {
    const heavy = lane === toughLane
    const hp = Math.round(base * (heavy ? 1.6 : 1))
    run.items.push({
      id: ++run.id,
      kind: 'enemy',
      lane,
      y: -0.08,
      speed: hard ? Math.min(0.33, 0.17 + run.time * 0.0007) : 0.13,
      hp,
      maxHp: hp,
      heavy,
      hit: 0
    })
  }
  run.nextEnemy += hard ? Math.max(1.4, 3.5 - run.time * 0.01) : 4.8
}

// Coordinates are normalized; swept collisions also work at low frame rates.
export function stepRunner(run, elapsed) {
  if (run.phase !== 'playing' || !Number.isFinite(elapsed) || elapsed <= 0)
    return
  const dt = Math.min(elapsed, 0.1)
  run.time += dt
  run.invincible = Math.max(0, run.invincible - dt)
  run.effects = run.effects.filter(item => (item.life -= dt) > 0)
  if (run.mode === 'intro' && run.time >= RUN_SECONDS) {
    run.time = RUN_SECONDS
    run.phase = 'won'
    return
  }
  if (run.time >= run.nextGate) spawnGates(run)
  if (run.time >= run.nextEnemy) spawnEnemies(run)
  if (run.time >= run.nextShot) {
    run.shots.push({
      id: ++run.id,
      lane: run.lane,
      y: PLAYER_LINE - 0.05,
      power: run.power
    })
    run.nextShot = run.time + 0.24
  }

  for (const item of run.items) {
    item.before = item.y
    item.y += item.speed * dt
    if (item.kind === 'enemy') item.hit = Math.max(0, item.hit - dt)
  }
  for (const shot of run.shots) {
    const before = shot.y
    shot.y -= 1.4 * dt
    // Hit only the closest monster in this lane; gates never block the shot.
    const target = run.items
      .filter(
        item =>
          item.kind === 'enemy' &&
          !item.dead &&
          item.lane === shot.lane &&
          before >= item.before - 0.025 &&
          shot.y <= item.y + 0.025
      )
      .sort((a, b) => b.y - a.y)[0]
    if (target) {
      target.hp = Math.max(0, target.hp - shot.power)
      target.hit = 0.12
      shot.spent = true
      if (!target.hp) {
        target.dead = true
        run.kills++
        const points = target.heavy ? 20 : 10
        run.score += points
        effect(run, target.lane, target.y, `+${points}`, 'kill')
      }
    }
  }
  for (const item of run.items) {
    if (
      item.dead ||
      item.before >= PLAYER_LINE ||
      item.y < PLAYER_LINE ||
      item.lane !== run.lane
    )
      continue
    if (item.kind === 'gate') {
      const before = run.power
      run.power = gatePower(run.power, item)
      run.gates++
      // A row is a choice: switching lanes cannot claim its other gate afterwards.
      for (const sibling of run.items)
        if (sibling.row === item.row) sibling.dead = true
      effect(
        run,
        item.lane,
        PLAYER_LINE - 0.13,
        `${gateLabel(item)} → ${run.power}${run.power === MAX_POWER ? ' MAX' : ''}`,
        run.power < before ? 'loss' : 'gain'
      )
    } else if (!run.invincible) {
      run.hp--
      run.invincible = 1.2
      item.dead = true
      effect(run, item.lane, PLAYER_LINE - 0.12, '−1 ♥', 'loss')
      if (run.hp <= 0) {
        run.phase = 'lost'
        break
      }
    }
  }
  run.items = run.items.filter(item => item.y < 1.1 && !item.dead)
  run.shots = run.shots.filter(shot => shot.y > -0.1 && !shot.spent)
  // Endless play cannot accumulate invisible scene nodes or unsafe numeric growth.
  run.effects = run.effects.slice(-12)
}

export function swipeLane(startLane, dx, width) {
  if (width <= 0 || Math.abs(dx) < 22) return startLane
  return Math.max(0, Math.min(1, startLane + Math.sign(dx)))
}
