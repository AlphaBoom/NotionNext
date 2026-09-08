import {
  createRunner,
  gateLabel,
  gatePower,
  MAX_POWER,
  moveRunner,
  PLAYER_LINE,
  stepRunner,
  swipeLane
} from '@/themes/medium/lib/hedgehogRunner'

const playing = (mode = 'intro', seed = 4) => ({
  ...createRunner(mode, seed),
  phase: 'playing'
})
const quiet = () => ({
  ...playing(),
  nextGate: 100,
  nextEnemy: 100,
  nextShot: 100
})
const gate = (lane, operation, value) => ({
  id: lane + 1,
  row: 1,
  kind: 'gate',
  lane,
  y: PLAYER_LINE - 0.01,
  speed: 1,
  operation,
  value
})
const enemy = (id, lane, y, hp = 3) => ({
  id,
  kind: 'enemy',
  lane,
  y,
  speed: 0.13,
  hp,
  maxHp: hp,
  hit: 0
})

// Play with the information a player can see: take the stronger gate, aim at
// approaching monsters, and change lanes if an undamaged monster gets through.
function steer(run) {
  const gates = run.items.filter(
    item => item.kind === 'gate' && item.y > 0.62 && item.y < PLAYER_LINE
  )
  if (gates.length) {
    moveRunner(
      run,
      gates.sort((a, b) => gatePower(run.power, b) - gatePower(run.power, a))[0]
        .lane
    )
    return
  }
  const enemies = run.items
    .filter(item => item.kind === 'enemy' && item.y < PLAYER_LINE)
    .sort((a, b) => b.y - a.y)
  const front = enemies[0]
  if (front)
    moveRunner(
      run,
      front.y > 0.75 && front.hp > run.power ? 1 - front.lane : front.lane
    )
}

test('the first 30 seconds are winnable with visible gate and monster information', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const run = playing('intro', seed)
    let steps = 0
    while (run.phase === 'playing' && steps++ < 2000) {
      steer(run)
      stepRunner(run, 1 / 30)
      expect(run.items.length).toBeLessThan(24)
      expect(run.shots.length).toBeLessThan(8)
    }
    expect(run.phase).toBe('won')
    expect(run.time).toBe(30)
    expect(run.power).toBeGreaterThan(5)
    expect(run.kills).toBeGreaterThan(4)
    expect(run.gates).toBeGreaterThan(3)
  }
})

test('passing a gate applies the chosen operation once and consumes both choices', () => {
  const run = quiet()
  run.power = 3
  run.items = [gate(0, 'multiply', 2), gate(1, 'add', 2)]
  stepRunner(run, 0.02)
  expect(run.power).toBe(6)
  expect(run.gates).toBe(1)
  expect(run.items).toHaveLength(0)
  moveRunner(run, 1)
  stepRunner(run, 0.02)
  expect(run.power).toBe(6)
  run.items = [gate(0, 'multiply', 2), gate(1, 'add', 2)]
  stepRunner(run, 0.02)
  expect(run.power).toBe(8)
  expect(run.gates).toBe(2)
})

test('automatic quills use current firepower, hit only the nearest monster and award a kill', () => {
  const run = quiet()
  run.power = 4
  run.nextShot = 0
  run.items = [
    enemy(10, 0, 0.71, 4),
    enemy(11, 0, 0.65, 8),
    enemy(12, 1, 0.71, 4)
  ]
  stepRunner(run, 0.1)
  expect(run.kills).toBe(1)
  expect(run.score).toBe(10)
  expect(run.items.map(item => [item.id, item.hp])).toEqual([
    [11, 8],
    [12, 4]
  ])
  expect(run.shots).toHaveLength(0)
  run.power = 2
  run.nextShot = 0
  stepRunner(run, 0.1)
  expect(run.items.find(item => item.id === 11).hp).toBe(6)
  expect(run.items.find(item => item.id === 12).hp).toBe(4)
})

test('a monster survives weak shots and loses health on subsequent hits', () => {
  const run = quiet()
  run.items = [enemy(10, 0, 0.5, 5)]
  run.shots = [{ id: 20, lane: 0, y: 0.55, power: 2 }]
  stepRunner(run, 0.1)
  expect(run.items[0].hp).toBe(3)
  expect(run.items[0].hit).toBeGreaterThan(0)
  expect(run.kills).toBe(0)
})

test('enemy collisions cost health only once, respect invulnerability and can end a run', () => {
  const run = quiet()
  const incoming = id => enemy(id, 0, PLAYER_LINE - 0.001)
  run.items = [incoming(10), incoming(11)]
  stepRunner(run, 0.02)
  expect(run.hp).toBe(2)
  stepRunner(run, 0.02)
  expect(run.hp).toBe(2)
  run.hp = 1
  run.invincible = 0
  run.items = [incoming(12)]
  stepRunner(run, 0.02)
  expect(run.phase).toBe('lost')
})

test('negative gates reduce firepower but never remove the last quill; multiplication stays bounded', () => {
  expect(gatePower(1, { operation: 'add', value: -5 })).toBe(1)
  expect(gatePower(10, { operation: 'add', value: -2 })).toBe(8)
  expect(gatePower(MAX_POWER, { operation: 'multiply', value: 2 })).toBe(
    MAX_POWER
  )
  expect(gateLabel({ operation: 'multiply', value: 2 })).toBe('×2')
  expect(gateLabel({ operation: 'add', value: -5 })).toBe('−5')
  const run = quiet()
  run.power = 10
  run.items = [gate(0, 'add', -3)]
  stepRunner(run, 0.02)
  expect(run.power).toBe(7)
  expect(run.effects[0].kind).toBe('loss')
})

test('paused runs freeze bullets, enemies and the timer; endless does not unlock again', () => {
  const run = playing('endless')
  run.phase = 'paused'
  const before = JSON.stringify(run)
  stepRunner(run, 20)
  moveRunner(run, 1)
  expect(JSON.stringify(run)).toBe(before)
  run.phase = 'playing'
  run.time = 59.98
  run.nextGate = run.nextEnemy = 100
  stepRunner(run, 0.05)
  expect(run.phase).toBe('playing')
  expect(run.time).toBeGreaterThan(60)
})

test('endless challenge ramps up while scene size and numeric firepower remain bounded', () => {
  const run = playing('endless', 6)
  let greatestHealth = 0
  for (let step = 0; step < 18000; step++) {
    // Isolate long-running spawning/cleanup from player survival.
    run.hp = 3
    run.invincible = 1
    steer(run)
    stepRunner(run, 1 / 30)
    greatestHealth = Math.max(
      greatestHealth,
      ...run.items.filter(item => item.kind === 'enemy').map(item => item.maxHp)
    )
    expect(run.items.length).toBeLessThan(24)
    expect(run.shots.length).toBeLessThan(8)
    expect(run.effects.length).toBeLessThanOrEqual(12)
    expect(run.power).toBeLessThanOrEqual(MAX_POWER)
  }
  expect(run.time).toBeGreaterThan(599)
  expect(run.phase).toBe('playing')
  expect(greatestHealth).toBeGreaterThan(10000)
})

test('short taps remain taps and swipes clamp to the two lanes', () => {
  expect(swipeLane(0, 10, 300)).toBe(0)
  expect(swipeLane(1, -25, 300)).toBe(0)
  expect(swipeLane(0, 25, 300)).toBe(1)
  expect(swipeLane(1, 200, 300)).toBe(1)
  expect(swipeLane(0, -200, 300)).toBe(0)
})
