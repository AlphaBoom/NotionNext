import {
  createWalk,
  moveWalk,
  PLAYER_LINE,
  stepWalk,
  swipeLane
} from '@/themes/medium/lib/hedgehogWalk'

const playing = (mode = 'intro', seed = 4) => ({
  ...createWalk(mode, seed),
  phase: 'playing'
})

test('a safe route can complete the first minute for multiple obstacle sequences', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const run = playing('intro', seed)
    let steps = 0
    while (run.phase === 'playing' && steps++ < 2000) {
      const next = run.items
        .filter(item => item.y < PLAYER_LINE)
        .sort((a, b) => b.y - a.y)[0]
      if (next) {
        const row = run.items.filter(
          item => item.speed === next.speed && Math.abs(item.y - next.y) < 0.001
        )
        const safe = row.find(item => item.kind === 'cone')
        if (safe) moveWalk(run, safe.lane)
      }
      stepWalk(run, 1 / 30)
      expect(run.items.length).toBeLessThan(20)
    }
    expect(run.phase).toBe('won')
    expect(run.time).toBe(60)
    expect(run.hp).toBe(3)
    expect(run.cones).toBeGreaterThan(20)
  }
})

test('collisions are counted once, respect invulnerability and can end a run', () => {
  const run = playing()
  run.nextWave = 100
  const rock = id => ({
    id,
    kind: 'rock',
    lane: 1,
    y: PLAYER_LINE - 0.01,
    speed: 1
  })
  run.items = [rock(1), rock(2)]
  stepWalk(run, 0.02)
  expect(run.hp).toBe(2)
  stepWalk(run, 0.02)
  expect(run.hp).toBe(2)
  run.hp = 1
  run.invincible = 0
  run.items = [rock(3)]
  stepWalk(run, 0.02)
  expect(run.phase).toBe('lost')
})

test('pinecones heal at six without exceeding max health', () => {
  const run = playing()
  run.hp = 2
  run.cones = 5
  run.items = [
    { id: 1, lane: 1, kind: 'cone', y: PLAYER_LINE - 0.01, speed: 1 }
  ]
  stepWalk(run, 0.02)
  expect(run.hp).toBe(3)
  expect(run.cones).toBe(6)
  expect(run.items).toHaveLength(0)
})

test('paused runs do not move or advance the reward timer; endless runs do not unlock again', () => {
  const run = playing('endless')
  run.phase = 'paused'
  const before = JSON.stringify(run)
  stepWalk(run, 20)
  moveWalk(run, 0)
  expect(JSON.stringify(run)).toBe(before)
  run.phase = 'playing'
  run.time = 59.98
  run.nextWave = 100
  stepWalk(run, 0.05)
  expect(run.phase).toBe('playing')
  expect(run.time).toBeGreaterThan(60)
})

test('short taps do not become swipes, and swipes clamp at the outer lanes', () => {
  expect(swipeLane(1, 10, 300)).toBe(1)
  expect(swipeLane(1, -25, 300)).toBe(0)
  expect(swipeLane(0, 210, 300)).toBe(2)
  expect(swipeLane(2, 200, 300)).toBe(2)
  expect(swipeLane(0, -200, 300)).toBe(0)
})
