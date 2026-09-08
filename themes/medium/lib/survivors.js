// Small, deterministic simulation. Rendering and browser lifecycle live elsewhere.
export const RUN_SECONDS = 90
export const LIMITS = { enemies: 96, shots: 160, gems: 100, sparks: 80 }
export const UPGRADES = [
  {
    id: 'quills',
    name: '蓬松炸毛',
    detail: '每轮多发射一根追敌飞刺',
    mark: '↗'
  },
  { id: 'haste', name: '急性子', detail: '自动攻击间隔缩短 18%', mark: '»' },
  { id: 'power', name: '硬刺', detail: '飞刺伤害 +1，穿透一个敌人', mark: '✦' },
  {
    id: 'orbit',
    name: '松果卫星',
    detail: '增加一枚环绕身边的松果',
    mark: '◎'
  },
  {
    id: 'magnet',
    name: '口袋宇宙',
    detail: '拾取范围 +45，移动速度 +10%',
    mark: '◇'
  },
  {
    id: 'heart',
    name: '热可可',
    detail: '生命上限 +1，并恢复 3 点生命',
    mark: '♡'
  }
]

export function createRun(seed = Date.now()) {
  return {
    seed: seed >>> 0 || 1,
    phase: 'ready',
    time: 0,
    kills: 0,
    level: 1,
    xp: 0,
    nextXp: 5,
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
      facing: 1,
      moving: false
    },
    enemies: [],
    shots: [],
    gems: [],
    sparks: [],
    nextId: 1
  }
}

function random(run) {
  let x = run.seed
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  run.seed = x >>> 0
  return run.seed / 4294967296
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export function offerUpgrades(run) {
  const pool = UPGRADES.filter(
    u =>
      !(u.id === 'quills' && run.player.quills >= 6) &&
      !(u.id === 'orbit' && run.player.orbit >= 4)
  )
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random(run) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  run.choices = pool.slice(0, 3)
  run.phase = 'upgrade'
}

export function chooseUpgrade(run, id) {
  if (run.phase !== 'upgrade' || !run.choices.some(u => u.id === id))
    return false
  const p = run.player
  if (id === 'quills') p.quills++
  if (id === 'haste') p.rate = Math.max(0.12, p.rate * 0.82)
  if (id === 'power') {
    p.damage++
    p.pierce = Math.min(4, p.pierce + 1)
  }
  if (id === 'orbit') p.orbit++
  if (id === 'magnet') {
    p.magnet += 45
    p.speed *= 1.1
  }
  if (id === 'heart') {
    p.maxHp++
    p.hp = Math.min(p.maxHp, p.hp + 3)
  }
  run.choices = []
  run.phase = 'playing'
  return true
}

function spawn(run, width, height, boss = false) {
  if (run.enemies.length >= LIMITS.enemies) {
    if (!boss) return
    run.enemies.shift()
  }
  const side = Math.floor(random(run) * 4)
  const along = random(run) * 2 - 1
  const x =
    side < 2 ? (side === 0 ? -1 : 1) * (width / 2 + 28) : (along * width) / 2
  const y =
    side >= 2 ? (side === 2 ? -1 : 1) * (height / 2 + 28) : (along * height) / 2
  const kind = boss
    ? 'boss'
    : run.time > 18 && random(run) < 0.3
      ? 'moth'
      : 'blob'
  const hp = boss
    ? 110
    : kind === 'moth'
      ? 2 + Math.floor(run.time / 40)
      : 2 + Math.floor(run.time / 24)
  run.enemies.push({
    id: run.nextId++,
    x: run.player.x + x,
    y: run.player.y + y,
    kind,
    hp,
    maxHp: hp,
    radius: boss ? 25 : 11,
    speed: boss ? 43 : kind === 'moth' ? 88 : 38 + run.time * 0.32,
    flash: 0,
    orbitHit: 0
  })
}

function burst(run, x, y, color) {
  if (run.quality === 'low') return
  for (let i = 0; i < 5 && run.sparks.length < LIMITS.sparks; i++) {
    const angle = random(run) * Math.PI * 2
    const speed = 20 + random(run) * 65
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
  enemy.hp -= damage
  enemy.flash = 0.09
  if (enemy.hp > 0) return
  run.kills++
  if (enemy.kind === 'boss') {
    run.bossDefeated = true
    run.player.hp = run.player.maxHp
  }
  const value = enemy.kind === 'boss' ? 20 : 1
  if (run.gems.length < LIMITS.gems)
    run.gems.push({ x: enemy.x, y: enemy.y, value, attracted: false })
  else {
    // Merge drops at the cap rather than silently deleting earned XP.
    let nearest = run.gems[0]
    for (const gem of run.gems)
      if (distance(gem, enemy) < distance(nearest, enemy)) nearest = gem
    nearest.value += value
  }
  burst(run, enemy.x, enemy.y, enemy.kind === 'boss' ? '#e6b785' : '#a9c7af')
}

export function orbitPositions(run) {
  return Array.from({ length: run.player.orbit }, (_, i) => {
    const angle = run.time * 2.8 + (i * Math.PI * 2) / run.player.orbit
    return {
      x: run.player.x + Math.cos(angle) * 57,
      y: run.player.y + Math.sin(angle) * 57
    }
  })
}

export function stepRun(run, input, elapsed, width = 900, height = 400) {
  if (run.phase !== 'playing') return
  const dt = Math.max(0, Math.min(elapsed, 1 / 30))
  const p = run.player
  run.time += dt
  if (run.time >= RUN_SECONDS) {
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

  run.spawnClock -= dt
  if (run.spawnClock <= 0) {
    const count = 1 + Math.floor(run.time / 22)
    for (let i = 0; i < count; i++) spawn(run, width, height)
    run.spawnClock = Math.max(0.22, 0.65 - run.time * 0.004)
  }
  if (run.time >= 60 && !run.bossSpawned) {
    run.bossSpawned = true
    spawn(run, width, height, true)
  }

  run.shotClock -= dt
  if (run.shotClock <= 0 && run.enemies.length) {
    const targets = run.enemies
      .filter(e => e.hp > 0)
      .sort((a, b) => distance(a, p) - distance(b, p))
    if (targets.length) {
      for (let i = 0; i < p.quills && run.shots.length < LIMITS.shots; i++) {
        const target = targets[i % targets.length]
        const angle =
          Math.atan2(target.y - p.y, target.x - p.x) +
          (i >= targets.length ? (i % 2 ? 0.12 : -0.12) : 0)
        run.shots.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * 410,
          vy: Math.sin(angle) * 410,
          life: 1.8,
          hits: [],
          damage: p.damage,
          pierce: p.pierce
        })
      }
      run.shotClock = p.rate
    }
  }
  const orbits = orbitPositions(run)
  for (const e of run.enemies) {
    const d = distance(e, p) || 1
    e.x += ((p.x - e.x) / d) * e.speed * dt
    e.y += ((p.y - e.y) / d) * e.speed * dt
    e.flash = Math.max(0, e.flash - dt)
    e.orbitHit = Math.max(0, e.orbitHit - dt)
    if (!e.orbitHit && orbits.some(o => distance(o, e) < e.radius + 9)) {
      hit(run, e, p.damage)
      e.orbitHit = 0.45
    }
    if (e.hp > 0 && distance(e, p) < e.radius + 10 && !p.invincible) {
      p.hp = Math.max(0, p.hp - 1)
      p.invincible = 1
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
    shot.x += shot.vx * dt
    shot.y += shot.vy * dt
    shot.life -= dt
    for (const e of run.enemies) {
      if (shot.life <= 0) break
      if (
        e.hp <= 0 ||
        shot.hits.includes(e.id) ||
        distance(shot, e) > e.radius + 5
      )
        continue
      hit(run, e, shot.damage)
      shot.hits.push(e.id)
      if (shot.hits.length > shot.pierce) shot.life = 0
    }
  }
  run.enemies = run.enemies.filter(e => e.hp > 0 && !e.escaped)
  run.shots = run.shots.filter(s => s.life > 0)
  for (const gem of run.gems) {
    const d = distance(gem, p)
    if (d < p.magnet) gem.attracted = true
    if (gem.attracted && d > 0) {
      const travel = Math.min(d, 330 * dt)
      gem.x += ((p.x - gem.x) / d) * travel
      gem.y += ((p.y - gem.y) / d) * travel
    }
    if (distance(gem, p) < 14) {
      run.xp += gem.value
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
  if (run.xp >= run.nextXp) {
    run.xp -= run.nextXp
    run.level++
    run.nextXp += 4
    offerUpgrades(run)
  }
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
