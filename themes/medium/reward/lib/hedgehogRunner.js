import { rollRunnerChoices } from './runnerUpgrades'

export const RUN_SECONDS = 30
export const PLAYER_LINE = 0.82
export const MAX_POWER = 9999
export const RUNNER_LIMITS = { items: 32, shots: 48, effects: 12, warnings: 3 }

export function createRunner(mode = 'intro', seed = Date.now()) {
  return {
    mode,
    phase: 'ready',
    time: 0,
    lane: 0,
    hp: 3,
    maxHp: 3,
    power: 1,
    kills: 0,
    score: 0,
    gates: 0,
    bosses: 0,
    wave: 1,
    level: 1,
    xp: 0,
    nextXp: 10,
    pendingUpgrades: 0,
    choices: [],
    upgrades: {},
    rerolls: 3,
    shield: false,
    shieldClock: 0,
    leechKills: 0,
    invincible: 0,
    items: [],
    shots: [],
    effects: [],
    warnings: [],
    nextGate: 0.5,
    nextEnemy: 4.5,
    nextBoss: 30,
    nextShot: 0,
    enemyRows: 0,
    gateRows: 0,
    id: 0,
    seed: seed >>> 0,
    combatSeed: (seed ^ 0x9e3779b9) >>> 0,
    choiceSeed: (seed ^ 0x85ebca6b) >>> 0
  }
}

function random(run, key = 'seed') {
  run[key] = (Math.imul(run[key], 1664525) + 1013904223) >>> 0
  return run[key] / 4294967296
}
export function moveRunner(run, lane) {
  if (run.phase !== 'playing' || !Number.isFinite(lane)) return
  run.lane = Math.max(0, Math.min(1, Math.round(lane)))
}
export function gatePower(power, gate) {
  const next =
    gate.operation === 'multiply'
      ? power * gate.value
      : gate.operation === 'add'
        ? power + gate.value
        : power
  return Math.max(1, Math.min(MAX_POWER, Math.floor(next)))
}
export function gateLabel(gate) {
  if (gate.operation === 'heal') return '♥ +1'
  if (gate.operation === 'shield') return '护盾'
  if (gate.operation === 'xp') return '经验 +18'
  return gate.operation === 'multiply'
    ? `×${gate.value}`
    : `${gate.value > 0 ? '+' : '−'}${Math.abs(gate.value)}`
}
function effect(run, lane, y, label, kind) {
  run.effects.push({ id: ++run.id, lane, y, label, kind, life: 0.8 })
  if (run.effects.length > RUNNER_LIMITS.effects) run.effects.shift()
}
export function grantRunnerXp(run, amount) {
  if (run.mode !== 'endless' || !Number.isFinite(amount) || amount <= 0)
    return 0
  const earned = amount * (1 + (run.upgrades.scholar || 0) * 0.2)
  run.xp += earned
  while (run.xp + 1e-9 >= run.nextXp) {
    run.xp = Math.max(0, run.xp - run.nextXp)
    run.level++
    run.pendingUpgrades++
    run.nextXp = Math.min(250, 10 + (run.level - 1) * 5)
  }
  return Math.round(earned * 10) / 10
}
function spawnGates(run) {
  const row = ++run.id
  run.gateRows++
  const multiplyLane = Math.floor(random(run) * 2)
  const speed =
    run.mode === 'intro' ? 0.15 : Math.min(0.26, 0.17 + run.time * 0.0004)
  const risky = run.mode === 'endless' && run.time > 30 && random(run) < 0.3
  for (let lane = 0; lane < 2; lane++) {
    const item = {
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
            : Math.max(
                2 + Math.floor(run.time / 18) * 2,
                run.mode === 'endless' ? Math.round(run.power * 0.3) : 0
              )
    }
    if (
      run.mode === 'endless' &&
      run.time > 18 &&
      lane !== multiplyLane &&
      run.gateRows % 3 === 0
    ) {
      item.operation = ['heal', 'shield', 'xp'][(run.gateRows / 3 - 1) % 3]
      item.value = 1
    }
    run.items.push(item)
  }
  run.nextGate = run.time + (run.mode === 'intro' ? 6 : 5.5)
}
// Endless enemy health follows the course, never the player's current power or build.
function enemyHealth(run) {
  if (run.mode === 'intro')
    return Math.max(2, Math.round(run.power * (2 + run.time * 0.025)))
  const coursePower = Math.min(MAX_POWER, 2 ** Math.min(14, run.time / 5.5))
  const pressure =
    3.5 + run.time * 0.07 + (Math.max(0, run.time - 120) / 60) ** 1.5 * 3
  return Math.round(coursePower * pressure)
}
function addEnemy(run, lane, type = 'normal', y = -0.08) {
  const hard = run.mode === 'endless'
  const factor = {
    normal: 1,
    armored: hard ? 1.7 : 1.6,
    charger: 0.8,
    elite: 3,
    boss: 16
  }[type]
  const hp = Math.round(enemyHealth(run) * factor)
  const speed = hard ? Math.min(0.3, 0.17 + run.time * 0.0005) : 0.13
  run.items.push({
    id: ++run.id,
    kind: 'enemy',
    type,
    lane,
    y,
    speed: !hard
      ? speed
      : type === 'boss'
        ? 0.085
        : type === 'armored' || type === 'elite'
          ? speed * 0.78
          : speed,
    hp,
    maxHp: hp,
    heavy: ['armored', 'elite', 'boss'].includes(type),
    hit: 0,
    slow: 0,
    frozen: 0,
    charge: 'ready',
    chargeClock: 0,
    attackClock: 0.8,
    holdClock: 8
  })
}
function spawnEnemies(run) {
  const hard = run.mode === 'endless'
  const lane = Math.floor(random(run) * 2)
  run.enemyRows++
  if (!hard) {
    addEnemy(run, lane, 'armored')
    addEnemy(run, 1 - lane)
  } else {
    const elite = run.time >= 24 && run.enemyRows % 5 === 0
    const type = elite
      ? 'elite'
      : run.time >= 15 && run.enemyRows % 3 === 0
        ? 'charger'
        : run.enemyRows % 2 === 0
          ? 'armored'
          : 'normal'
    addEnemy(run, lane, type)
    // Stagger two-lane rows so the player always has time to cross behind one.
    if (run.time > 20 && run.enemyRows % 2 === 0)
      addEnemy(run, 1 - lane, 'normal', -0.32)
  }
  run.nextEnemy =
    run.time + (hard ? Math.max(1.7, 3.4 - run.time * 0.006) : 4.8)
}
function killEnemy(run, enemy) {
  if (enemy.dead) return
  enemy.dead = true
  run.kills++
  const boss = enemy.type === 'boss',
    elite = enemy.type === 'elite'
  const points = boss ? 150 : elite ? 40 : enemy.heavy ? 20 : 10
  const xp = boss ? 45 : elite ? 18 : enemy.heavy ? 8 : 5
  run.score += points
  const earned = grantRunnerXp(run, xp)
  effect(
    run,
    enemy.lane,
    enemy.y,
    run.mode === 'endless' ? `+${earned} XP` : `+${points}`,
    'kill'
  )
  if (boss) {
    run.bosses++
    run.rerolls = Math.min(5, run.rerolls + 1)
    run.hp = Math.min(run.maxHp, run.hp + 1)
    run.warnings = run.warnings.filter(w => w.source !== enemy.id)
    effect(run, enemy.lane, enemy.y - 0.07, '首领击退 · +1 ♥ · +1 重抽', 'gain')
  }
  if (run.upgrades.leech) {
    run.leechKills++
    if (run.leechKills >= 30 - run.upgrades.leech * 6) {
      run.leechKills = 0
      run.hp = Math.min(run.maxHp, run.hp + 1)
      effect(run, run.lane, PLAYER_LINE - 0.1, '+1 ♥', 'gain')
    }
  }
}
function damageEnemy(run, enemy, damage) {
  if (enemy.dead) return
  if (enemy.hp <= enemy.maxHp / 2)
    damage *= 1 + (run.upgrades.execute || 0) * 0.3
  enemy.hp = Math.max(0, enemy.hp - damage)
  enemy.hit = 0.12
  if (enemy.hp === 0) killEnemy(run, enemy)
}
function hurtRunner(run) {
  if (run.invincible > 0 || run.phase !== 'playing') return
  run.invincible = 1.2
  if (run.shield) {
    run.shield = false
    run.shieldClock = 0
    effect(run, run.lane, PLAYER_LINE - 0.12, '护盾抵挡', 'shield')
    return
  }
  run.hp = Math.max(0, run.hp - 1)
  effect(run, run.lane, PLAYER_LINE - 0.12, '−1 ♥', 'loss')
  if (!run.hp) run.phase = 'lost'
}
function fire(run) {
  const u = run.upgrades
  const critical = random(run, 'combatSeed') < (u.focus || 0) * 0.12
  const damage =
    run.power *
    (1 + (u.power || 0) * 0.25 + (u.vigor || 0) * 0.05) *
    (u.barrage ? 1.5 : 1) *
    (critical ? (u.crossfire ? 3 : 2) : 1)
  const shoot = (lane, factor) => {
    if (run.shots.length >= RUNNER_LIMITS.shots) return
    run.shots.push({
      id: ++run.id,
      lane,
      y: PLAYER_LINE - 0.05,
      power: damage * factor,
      critical,
      remaining: 1 + (u.pierce || 0) + (u.barrage ? 2 : 0),
      hitIds: []
    })
  }
  shoot(run.lane, 1)
  if (u.twin) shoot(1 - run.lane, u.crossfire ? 1 : 0.1 + u.twin * 0.2)
  run.nextShot = run.time + 0.24 * 0.85 ** (u.haste || 0)
}
function collectGate(run, item) {
  const before = run.power
  let label
  if (item.operation === 'heal') {
    const recovered = run.hp < run.maxHp
    run.hp = Math.min(run.maxHp, run.hp + 1)
    label = recovered ? '+1 ♥' : '生命已满 · +12 XP'
    if (!recovered) grantRunnerXp(run, 12)
  } else if (item.operation === 'shield') {
    if (run.shield) {
      grantRunnerXp(run, 12)
      label = '护盾已满 · +12 XP'
    } else {
      run.shield = true
      run.shieldClock = 0
      label = '获得护盾'
    }
  } else if (item.operation === 'xp') {
    grantRunnerXp(run, 18)
    label = '+18 XP'
  } else {
    run.power = gatePower(run.power, item)
    const capped =
      run.mode === 'endless' && before === MAX_POWER && item.value > 0
    if (capped) {
      grantRunnerXp(run, 12)
      run.score += 25
      label = 'MAX · +12 XP · +25 分'
    } else
      label = `${gateLabel(item)} → ${run.power}${run.power === MAX_POWER ? ' MAX' : ''}`
  }
  run.gates++
  grantRunnerXp(run, 3)
  for (const sibling of run.items)
    if (sibling.kind === 'gate' && sibling.row === item.row) sibling.dead = true
  effect(
    run,
    item.lane,
    PLAYER_LINE - 0.13,
    label,
    run.power < before ? 'loss' : 'gain'
  )
}
function stepSlice(run, dt) {
  run.time += dt
  run.wave = 1 + Math.floor(run.time / 30)
  run.invincible = Math.max(0, run.invincible - dt)
  run.effects = run.effects.filter(item => (item.life -= dt) > 0)
  if (run.mode === 'intro' && run.time + 1e-9 >= RUN_SECONDS) {
    run.time = RUN_SECONDS
    run.phase = 'won'
    return
  }
  if (run.upgrades.guard && !run.shield) {
    run.shieldClock += dt
    if (run.shieldClock >= 29 - run.upgrades.guard * 5) {
      run.shield = true
      run.shieldClock = 0
    }
  }
  if (run.time >= run.nextGate && run.items.length <= RUNNER_LIMITS.items - 2)
    spawnGates(run)
  if (run.time >= run.nextEnemy && run.items.length <= RUNNER_LIMITS.items - 2)
    spawnEnemies(run)
  if (
    run.mode === 'endless' &&
    run.time >= run.nextBoss &&
    run.items.length < RUNNER_LIMITS.items
  ) {
    if (!run.items.some(e => e.type === 'boss' && !e.dead)) {
      const lane = Math.floor(random(run) * 2)
      addEnemy(run, lane, 'boss')
      effect(run, lane, 0.35, '首领来袭', 'loss')
    }
    run.nextBoss = run.time + 45
  }
  if (run.time >= run.nextShot) fire(run)
  for (const item of run.items) {
    item.before = item.y
    let speed = item.speed
    if (item.kind === 'enemy') {
      item.hit = Math.max(0, item.hit - dt)
      item.slow = Math.max(0, (item.slow || 0) - dt)
      item.frozen = Math.max(0, (item.frozen || 0) - dt)
      if (item.type === 'charger') {
        if (item.charge === 'ready' && item.y >= 0.38) {
          item.charge = 'warning'
          item.chargeClock = 0.8
        }
        if (item.charge === 'warning') {
          item.chargeClock -= dt
          speed *= 0.15
          if (item.chargeClock <= 0) item.charge = 'charging'
        } else if (item.charge === 'charging') speed = Math.min(0.52, speed * 2)
      }
      if (item.slow) speed *= 1 - (run.upgrades.frost || 0) * 0.15
      if (item.frozen) speed = 0
      if (item.type === 'boss' && item.y >= 0.18 && item.y < 0.7) {
        if (item.holdClock > 0) {
          item.holdClock -= dt
          speed = 0
        }
        item.attackClock -= dt
        if (
          item.attackClock <= 0 &&
          run.warnings.length < RUNNER_LIMITS.warnings
        ) {
          run.warnings.push({
            id: ++run.id,
            source: item.id,
            lane: run.lane,
            life: 1.1,
            duration: 1.1
          })
          item.attackClock = 3.8
        }
      }
    }
    item.y += speed * dt
  }
  for (const shot of run.shots) {
    const before = shot.y
    const travel = Math.min(dt, Math.max(0, (before + 0.1) / 1.4))
    shot.y -= 1.4 * travel
    shot.hitIds ||= []
    shot.remaining ??= 1
    const targets = run.items
      .filter(
        item =>
          item.kind === 'enemy' &&
          !item.dead &&
          item.y >= 0 &&
          item.lane === shot.lane &&
          !shot.hitIds.includes(item.id)
      )
      .map(item => {
        const distance = before - item.before
        const relative = 1.4 * travel + ((item.y - item.before) * travel) / dt
        return {
          item,
          t:
            Math.abs(distance) <= 0.025
              ? 0
              : distance > 0.025 && relative > 0
                ? (distance - 0.025) / relative
                : Infinity
        }
      })
      .filter(hit => hit.t >= 0 && hit.t <= 1)
      .sort((a, b) => a.t - b.t || a.item.id - b.item.id)
    for (const { item: target } of targets) {
      if (target.dead) continue
      damageEnemy(run, target, shot.power)
      shot.hitIds.push(target.id)
      target.slow = run.upgrades.frost ? 2 : 0
      if (run.upgrades.blast) {
        const range = run.upgrades.blizzard ? 0.2 : 0.12
        for (const other of run.items) {
          if (
            other.kind !== 'enemy' ||
            other.dead ||
            other.id === target.id ||
            Math.abs(other.y - target.y) > range
          )
            continue
          damageEnemy(run, other, shot.power * run.upgrades.blast * 0.25)
          if (run.upgrades.blizzard && !['boss', 'elite'].includes(other.type))
            other.frozen = 0.6
        }
        effect(
          run,
          target.lane,
          target.y,
          run.upgrades.blizzard ? '❄' : '◉',
          'blast'
        )
      }
      shot.remaining--
      if (shot.remaining <= 0) {
        shot.spent = true
        break
      }
    }
  }
  for (const warning of run.warnings) {
    warning.life -= dt
    if (warning.life <= 0 && !warning.fired) {
      warning.fired = true
      if (warning.lane === run.lane) hurtRunner(run)
      effect(run, warning.lane, PLAYER_LINE - 0.2, '轰！', 'loss')
    }
  }
  run.warnings = run.warnings.filter(
    w =>
      w.life > -0.18 &&
      run.items.some(e => e.id === w.source && !e.dead && e.y < PLAYER_LINE)
  )
  for (const item of run.items) {
    if (run.phase !== 'playing') break
    if (
      item.dead ||
      item.before >= PLAYER_LINE ||
      item.y < PLAYER_LINE ||
      item.lane !== run.lane
    )
      continue
    if (item.kind === 'gate') collectGate(run, item)
    else {
      hurtRunner(run)
      item.dead = true
    }
  }
  run.items = run.items.filter(item => item.y < 1.1 && !item.dead)
  run.shots = run.shots.filter(shot => shot.y > -0.1 && !shot.spent)
  if (run.phase === 'playing' && run.pendingUpgrades > 0) {
    run.phase = 'upgrade'
    rollRunnerChoices(run)
  }
}
// Catch up short stalls in bounded slices. Upgrade decisions freeze the whole world.
export function stepRunner(run, elapsed) {
  if (run.phase !== 'playing' || !Number.isFinite(elapsed) || elapsed <= 0)
    return
  let remaining = Math.min(elapsed, 0.25)
  while (remaining > 1e-9 && run.phase === 'playing') {
    const dt = Math.min(remaining, 1 / 60)
    stepSlice(run, dt)
    remaining -= dt
  }
}
export function swipeLane(startLane, dx, width) {
  if (width <= 0 || Math.abs(dx) < 22) return startLane
  return Math.max(0, Math.min(1, startLane + Math.sign(dx)))
}
