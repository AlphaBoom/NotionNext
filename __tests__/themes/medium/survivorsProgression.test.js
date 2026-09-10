/** @jest-environment node */
import {
  chooseUpgrade,
  createRun,
  LIMITS,
  offerUpgrades,
  rerollUpgrades,
  stepRun
} from '@/themes/medium/lib/survivors'
import {
  UPGRADES,
  upgradeAvailable
} from '@/themes/medium/lib/survivorsUpgrades'

const idle = { x: 0, y: 0 }
function playing() {
  const run = createRun(72, 'endless')
  run.phase = 'playing'
  run.spawnClock = run.nextBoss = run.nextElite = 1e9
  return run
}
function enemy(id, x, y, hp = 200) {
  return {
    id,
    x,
    y,
    hp,
    maxHp: hp,
    radius: 11,
    speed: 0,
    kind: 'blob',
    flash: 0,
    orbitHit: 0
  }
}
function equip(run, id, rank = 1) {
  for (let i = 0; i < rank; i++) {
    run.phase = 'upgrade'
    run.choices = [UPGRADES.find(u => u.id === id)]
    chooseUpgrade(run, id)
  }
}
function advance(run, seconds, input = idle) {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepRun(run, input, 1 / 60)
}

test('stale and distant drops are collected once and every earned level waits for a choice', () => {
  const run = playing()
  run.gems = [{ x: 400, y: 0, value: 40, age: 12 }]
  stepRun(run, idle, 1 / 60)
  expect(run.gems).toHaveLength(0)
  expect(run.xpEarned).toBe(40)
  expect(run.level).toBe(5)
  expect(run.xp).toBe(2)
  expect(run.nextXp).toBe(17)
  expect(run.pendingUpgrades).toBe(4)
  const time = run.time
  for (let remaining = 4; remaining > 0; remaining--) {
    expect(run.phase).toBe('upgrade')
    advance(run, 2, { x: 1, y: 0 })
    expect(run.time).toBe(time)
    expect(chooseUpgrade(run, run.choices[0].id)).toBe(true)
    expect(run.pendingUpgrades).toBe(remaining - 1)
  }
  expect(run.phase).toBe('playing')
  run.gems = [{ x: 1500, y: 0, value: 1 }]
  advance(run, 1)
  expect(run.xpEarned).toBe(41)
  expect(run.gems).toHaveLength(0)
})

test('normal drops can be picked up immediately; scholarship carries fractional XP without losing it', () => {
  const run = playing()
  equip(run, 'scholar')
  run.nextXp = 1000
  for (let i = 0; i < 25; i++) {
    run.gems.push({ x: 0, y: 0, value: 1 })
    stepRun(run, idle, 1 / 60)
  }
  expect(run.xp).toBe(28)
  expect(run.xpFraction).toBeCloseTo(0)
  expect(run.gems).toHaveLength(0)
})

test('continuous XP pickups use bounded display windows without losing earned XP', () => {
  const run = playing()
  run.nextXp = 1000
  for (let i = 0; i < 20; i++) {
    run.gems.push({ x: 0, y: 0, value: 1 })
    stepRun(run, idle, 1 / 60)
    expect(run.pickupValue).toBe(i % 2 === 0 ? 1 : 2)
    advance(run, 0.5 - 1 / 60)
  }
  expect(run.xp).toBe(20)
  expect(run.xpEarned).toBe(20)
  expect(run.gems).toHaveLength(0)

  advance(run, 1)
  expect(run.pickupFlash).toBe(0)
  run.gems.push({ x: 0, y: 0, value: 3 })
  stepRun(run, idle, 1 / 60)
  expect(run.pickupValue).toBe(3)
  expect(run.xpEarned).toBe(23)
})

test('large rewards unlock tiers in order, with capped upgrades removed and prerequisite evolutions guaranteed', () => {
  const run = playing()
  run.level = 5
  run.pendingUpgrades = 4
  offerUpgrades(run)
  expect(run.choices.every(u => u.unlock === 1)).toBe(true)
  run.pendingUpgrades = 0
  run.level = 12
  equip(run, 'quills', 3)
  equip(run, 'haste', 3)
  offerUpgrades(run)
  expect(run.choices.some(u => u.id === 'thornstorm')).toBe(true)
  expect(run.choices.some(u => u.id === 'blizzard' || u.id === 'tempest')).toBe(
    false
  )
  chooseUpgrade(run, 'thornstorm')
  expect(
    upgradeAvailable(
      run,
      UPGRADES.find(u => u.id === 'thornstorm')
    )
  ).toBe(false)
  equip(run, 'focus', 5)
  for (let i = 0; i < 30; i++) {
    offerUpgrades(run)
    expect(run.choices.some(u => u.id === 'focus')).toBe(false)
    expect(new Set(run.choices.map(u => u.id)).size).toBe(run.choices.length)
  }
})

test('reroll changes available choices without spending a level; exhausted builds retain useful choices', () => {
  const run = playing()
  run.level = 14
  run.pendingUpgrades = 1
  offerUpgrades(run)
  const old = run.choices.map(u => u.id)
  expect(rerollUpgrades(run)).toBe(true)
  expect(run.choices.every(u => !old.includes(u.id))).toBe(true)
  expect(run.pendingUpgrades).toBe(1)
  expect(run.level).toBe(14)
  expect(run.rerolls).toBe(2)
  run.rerolls = 0
  expect(rerollUpgrades(run)).toBe(false)
  run.level = 100
  for (const u of UPGRADES.filter(u => Number.isFinite(u.max)))
    run.upgrades[u.id] = u.max
  offerUpgrades(run)
  expect(run.choices.map(u => u.id)).toEqual(['vigor'])
  run.player.hp = 1
  offerUpgrades(run)
  expect(run.choices.map(u => u.id)).toContain('ration')
  chooseUpgrade(run, 'ration')
  expect(run.player.hp).toBe(5)
})

test('eight selected abilities preserve build identity while evolutions and reinforcements stay available', () => {
  const run = playing()
  run.level = 30
  for (const id of [
    'quills',
    'haste',
    'power',
    'heart',
    'storm',
    'focus',
    'guard',
    'regen'
  ])
    equip(run, id, 3)
  expect(
    upgradeAvailable(
      run,
      UPGRADES.find(u => u.id === 'nova')
    )
  ).toBe(false)
  expect(
    upgradeAvailable(
      run,
      UPGRADES.find(u => u.id === 'quills')
    )
  ).toBe(true)
  expect(
    upgradeAvailable(
      run,
      UPGRADES.find(u => u.id === 'tempest')
    )
  ).toBe(true)
  expect(
    upgradeAvailable(
      run,
      UPGRADES.find(u => u.id === 'vigor')
    )
  ).toBe(true)
})

test('chain lightning travels across distinct targets; ice nova freezes only non-bosses', () => {
  const run = playing()
  run.shotClock = 100
  equip(run, 'storm', 2)
  run.enemies = [
    enemy(1, 100, 0),
    enemy(2, 260, 0),
    enemy(3, 420, 0),
    enemy(4, 650, 0)
  ]
  stepRun(run, idle, 1 / 60)
  expect(run.enemies.filter(e => e.hp < e.maxHp).map(e => e.id)).toEqual([
    1, 2, 3
  ])
  expect(run.effects.filter(e => e.kind === 'lightning')).toHaveLength(3)
  equip(run, 'nova', 2)
  equip(run, 'blizzard')
  run.enemies = [
    enemy(5, 60, 0),
    { ...enemy(6, 70, 0), kind: 'boss', attackClock: 10 },
    enemy(7, 500, 0)
  ]
  stepRun(run, idle, 1 / 60)
  expect(run.enemies[0].frozen).toBeGreaterThan(1)
  expect(run.enemies[1].frozen).toBe(0)
  expect(run.enemies[2].hp).toBe(200)
})

test('shield blocks one hit and recharges; regeneration and kill healing have real cooldowns', () => {
  const run = playing()
  equip(run, 'guard')
  equip(run, 'regen')
  run.player.hp = 3
  run.shotClock = 100
  run.enemies = [enemy(1, 0, 0)]
  stepRun(run, idle, 1 / 60)
  expect(run.player.hp).toBe(3)
  expect(run.player.shield).toBe(false)
  run.enemies = []
  advance(run, 14.1)
  expect(run.player.shield).toBe(true)
  expect(run.player.hp).toBe(4)
  equip(run, 'leech', 3)
  run.leechKills = 20
  run.enemies = [enemy(2, 50, 0, 1)]
  run.shotClock = 0
  advance(run, 0.2)
  expect(run.kills).toBe(1)
  expect(run.player.hp).toBe(5)
})

test.each([9.8, 11.9])(
  'regeneration upgrade preserves %s seconds of progress and uses the shorter interval',
  elapsed => {
    const run = playing()
    equip(run, 'regen')
    run.player.hp = 1
    advance(run, elapsed)
    expect(run.player.hp).toBe(1)

    equip(run, 'regen')
    advance(run, 0.3)
    expect(run.player.hp).toBe(2)
    advance(run, 9.5)
    expect(run.player.hp).toBe(2)
    advance(run, 0.6)
    expect(run.player.hp).toBe(3)
  }
)

test('fast projectiles cannot tunnel through targets or damage the same target twice', () => {
  const run = playing()
  run.shotClock = 100
  run.enemies = [enemy(1, 50, 0, 10)]
  run.shots = [
    { x: 0, y: 0, vx: 6000, vy: 0, life: 1, damage: 2, pierce: 3, hits: [] }
  ]
  stepRun(run, idle, 1 / 30)
  expect(run.enemies[0].hp).toBe(8)
  expect(run.shots[0].hits).toEqual([1])
})

test.each([false, true])(
  'quills hit the first intersected enemy regardless of spawn order (reverse=%s)',
  reverse => {
    const run = playing()
    run.shotClock = 100
    const near = enemy(1, 110, 0, 10)
    const far = enemy(2, 116, 0, 10)
    run.enemies = reverse ? [near, far] : [far, near]
    run.shots = [
      { x: 90, y: 0, vx: 656, vy: 0, life: 1, damage: 2, pierce: 0, hits: [] }
    ]
    stepRun(run, idle, 1 / 60)
    expect(near.hp).toBe(8)
    expect(far.hp).toBe(10)
  }
)

test('piercing follows entry points, including large targets and overlapping targets', () => {
  const run = playing()
  run.shotClock = 100
  const small = enemy(1, 135, 0, 10)
  const large = { ...enemy(2, 145, 0, 10), radius: 30 }
  const overlap = enemy(3, 100, 0, 10)
  run.enemies = [small, large, overlap]
  run.shots = [
    { x: 100, y: 0, vx: 6000, vy: 0, life: 1, damage: 2, pierce: 1, hits: [] }
  ]
  stepRun(run, idle, 1 / 60)
  expect(overlap.hp).toBe(8)
  expect(large.hp).toBe(8)
  expect(small.hp).toBe(10)
})

test.each([0.005, 0])(
  'projectiles only collide along their remaining lifetime (%s seconds)',
  life => {
    const run = playing()
    run.shotClock = 100
    const near = enemy(1, 120, 0, 10)
    const far = enemy(2, 175, 0, 10)
    run.enemies = [near, far]
    run.shots = [
      { x: 100, y: 0, vx: 6000, vy: 0, life, damage: 2, pierce: 2, hits: [] }
    ]
    stepRun(run, idle, 1 / 60)
    expect(near.hp).toBe(life ? 8 : 10)
    expect(far.hp).toBe(10)
    expect(run.shots).toHaveLength(0)
  }
)

test.each([0.005, 0])(
  'expired hostile shots cannot damage or consume shields (%s seconds)',
  life => {
    const run = playing()
    equip(run, 'guard')
    run.hazards = [{ x: -100, y: 0, vx: 6000, vy: 0, life }]
    stepRun(run, idle, 1 / 60)
    expect(run.player.shield).toBe(true)
    expect(run.hazards).toHaveLength(0)
  }
)

test('enemy attacks telegraph before firing or dashing, and shield collision also covers hostile shots', () => {
  const run = playing()
  run.shotClock = 100
  run.enemies = [
    { ...enemy(1, 100, 0), kind: 'boss', attackClock: 0, warning: 0, dash: 0 }
  ]
  stepRun(run, idle, 1 / 60)
  expect(run.enemies[0].warning).toBeGreaterThan(0)
  expect(run.hazards).toHaveLength(0)
  advance(run, 1)
  expect(run.hazards.length).toBeGreaterThan(0)
  run.enemies = [
    {
      ...enemy(2, 150, 0),
      kind: 'charger',
      attackClock: 0,
      warning: 0,
      dash: 0
    }
  ]
  run.hazards = []
  advance(run, 0.6)
  expect(run.enemies[0].x).toBe(150)
  advance(run, 0.3)
  expect(run.enemies[0].x).toBeLessThan(150)
  run.enemies = []
  equip(run, 'guard')
  const hp = run.player.hp
  run.hazards = [{ x: -50, y: 0, vx: 6000, vy: 0, life: 1 }]
  stepRun(run, idle, 1 / 60)
  expect(run.player.hp).toBe(hp)
  expect(run.player.shield).toBe(false)
  expect(run.hazards).toHaveLength(0)
})

test('a short frame stall catches up and low quality never changes combat RNG or upgrade choices', () => {
  const a = playing(),
    b = playing()
  for (let i = 0; i < 60; i++) stepRun(a, { x: 1, y: 0 }, 1 / 60)
  for (let i = 0; i < 10; i++) stepRun(b, { x: 1, y: 0 }, 0.1)
  expect(a.player.x).toBeCloseTo(b.player.x)
  expect(a.time).toBeCloseTo(b.time)
  const full = playing(),
    low = playing()
  low.quality = 'low'
  for (const r of [full, low]) {
    r.spawnClock = 0
    r.player.invincible = 1000
    r.player.damage = 100
    for (let i = 0; i < 6000; i++) {
      stepRun(r, idle, 1 / 60)
      while (r.phase === 'upgrade') chooseUpgrade(r, r.choices[0].id)
    }
  }
  for (const key of [
    'seed',
    'kills',
    'level',
    'upgrades',
    'xp',
    'enemies',
    'shots',
    'gems'
  ])
    expect(low[key]).toEqual(full[key])
})

test('fully equipped long runs keep all entity pools bounded with multiple bosses', () => {
  const run = playing()
  run.time = 600
  run.level = 50
  run.spawnClock = run.nextBoss = run.nextElite = 600
  run.spawnClock = 0
  run.player.invincible = 1000
  for (const id of [
    'quills',
    'orbit',
    'power',
    'haste',
    'nova',
    'storm',
    'frost',
    'focus'
  ])
    equip(run, id, 4)
  equip(run, 'blizzard')
  equip(run, 'thornstorm')
  equip(run, 'tempest')
  for (let i = 0; i < 60 * 120; i++) {
    stepRun(run, { x: Math.cos(run.time), y: Math.sin(run.time) }, 1 / 60)
    while (run.phase === 'upgrade') chooseUpgrade(run, run.choices[0].id)
    for (const [key, limit] of Object.entries(LIMITS))
      expect(run[key].length).toBeLessThanOrEqual(limit)
  }
  expect(run.time).toBeGreaterThan(719)
  expect(run.kills).toBeGreaterThan(0)
  expect(Number.isFinite(run.player.x)).toBe(true)
})
