import {
  createRunner,
  stepRunner,
  moveRunner,
  grantRunnerXp,
  MAX_POWER,
  PLAYER_LINE,
  RUNNER_LIMITS
} from '@/themes/medium/lib/hedgehogRunner'
import {
  RUNNER_UPGRADES,
  RUNNER_EVOLUTIONS,
  runnerSlots,
  runnerChoiceLevel,
  runnerUpgradeAvailable,
  rollRunnerChoices,
  chooseRunnerUpgrade,
  rerollRunner,
  canRerollRunner
} from '@/themes/medium/lib/runnerUpgrades'

const quiet = () => ({
  ...createRunner('endless', 42),
  phase: 'playing',
  nextGate: Infinity,
  nextEnemy: Infinity,
  nextBoss: Infinity,
  nextShot: Infinity
})
const enemy = (id, lane, y, hp = 100, type = 'normal') => ({
  id,
  lane,
  y,
  hp,
  maxHp: hp,
  kind: 'enemy',
  type,
  speed: 0.13,
  hit: 0,
  charge: 'ready',
  chargeClock: 0,
  attackClock: 0.1,
  holdClock: 8
})
const upgrade = id => RUNNER_UPGRADES.find(u => u.id === id)
const drain = run => {
  while (run.phase === 'upgrade') chooseRunnerUpgrade(run, run.choices[0].id)
}
const advance = (run, seconds) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) stepRunner(run, 1 / 60)
}

test('earned experience is conserved and consecutive level rewards freeze the entire world', () => {
  const run = quiet()
  grantRunnerXp(run, 47)
  expect([run.level, run.xp, run.nextXp, run.pendingUpgrades]).toEqual([
    4, 2, 25, 3
  ])
  stepRunner(run, 0.01)
  expect(run.phase).toBe('upgrade')
  expect(runnerChoiceLevel(run)).toBe(2)
  expect(run.choices.every(u => u.unlock <= 2)).toBe(true)
  const frozen = JSON.stringify(run)
  stepRunner(run, 10)
  moveRunner(run, 1)
  expect(JSON.stringify(run)).toBe(frozen)
  expect(chooseRunnerUpgrade(run, 'made-up')).toBe(false)
  chooseRunnerUpgrade(run, run.choices[0].id)
  expect(run.phase).toBe('upgrade')
  expect(runnerChoiceLevel(run)).toBe(3)
  const time = run.time
  drain(run)
  expect(run.phase).toBe('playing')
  expect(run.time).toBe(time)
  expect(run.xp).toBe(2)
})

test('stage unlocks, six slots and maximum ranks constrain choices without blocking evolution', () => {
  const run = quiet()
  run.level = 10
  run.pendingUpgrades = 1
  run.upgrades = { haste: 3, pierce: 2, power: 4, heart: 3, guard: 3, focus: 4 }
  expect(runnerSlots(run)).toBe(6)
  expect(runnerUpgradeAvailable(run, upgrade('twin'))).toBeFalsy()
  expect(runnerUpgradeAvailable(run, upgrade('power'))).toBeFalsy()
  expect(runnerUpgradeAvailable(run, upgrade('barrage'))).toBeTruthy()
  rollRunnerChoices(run)
  expect(run.choices.some(u => u.id === 'barrage')).toBe(true)
  expect(run.choices.some(u => ['haste', 'pierce'].includes(u.id))).toBe(true)
  run.phase = 'upgrade'
  chooseRunnerUpgrade(run, 'barrage')
  expect(runnerSlots(run)).toBe(6)
  expect(runnerUpgradeAvailable(run, upgrade('barrage'))).toBeFalsy()
})

test.each(RUNNER_EVOLUTIONS.map(u => [u.id, u.requires]))(
  '%s requires every ingredient and level 10',
  (id, requires) => {
    const run = quiet()
    run.pendingUpgrades = 1
    run.level = 9
    run.upgrades = { ...requires }
    expect(runnerUpgradeAvailable(run, upgrade(id))).toBeFalsy()
    run.level = 10
    expect(runnerUpgradeAvailable(run, upgrade(id))).toBeTruthy()
    run.upgrades[Object.keys(requires)[0]]--
    expect(runnerUpgradeAvailable(run, upgrade(id))).toBeFalsy()
  }
)

test('rerolls offer a different card, preserve the queued level and cannot overspend', () => {
  const run = quiet()
  grantRunnerXp(run, 10)
  stepRunner(run, 0.01)
  for (let i = 0; i < 3; i++) {
    const before = run.choices.map(u => u.id)
    expect(rerollRunner(run)).toBe(true)
    expect(run.choices.some(u => !before.includes(u.id))).toBe(true)
    expect(new Set(run.choices.map(u => u.id)).size).toBe(run.choices.length)
    expect(run.pendingUpgrades).toBe(1)
  }
  expect(run.rerolls).toBe(0)
  expect(rerollRunner(run)).toBe(false)
})

test('a capped build can always choose a useful supply without a fake reroll', () => {
  const run = quiet()
  run.level = 40
  run.pendingUpgrades = 2
  run.phase = 'upgrade'
  run.upgrades = {
    power: 4,
    heart: 3,
    guard: 3,
    scholar: 3,
    execute: 3,
    leech: 3
  }
  rollRunnerChoices(run)
  expect(run.choices.map(u => u.id)).toEqual(['vigor'])
  expect(canRerollRunner(run)).toBe(false)
  chooseRunnerUpgrade(run, 'vigor')
  expect(run.phase).toBe('upgrade')
  chooseRunnerUpgrade(run, 'vigor')
  expect(run.upgrades.vigor).toBe(2)
  expect(run.phase).toBe('playing')
})

test('enemy health follows course time and does not cancel a power gate or a damage upgrade', () => {
  const low = quiet(),
    high = quiet()
  for (const run of [low, high]) {
    run.time = 45
    run.nextEnemy = 0
  }
  high.power = MAX_POWER
  high.upgrades = { power: 4, haste: 4 }
  stepRunner(low, 0.01)
  stepRunner(high, 0.01)
  expect(high.items.map(e => e.maxHp)).toEqual(low.items.map(e => e.maxHp))
  expect(high.items.map(e => e.lane)).toEqual(low.items.map(e => e.lane))
})

test('combat random draws do not change course spawning or future upgrade cards', () => {
  const idle = quiet(),
    firing = quiet()
  firing.nextShot = 0
  firing.upgrades.focus = 3
  idle.upgrades.focus = 3
  advance(idle, 2)
  advance(firing, 2)
  expect(firing.seed).toBe(idle.seed)
  expect(firing.combatSeed).not.toBe(idle.combatSeed)
  for (const run of [idle, firing]) {
    grantRunnerXp(run, 10)
    stepRunner(run, 0.01)
  }
  expect(firing.choices.map(u => u.id)).toEqual(idle.choices.map(u => u.id))
})

test('piercing uses contact order and never damages the same target twice', () => {
  const run = quiet()
  const far = enemy(1, 0, 0.66),
    near = enemy(2, 0, 0.74),
    other = enemy(3, 1, 0.74)
  run.items = [far, near, other]
  run.shots = [{ id: 99, lane: 0, y: 0.77, power: 7, remaining: 2 }]
  stepRunner(run, 0.08)
  expect(near.hp).toBe(93)
  expect(far.hp).toBe(93)
  expect(other.hp).toBe(100)
  stepRunner(run, 0.1)
  expect(far.hp).toBe(93)
  expect(run.shots).toHaveLength(0)
})

test('a single projectile stops at the closest enemy even when scene order is reversed', () => {
  const run = quiet()
  const far = enemy(1, 0, 0.69),
    near = enemy(2, 0, 0.72)
  run.items = [far, near]
  run.shots = [{ id: 99, lane: 0, y: 0.77, power: 10 }]
  stepRunner(run, 0.08)
  expect(near.hp).toBe(90)
  expect(far.hp).toBe(100)
})

test('missed and offscreen enemies do not absorb a projectile behind them', () => {
  const run = quiet()
  const behind = enemy(1, 0, 0.5),
    offscreen = enemy(2, 0, -0.12)
  run.items = [behind, offscreen]
  run.shots = [{ id: 99, lane: 0, y: 0.1, power: 1000 }]
  stepRunner(run, 0.25)
  expect(behind.hp).toBe(100)
  expect(offscreen.hp).toBe(100)
  expect(run.shots).toHaveLength(0)
})

test('splash crosses lanes, awards every kill once and frost slows the surviving primary target', () => {
  const run = quiet()
  run.upgrades = { blast: 2, frost: 2 }
  const primary = enemy(1, 0, 0.7, 100),
    other = enemy(2, 1, 0.7, 4)
  run.items = [primary, other]
  run.shots = [{ id: 99, lane: 0, y: 0.77, power: 10 }]
  stepRunner(run, 0.08)
  expect(primary.hp).toBe(90)
  expect(primary.slow).toBeGreaterThan(1.8)
  expect(run.kills).toBe(1)
  expect(run.xp).toBe(5)
  expect(run.score).toBe(10)
  stepRunner(run, 0.1)
  expect(run.kills).toBe(1)
})

test('ice evolution freezes ordinary splash targets but never freezes a boss', () => {
  const run = quiet()
  run.upgrades = { blast: 2, frost: 2, blizzard: 1 }
  const normal = enemy(2, 1, 0.7),
    boss = enemy(3, 1, 0.6, 1000, 'boss')
  run.items = [enemy(1, 0, 0.7), normal, boss]
  run.shots = [{ id: 99, lane: 0, y: 0.77, power: 10 }]
  stepRunner(run, 0.08)
  expect(normal.frozen).toBeGreaterThan(0.5)
  expect(boss.frozen).toBe(0)
})

test('support shots have their own lane and gain full power through crossfire', () => {
  for (const evolved of [false, true]) {
    const run = quiet()
    run.power = 10
    run.upgrades = { twin: 2, ...(evolved ? { crossfire: 1 } : {}) }
    run.nextShot = 0
    stepRunner(run, 0.01)
    expect(run.shots.map(s => [s.lane, s.power])).toEqual([
      [0, 10],
      [1, evolved ? 10 : 5]
    ])
  }
})

test('shields absorb one hit, invulnerability prevents a double hit, and guard recharges', () => {
  const run = quiet()
  run.upgrades.guard = 3
  run.shield = true
  run.items = [
    enemy(1, 0, PLAYER_LINE - 0.001),
    enemy(2, 0, PLAYER_LINE - 0.001)
  ]
  stepRunner(run, 0.02)
  expect(run.hp).toBe(3)
  expect(run.shield).toBe(false)
  advance(run, 14.1)
  expect(run.shield).toBe(true)
})

test('a charger warns before accelerating; a boss warning allows a safe lane change', () => {
  const run = quiet()
  const charger = enemy(1, 0, 0.39, 100, 'charger')
  run.items = [charger]
  stepRunner(run, 0.01)
  expect(charger.charge).toBe('warning')
  advance(run, 0.65)
  expect(charger.charge).toBe('warning')
  advance(run, 0.2)
  expect(charger.charge).toBe('charging')
  const boss = enemy(2, 0, 0.2, 1000, 'boss')
  run.items = [boss]
  advance(run, 0.2)
  expect(run.warnings).toHaveLength(1)
  expect(run.hp).toBe(3)
  moveRunner(run, 1)
  advance(run, 1.2)
  expect(run.hp).toBe(3)
})

test('a boss warning damages the threatened lane exactly once', () => {
  const run = quiet()
  run.items = [enemy(1, 0, 0.2, 1000, 'boss')]
  advance(run, 1.5)
  expect(run.hp).toBe(2)
  advance(run, 0.3)
  expect(run.hp).toBe(2)
})

test('defeating a boss cancels its attack, grants experience, a reroll and bounded healing', () => {
  const run = quiet()
  run.hp = 2
  run.rerolls = 5
  const boss = enemy(1, 0, 0.7, 5, 'boss')
  run.items = [boss]
  run.warnings = [{ id: 2, source: 1, lane: 0, life: 0.1 }]
  run.shots = [{ id: 99, lane: 0, y: 0.74, power: 10 }]
  stepRunner(run, 0.08)
  expect([run.bosses, run.score, run.hp, run.rerolls]).toEqual([1, 150, 3, 5])
  expect(run.warnings).toHaveLength(0)
  expect(run.pendingUpgrades).toBe(3)
})

test.each(['multiply', 'heal', 'shield', 'xp'])(
  'the %s gate remains rewarding at full power and full resources',
  operation => {
    const run = quiet()
    run.power = MAX_POWER
    run.shield = true
    run.items = [
      {
        id: 1,
        row: 1,
        kind: 'gate',
        lane: 0,
        y: PLAYER_LINE - 0.001,
        speed: 0.2,
        operation,
        value: 2
      },
      {
        id: 2,
        row: 1,
        kind: 'gate',
        lane: 1,
        y: PLAYER_LINE - 0.001,
        speed: 0.2,
        operation: 'multiply',
        value: 2
      }
    ]
    stepRunner(run, 0.02)
    expect(run.gates).toBe(1)
    expect(run.items).toHaveLength(0)
    expect(run.power).toBe(MAX_POWER)
    expect(run.level).toBeGreaterThan(1)
    expect(run.hp).toBe(3)
  }
)

test('short stalls advance the same simulation as regular frames, with bounded catch-up', () => {
  const one = quiet(),
    many = quiet()
  for (const run of [one, many]) {
    run.nextEnemy = 0
    run.nextShot = 0
  }
  stepRunner(one, 0.2)
  advance(many, 0.2)
  expect(one.time).toBeCloseTo(many.time, 10)
  expect(one.items.map(item => [item.id, item.hp])).toEqual(
    many.items.map(item => [item.id, item.hp])
  )
  one.items.forEach((item, i) =>
    expect(item.y).toBeCloseTo(many.items[i].y, 10)
  )
  expect(one.shots.length).toBe(many.shots.length)
  stepRunner(one, 20)
  expect(one.time).toBeCloseTo(0.45)
})

test('a twenty-minute simulation with a complete build keeps entities bounded', () => {
  const run = createRunner('endless', 6)
  run.phase = 'playing'
  run.power = MAX_POWER
  run.upgrades = {
    haste: 4,
    pierce: 3,
    twin: 3,
    blast: 3,
    frost: 3,
    focus: 4,
    barrage: 1,
    blizzard: 1,
    crossfire: 1
  }
  let warnings = 0
  for (let i = 0; i < 36000; i++) {
    run.hp = 3
    run.invincible = 1
    if (run.phase === 'upgrade') drain(run)
    stepRunner(run, 1 / 30)
    warnings += run.warnings.length
    for (const key of Object.keys(RUNNER_LIMITS))
      expect(run[key].length).toBeLessThanOrEqual(RUNNER_LIMITS[key])
    expect(Number.isFinite(run.score)).toBe(true)
  }
  expect(run.time).toBeGreaterThan(1198)
  expect(run.time).toBeLessThanOrEqual(1200)
  expect(run.level).toBeGreaterThan(15)
  expect(warnings).toBeGreaterThan(0)
})

test('experience bonuses are applied once, and gate rewards do not disappear into the upgrade queue', () => {
  const run = quiet()
  run.upgrades.scholar = 3
  expect(grantRunnerXp(run, 5)).toBe(8)
  expect(run.xp).toBe(8)
  run.items = [
    {
      id: 1,
      row: 1,
      kind: 'gate',
      lane: 0,
      y: PLAYER_LINE - 0.001,
      speed: 0.2,
      operation: 'xp',
      value: 1
    }
  ]
  stepRunner(run, 0.02)
  // 8 + 18 × 1.6 + 3 × 1.6 = 41.6; two levels consume 10 + 15.
  expect(run.pendingUpgrades).toBe(2)
  expect(run.xp).toBeCloseTo(16.6)
  expect(run.gates).toBe(1)
})

test('execute only boosts half-health targets and leech restores health on its kill threshold', () => {
  const run = quiet()
  run.upgrades = { execute: 2, leech: 3 }
  run.leechKills = 11
  run.hp = 1
  run.nextXp = 1000
  const target = enemy(1, 0, 0.7, 100)
  target.hp = 15
  run.items = [target]
  run.shots = [{ id: 99, lane: 0, y: 0.74, power: 10 }]
  stepRunner(run, 0.05)
  expect(run.kills).toBe(1)
  expect(run.hp).toBe(2)
  expect(run.leechKills).toBe(0)
})
