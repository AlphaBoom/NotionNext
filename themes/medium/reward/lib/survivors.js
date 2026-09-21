// Small, deterministic simulation. Rendering and browser lifecycle live elsewhere.
export const RUN_SECONDS = 60
export const LIMITS = {
  enemies: 96,
  shots: 160,
  gems: 100,
  sparks: 80,
  hazards: 96,
  effects: 40
}
import { UPGRADES, applyUpgrade, upgradeAvailable } from './survivorsUpgrades'
export { UPGRADES } from './survivorsUpgrades'

export function createRun(seed = Date.now(), mode = 'intro') {
  const intro = mode !== 'endless'
  return {
    seed: seed >>> 0 || 1,
    visualSeed: (seed ^ 0x9e3779b9) >>> 0 || 1,
    mode: intro ? 'intro' : 'endless',
    wave: 1,
    nextBoss: 60,
    nextElite: 30,
    bosses: 0,
    phase: 'ready',
    time: 0,
    kills: 0,
    level: 1,
    xp: 0,
    nextXp: 5,
    pendingUpgrades: 0,
    upgrades: {},
    rerolls: intro ? 0 : 3,
    xpFraction: 0,
    xpEarned: 0,
    pickupFlash: 0,
    pickupValue: 0,
    stormClock: 0,
    novaClock: 0,
    leechKills: 0,
    choices: [],
    spawnClock: 0,
    shotClock: 0,
    bossSpawned: false,
    bossDefeated: false,
    quality: 'full',
    player: {
      x: 0,
      y: 0,
      hp: 6,
      maxHp: 6,
      speed: 150,
      damage: 2,
      rate: 0.48,
      quills: 1,
      pierce: 0,
      orbit: 0,
      magnet: 65,
      invincible: 0,
      crit: 0,
      shotSpeed: 410,
      shotSize: 5,
      shield: false,
      shieldClock: 0,
      regenClock: 0,
      facing: 1,
      moving: false
    },
    enemies: [],
    shots: [],
    gems: [],
    sparks: [],
    hazards: [],
    effects: [],
    nextId: 1
  }
}

function random(run, visual = false) {
  const key = visual ? 'visualSeed' : 'seed'
  let x = run[key]
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  run[key] = x >>> 0
  return run[key] / 4294967296
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export function offerUpgrades(run, exclude = []) {
  const pool = UPGRADES.filter(u => upgradeAvailable(run, u))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random(run) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  // Make an earned evolution visible, and prefer different choices on reroll.
  pool.sort(
    (a, b) =>
      Number(exclude.includes(a.id)) - Number(exclude.includes(b.id)) ||
      Number(Boolean(b.evolution)) - Number(Boolean(a.evolution))
  )
  const selected = pool.slice(0, 3)
  // Keep investing in a build possible instead of forcing eight random pickups.
  const existing = pool.find(u => run.upgrades[u.id] && !exclude.includes(u.id))
  if (
    run.mode === 'endless' &&
    existing &&
    !selected.some(u => run.upgrades[u.id])
  ) {
    let replace = selected.length - 1
    while (replace >= 0 && selected[replace].evolution) replace--
    if (replace >= 0) selected[replace] = existing
  }
  run.choices = selected.map(u => ({
    ...u,
    rank: (run.upgrades[u.id] || 0) + 1
  }))
  run.phase = 'upgrade'
}

export function rerollUpgrades(run) {
  if (run.phase !== 'upgrade' || run.rerolls <= 0) return false
  const ids = run.choices.map(u => u.id)
  if (!UPGRADES.some(u => !ids.includes(u.id) && upgradeAvailable(run, u)))
    return false
  run.rerolls--
  offerUpgrades(run, ids)
  return true
}

export function chooseUpgrade(run, id) {
  if (run.phase !== 'upgrade' || !run.choices.some(u => u.id === id))
    return false
  applyUpgrade(run, id)
  run.choices = []
  run.pendingUpgrades = Math.max(0, run.pendingUpgrades - 1)
  if (run.pendingUpgrades) offerUpgrades(run)
  else run.phase = 'playing'
  return true
}

function collectExperience(run, value) {
  const reward =
    value * (1 + (run.upgrades.scholar || 0) * 0.12) + run.xpFraction
  const whole = Math.floor(reward + 1e-9)
  run.xpFraction = Math.max(0, reward - whole)
  run.xp += whole
  run.xpEarned += whole
  // Keep a fixed display window so continuous pickups cannot inflate one popup.
  if (run.pickupFlash <= 0) {
    run.pickupValue = 0
    run.pickupFlash = 0.65
  }
  run.pickupValue += whole
}

function dropExperience(run, enemy, value) {
  // Retire the oldest drop at capacity, banking its XP, and keep the new drop
  // at the kill. Never teleport a nearby kill's reward into an off-screen gem.
  if (run.gems.length >= LIMITS.gems)
    collectExperience(run, run.gems.shift().value)
  run.gems.push({ x: enemy.x, y: enemy.y, value, age: 0, attracted: false })
}

function resolveLevels(run) {
  while (run.xp >= run.nextXp) {
    run.xp -= run.nextXp
    run.level++
    run.pendingUpgrades++
    const growth = run.level - 1
    run.nextXp =
      run.mode === 'intro'
        ? run.nextXp + 4
        : 5 + growth * 3 + Math.floor(Math.max(0, growth - 4) ** 2 * 0.4)
  }
  if (run.pendingUpgrades) offerUpgrades(run)
}

function spawn(run, width, height, boss = false, elite = false) {
  if (run.enemies.length >= LIMITS.enemies) {
    if (!boss && !elite) return
    const expendable = run.enemies.findIndex(
      e => e.kind !== 'boss' && (!elite || !e.elite)
    )
    if (expendable < 0) return
    run.enemies.splice(expendable, 1)
  }
  const side = Math.floor(random(run) * 4)
  const along = random(run) * 2 - 1
  const x =
    side < 2 ? (side === 0 ? -1 : 1) * (width / 2 + 28) : (along * width) / 2
  const y =
    side >= 2 ? (side === 2 ? -1 : 1) * (height / 2 + 28) : (along * height) / 2
  let kind = boss
    ? 'boss'
    : run.time > 18 && random(run) < 0.3
      ? 'moth'
      : 'blob'
  if (!boss && run.mode === 'endless' && run.time > 45) {
    const roll = random(run)
    if (roll < 0.2) kind = 'charger'
    else if (roll < 0.35) kind = 'tank'
  }
  const pressure = run.mode === 'endless' ? Math.max(0, run.wave - 1) : 0
  // After four minutes, health growth eventually outpaces an established build.
  const endurance =
    run.mode === 'endless'
      ? Math.min(1000, 1.11 ** Math.max(0, run.wave - 8))
      : 1
  const hp = boss
    ? run.mode === 'intro'
      ? 110
      : 110 + pressure * 70
    : kind === 'moth'
      ? 2 + Math.floor(run.time / 40)
      : 2 + Math.floor(run.time / 24)
  run.enemies.push({
    id: run.nextId++,
    x: run.player.x + x,
    y: run.player.y + y,
    kind,
    hp:
      (hp + (boss ? 0 : pressure)) *
      (kind === 'tank' ? 2.5 : 1) *
      (elite ? 3 : 1) *
      endurance,
    maxHp:
      (hp + (boss ? 0 : pressure)) *
      (kind === 'tank' ? 2.5 : 1) *
      (elite ? 3 : 1) *
      endurance,
    radius: boss ? 25 : elite ? 18 : kind === 'tank' ? 16 : 11,
    elite,
    xpValue: boss
      ? 20 + pressure * 5
      : (1 + Math.floor(pressure / 3)) * (elite ? 5 : kind === 'tank' ? 3 : 1),
    slow: 0,
    frozen: 0,
    attackClock: boss ? 3 : 2,
    warning: 0,
    dash: 0,
    speed:
      run.mode === 'intro'
        ? boss
          ? 43
          : kind === 'moth'
            ? 88
            : 38 + run.time * 0.32
        : Math.min(
            180,
            (boss ? 43 : kind === 'moth' ? 88 : kind === 'tank' ? 27 : 42) +
              pressure * 5
          ),
    flash: 0,
    orbitHit: 0
  })
}

function burst(run, x, y, color) {
  if (run.quality === 'low') return
  for (let i = 0; i < 5 && run.sparks.length < LIMITS.sparks; i++) {
    const angle = random(run, run.mode === 'endless') * Math.PI * 2
    const speed = 20 + random(run, run.mode === 'endless') * 65
    run.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35,
      color
    })
  }
}

function hit(run, enemy, damage) {
  if (enemy.hp <= 0) return
  if (enemy.hp < enemy.maxHp / 2)
    damage *= 1 + (run.upgrades.execute || 0) * 0.25
  enemy.hp -= damage
  enemy.flash = 0.09
  if (enemy.hp > 0) return
  run.kills++
  if (enemy.kind === 'boss') {
    run.bossDefeated = true
    run.bosses++
    run.player.hp =
      run.mode === 'intro'
        ? run.player.maxHp
        : Math.min(run.player.maxHp, run.player.hp + 2)
  }
  if (run.upgrades.leech) {
    run.leechKills++
    if (run.leechKills >= 42 - run.upgrades.leech * 7) {
      run.leechKills = 0
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + 1)
    }
  }
  if (enemy.kind === 'boss') {
    run.rerolls = Math.min(5, run.rerolls + 1)
    for (const gem of run.gems) gem.attracted = true
  }
  dropExperience(run, enemy, enemy.xpValue || (enemy.kind === 'boss' ? 20 : 1))
  burst(run, enemy.x, enemy.y, enemy.kind === 'boss' ? '#e6b785' : '#a9c7af')
}

export function orbitPositions(run) {
  return Array.from({ length: run.player.orbit }, (_, i) => {
    const angle = run.time * 2.8 + (i * Math.PI * 2) / run.player.orbit
    return {
      x:
        run.player.x +
        Math.cos(angle) * (57 + (run.upgrades.resonance || 0) * 8),
      y:
        run.player.y +
        Math.sin(angle) * (57 + (run.upgrades.resonance || 0) * 8)
    }
  })
}

// Return the first intersection with a circle along this frame's travel.
// Entry time, rather than spawn order or center distance, determines piercing.
function segmentHitTime(from, to, point, radius) {
  const dx = to.x - from.x,
    dy = to.y - from.y
  const ox = from.x - point.x,
    oy = from.y - point.y
  const offset = ox * ox + oy * oy - radius * radius
  if (offset <= 0) return 0
  const length = dx * dx + dy * dy
  if (!length) return Infinity
  const projection = ox * dx + oy * dy
  const discriminant = projection * projection - length * offset
  if (projection >= 0 || discriminant < 0) return Infinity
  const time = (-projection - Math.sqrt(discriminant)) / length
  return time <= 1 ? time : Infinity
}

function effect(run, data) {
  if (run.effects.length < LIMITS.effects) run.effects.push(data)
}

function castAbilities(run, dt) {
  const p = run.player,
    u = run.upgrades
  run.stormClock -= dt
  if (u.storm && run.stormClock <= 0) {
    let from = p
    const struck = new Set()
    for (let i = 0; i < u.storm + 1 + (u.tempest ? 3 : 0); i++) {
      let target,
        best = i ? 190 : 460
      for (const e of run.enemies) {
        const d = distance(e, from)
        if (e.hp > 0 && !struck.has(e.id) && d < best) {
          target = e
          best = d
        }
      }
      if (!target) break
      hit(run, target, p.damage * (1.5 + u.storm * 0.25))
      struck.add(target.id)
      effect(run, {
        kind: 'lightning',
        x: from.x,
        y: from.y,
        tx: target.x,
        ty: target.y,
        life: 0.22
      })
      from = target
    }
    if (struck.size) run.stormClock = u.tempest ? 1.5 : 3
  }
  run.novaClock -= dt
  const radius = 95 + (u.nova || 0) * 25
  if (
    u.nova &&
    run.novaClock <= 0 &&
    run.enemies.some(e => e.hp > 0 && distance(e, p) < radius)
  ) {
    for (const e of run.enemies) {
      const d = distance(e, p)
      if (e.hp <= 0 || d > radius + e.radius) continue
      hit(run, e, p.damage * (1.5 + u.nova * 0.35) * (u.blizzard ? 2 : 1))
      if (u.blizzard && e.kind !== 'boss') e.frozen = 1.2
      if (d && e.kind !== 'boss') {
        e.x += ((e.x - p.x) / d) * 32
        e.y += ((e.y - p.y) / d) * 32
      }
    }
    effect(run, {
      kind: u.blizzard ? 'ice' : 'nova',
      x: p.x,
      y: p.y,
      radius,
      life: 0.45
    })
    run.novaClock = 6 - u.nova * 0.6
  }
}

function hurtPlayer(run) {
  const p = run.player
  if (p.invincible > 0) return
  if (p.shield) {
    p.shield = false
    p.shieldClock = 0
  } else p.hp = Math.max(0, p.hp - 1)
  p.invincible = run.mode === 'intro' ? 1 : 0.8
  if (!p.hp) run.phase = 'lost'
}

function moveEnemy(run, e, dt) {
  const p = run.player
  e.slow = Math.max(0, (e.slow || 0) - dt)
  e.frozen = Math.max(0, (e.frozen || 0) - dt)
  if (e.frozen > 0) return
  if (run.mode === 'endless' && (e.kind === 'charger' || e.kind === 'boss')) {
    if (e.warning > 0) {
      e.warning = Math.max(0, e.warning - dt)
      if (e.warning === 0) {
        if (e.kind === 'charger') e.dash = 0.55
        else {
          const count = Math.min(12, 6 + Math.floor(run.wave / 3))
          const aim = Math.atan2(p.y - e.y, p.x - e.x)
          for (
            let i = 0;
            i < count && run.hazards.length < LIMITS.hazards;
            i++
          ) {
            const angle = aim + (i * Math.PI * 2) / count
            const speed = Math.min(160, 95 + run.wave * 3)
            run.hazards.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 5
            })
          }
        }
        e.attackClock = e.kind === 'boss' ? 4.5 : 3.5
      }
      return
    }
    if (e.dash > 0) {
      e.dash = Math.max(0, e.dash - dt)
      const speed =
        Math.min(310, 250 + run.wave * 3) *
        (e.slow ? 1 - (run.upgrades.frost || 0) * 0.12 : 1)
      e.x += e.dx * speed * dt
      e.y += e.dy * speed * dt
      return
    }
    e.attackClock -= dt
    if (e.attackClock <= 0 && distance(e, p) < 430) {
      const angle = Math.atan2(p.y - e.y, p.x - e.x)
      e.dx = Math.cos(angle)
      e.dy = Math.sin(angle)
      e.warning = e.kind === 'boss' ? 0.9 : 0.7
      return
    }
  }
  const d = distance(e, p) || 1
  const speed = e.speed * (e.slow ? 1 - (run.upgrades.frost || 0) * 0.12 : 1)
  e.x += ((p.x - e.x) / d) * speed * dt
  e.y += ((p.y - e.y) / d) * speed * dt
}

function updateHazards(run, dt) {
  for (const hazard of run.hazards) {
    if (hazard.life <= 0) continue
    const from = { x: hazard.x, y: hazard.y }
    const travel = Math.min(dt, hazard.life)
    hazard.x += hazard.vx * travel
    hazard.y += hazard.vy * travel
    hazard.life -= dt
    if (segmentHitTime(from, hazard, run.player, 13) !== Infinity) {
      hurtPlayer(run)
      hazard.life = 0
      if (run.phase === 'lost') break
    }
  }
  run.hazards = run.hazards.filter(h => h.life > 0)
}

export function stepRun(run, input, elapsed, width = 900, height = 400) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return
  // Catch up short frame stalls in bounded slices without skipping collisions.
  let remaining = Math.min(elapsed, 0.1)
  while (remaining > 1e-9 && run.phase === 'playing') {
    const dt = Math.min(remaining, 1 / 60)
    stepFrame(run, input, dt, width, height)
    remaining -= dt
  }
}

function stepFrame(run, input, elapsed, width, height) {
  if (run.phase !== 'playing') return
  const dt = Math.max(0, Math.min(elapsed, 1 / 30))
  const p = run.player
  run.time += dt
  run.wave = 1 + Math.floor(run.time / 30)
  if (run.mode === 'intro' && run.time >= RUN_SECONDS) {
    run.time = RUN_SECONDS
    run.phase = 'won'
    return
  }
  const length = Math.hypot(input.x, input.y) || 1
  p.x += (input.x / length) * p.speed * dt
  p.y += (input.y / length) * p.speed * dt
  p.moving = Boolean(input.x || input.y)
  if (input.x) p.facing = input.x > 0 ? 1 : -1
  p.invincible = Math.max(0, p.invincible - dt)

  run.pickupFlash = Math.max(0, run.pickupFlash - dt)
  run.effects = run.effects.filter(effect => (effect.life -= dt) > 0)
  if (run.upgrades.guard && !p.shield) {
    p.shieldClock += dt
    if (p.shieldClock >= 16 - run.upgrades.guard * 2) {
      p.shield = true
      p.shieldClock = 0
    }
  }
  if (run.upgrades.regen) {
    p.regenClock += dt
    if (p.regenClock >= 14 - run.upgrades.regen * 2) {
      p.hp = Math.min(p.maxHp, p.hp + 1)
      p.regenClock = 0
    }
  }
  run.spawnClock -= dt
  if (run.spawnClock <= 0) {
    const count =
      run.mode === 'intro'
        ? 1 + Math.floor(run.time / 22)
        : Math.min(10, 2 + Math.floor(run.wave / 2))
    for (let i = 0; i < count; i++) spawn(run, width, height)
    run.spawnClock =
      run.mode === 'intro'
        ? Math.max(0.22, 0.65 - run.time * 0.004)
        : Math.max(0.2, 0.65 - run.wave * 0.035)
  }
  if (run.time >= run.nextBoss) {
    run.nextBoss = run.mode === 'intro' ? Infinity : run.nextBoss + 60
    run.bossSpawned = true
    spawn(run, width, height, true)
  }

  if (run.mode === 'endless' && run.time >= run.nextElite) {
    spawn(run, width, height, false, true)
    run.nextElite += 30
  }
  run.shotClock -= dt
  if (run.shotClock <= 0 && run.enemies.length) {
    const targets = run.enemies
      .filter(e => e.hp > 0)
      .sort((a, b) => distance(a, p) - distance(b, p))
    if (targets.length) {
      for (
        let i = 0;
        i < p.quills + (run.upgrades.thornstorm ? 3 : 0) &&
        run.shots.length < LIMITS.shots;
        i++
      ) {
        const target = targets[i % targets.length]
        const angle =
          Math.atan2(target.y - p.y, target.x - p.x) +
          (i >= targets.length ? (i % 2 ? 0.12 : -0.12) : 0)
        run.shots.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * p.shotSpeed,
          vy: Math.sin(angle) * p.shotSpeed,
          life: 1.8,
          hits: [],
          damage:
            p.damage *
            (run.upgrades.thornstorm ? 1.5 : 1) *
            (p.crit > 0 && random(run) < p.crit ? 2 : 1),
          pierce: p.pierce
        })
      }
      run.shotClock = p.rate
    }
  }
  castAbilities(run, dt)
  const orbits = orbitPositions(run)
  for (const e of run.enemies) {
    if (e.hp <= 0) continue
    const d = distance(e, p) || 1
    moveEnemy(run, e, dt)

    e.flash = Math.max(0, e.flash - dt)
    e.orbitHit = Math.max(0, e.orbitHit - dt)
    if (!e.orbitHit && orbits.some(o => distance(o, e) < e.radius + 9)) {
      hit(run, e, p.damage * (1 + (run.upgrades.resonance || 0) * 0.4))
      e.orbitHit = 0.45
    }
    if (e.hp > 0 && distance(e, p) < e.radius + 10 && !p.invincible) {
      hurtPlayer(run)
      e.x -= ((p.x - e.x) / d) * 35
      e.y -= ((p.y - e.y) / d) * 35
      burst(run, p.x, p.y, '#e6b785')
      if (!p.hp) {
        run.phase = 'lost'
        return
      }
    }
    // Keep pursuit local during long runs, retaining the boss.
    if (e.kind !== 'boss' && distance(e, p) > Math.max(width, height) * 1.4)
      e.escaped = true
  }
  for (const shot of run.shots) {
    if (shot.life <= 0) continue
    const from = { x: shot.x, y: shot.y }
    const travel = Math.min(dt, shot.life)
    shot.x += shot.vx * travel
    shot.y += shot.vy * travel
    shot.life -= dt
    const collisions = []
    for (const e of run.enemies) {
      if (e.hp <= 0 || shot.hits.includes(e.id)) continue
      const time = segmentHitTime(from, shot, e, e.radius + p.shotSize)
      if (time !== Infinity) collisions.push({ enemy: e, time })
    }
    collisions.sort((a, b) => a.time - b.time || a.enemy.id - b.enemy.id)
    for (const { enemy: e } of collisions) {
      if (shot.hits.length > shot.pierce) break
      hit(run, e, shot.damage)
      if (run.upgrades.frost) e.slow = 2
      shot.hits.push(e.id)
      if (shot.hits.length > shot.pierce) shot.life = 0
    }
  }
  updateHazards(run, dt)
  if (run.phase === 'lost') return
  run.enemies = run.enemies.filter(e => e.hp > 0 && !e.escaped)
  run.shots = run.shots.filter(s => s.life > 0)
  for (const gem of run.gems) {
    const d = distance(gem, p)
    gem.age = (gem.age || 0) + dt
    if (
      run.mode === 'endless' &&
      (gem.age >= 12 || d > Math.max(width, height) * 1.3)
    ) {
      collectExperience(run, gem.value)
      gem.collected = true
      continue
    }
    if (d < p.magnet) gem.attracted = true
    if (gem.attracted && d > 0) {
      const travel = Math.min(d, 330 * dt)
      gem.x += ((p.x - gem.x) / d) * travel
      gem.y += ((p.y - gem.y) / d) * travel
    }
    if (distance(gem, p) < 14) {
      collectExperience(run, gem.value)
      gem.collected = true
    }
  }
  run.gems = run.gems.filter(g => !g.collected)
  for (const spark of run.sparks) {
    spark.x += spark.vx * dt
    spark.y += spark.vy * dt
    spark.life -= dt
  }
  run.sparks = run.sparks.filter(s => s.life > 0)
  resolveLevels(run)
}

// Use measured frame work, not user-agent or an arbitrary device score.
export function assessPerformance(samples, quality = 'full', slowWindows = 0) {
  if (samples.length < 60) return { quality, slowWindows, stop: false, p95: 0 }
  const sorted = [...samples].sort((a, b) => a - b)
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)]
  const slow = p95 > 24
  return {
    p95,
    quality: p95 > 10 ? 'low' : quality,
    slowWindows: slow ? slowWindows + 1 : 0,
    stop: quality === 'low' && slow && slowWindows >= 1
  }
}
