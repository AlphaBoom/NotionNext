import assert from 'node:assert/strict'
import {
  assessPerformance,
  chooseUpgrade,
  createRun,
  LIMITS,
  offerUpgrades,
  RUN_SECONDS,
  stepRun
} from '@/themes/medium/lib/survivors'

const idle = { x: 0, y: 0 }
function enemy(id, x, y, hp = 2) {
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

describe('inline survivors simulation', () => {
  test('movement is frame-rate independent, diagonal-normalized, and frozen while paused', () => {
    const a = createRun(1),
      b = createRun(1)
    a.phase = b.phase = 'playing'
    a.spawnClock = b.spawnClock = 100
    for (let i = 0; i < 60; i++) stepRun(a, { x: 1, y: 1 }, 1 / 60)
    for (let i = 0; i < 30; i++) stepRun(b, { x: 1, y: 1 }, 1 / 30)
    assert.ok(Math.abs(Math.hypot(a.player.x, a.player.y) - 150) < 0.001)
    assert.ok(Math.abs(a.player.x - b.player.x) < 0.001)
    a.phase = 'paused'
    const before = JSON.stringify(a)
    stepRun(a, idle, 30)
    assert.equal(JSON.stringify(a), before)
  })
  test('auto attacks drop XP, pickup offers three distinct choices, invalid choices cannot resume', () => {
    const run = createRun(2)
    run.phase = 'playing'
    run.spawnClock = 100
    run.enemies = [enemy(1, 35, 0)]
    run.xp = 4
    for (let i = 0; i < 120; i++) stepRun(run, idle, 1 / 60)
    assert.equal(run.kills, 1)
    assert.equal(run.phase, 'upgrade')
    assert.equal(run.level, 2)
    assert.equal(new Set(run.choices.map(c => c.id)).size, 3)
    assert.equal(chooseUpgrade(run, 'made-up'), false)
    assert.equal(run.phase, 'upgrade')
    assert.equal(chooseUpgrade(run, run.choices[0].id), true)
    assert.equal(run.phase, 'playing')
  })
  test('contact damage has invincibility frames and death stops the simulation', () => {
    const run = createRun(4, 'endless')
    run.phase = 'playing'
    run.spawnClock = 100
    run.shotClock = 100
    run.enemies = Array.from({ length: 8 }, (_, i) => enemy(i, 0, 0, 100))
    stepRun(run, idle, 1 / 60)
    assert.equal(run.player.hp, 5)
    for (let i = 0; i < 20; i++) stepRun(run, idle, 1 / 60)
    assert.equal(run.player.hp, 5)
    run.player.hp = 1
    run.player.invincible = 0
    stepRun(run, idle, 1 / 60)
    assert.equal(run.phase, 'lost')
    const before = JSON.stringify(run)
    stepRun(run, { x: 1, y: 0 }, 1)
    assert.equal(JSON.stringify(run), before)
  })
  test('piercing cannot damage one enemy twice; orbit hits and capped drops preserve XP', () => {
    const run = createRun(8, 'endless')
    run.phase = 'playing'
    run.spawnClock = 100
    run.shotClock = 100
    run.enemies = [enemy(1, 22, 0, 10)]
    run.shots = [
      { x: 22, y: 0, vx: 0, vy: 0, life: 2, hits: [], damage: 2, pierce: 3 }
    ]
    for (let i = 0; i < 10; i++) stepRun(run, idle, 1 / 60)
    assert.equal(run.enemies[0].hp, 8)
    run.enemies = [enemy(2, 57, 0)]
    run.player.orbit = 1
    run.time = 0
    run.gems = Array.from({ length: LIMITS.gems }, () => ({
      x: 300,
      y: 300,
      value: 1
    }))
    stepRun(run, idle, 1 / 60)
    assert.equal(run.kills, 1)
    assert.equal(run.gems.length, LIMITS.gems)
    assert.equal(
      run.gems.reduce((total, gem) => total + gem.value, 0),
      LIMITS.gems + 1
    )
  })
  test('random full runs spawn from all sides, maintain bounds, and reach dawn', () => {
    const sides = new Set()
    for (let seed = 1; seed <= 12; seed++) {
      const run = createRun(seed)
      run.phase = 'playing'
      for (let frame = 0; frame < 3700; frame++) {
        const angle = frame / 110
        stepRun(
          run,
          { x: Math.cos(angle), y: Math.sin(angle) },
          1 / 60,
          800,
          400
        )
        for (const e of run.enemies) {
          if (Math.abs(e.x - run.player.x) > 400)
            sides.add(e.x > run.player.x ? 'right' : 'left')
          if (Math.abs(e.y - run.player.y) > 200)
            sides.add(e.y > run.player.y ? 'bottom' : 'top')
        }
        if (run.phase === 'upgrade') chooseUpgrade(run, run.choices[0].id)
        assert.ok(run.enemies.length <= LIMITS.enemies)
        assert.ok(run.shots.length <= LIMITS.shots)
        assert.ok(run.gems.length <= LIMITS.gems)
        assert.ok(run.sparks.length <= LIMITS.sparks)
      }
      assert.equal(run.phase, 'won')
      assert.equal(run.time, RUN_SECONDS)
      assert.equal(run.bossSpawned, true)
      assert.ok(run.kills > 0)
      assert.ok(run.level > 1)
    }
    assert.equal(sides.size, 4)
  })
  test('the first minute is forgiving even for a visitor who does not move', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const run = createRun(seed)
      run.phase = 'playing'
      for (let frame = 0; frame < 3700; frame++) {
        stepRun(run, idle, 1 / 60, 800, 400)
        if (run.phase === 'upgrade') chooseUpgrade(run, run.choices[0].id)
      }
      assert.equal(run.phase, 'won')
      assert.equal(run.time, 60)
      assert.ok(run.player.hp > 0)
    }
  })
  test('endless challenge crosses old finish lines and repeatedly scales bosses', () => {
    const run = createRun(14, 'endless')
    run.phase = 'playing'
    run.spawnClock = 100
    run.shotClock = 100
    run.time = 59.99
    stepRun(run, idle, 1 / 60)
    const firstBoss = run.enemies.find(e => e.kind === 'boss')
    assert.ok(firstBoss)
    assert.equal(run.phase, 'playing')
    run.time = 89.99
    stepRun(run, idle, 1 / 60)
    assert.equal(run.phase, 'playing')
    run.time = 119.99
    stepRun(run, idle, 1 / 60)
    const bosses = run.enemies.filter(e => e.kind === 'boss')
    assert.equal(bosses.length, 2)
    assert.ok(bosses[1].maxHp > firstBoss.maxHp)
    assert.ok(bosses[1].speed > firstBoss.speed)
    assert.equal(run.wave, 5)
    assert.equal(run.phase, 'playing')
  })
  test('endless pressure rises without unbounded entities, even over long sessions', () => {
    const counts = []
    for (const time of [1, 61, 181, 3601]) {
      const run = createRun(9, 'endless')
      run.phase = 'playing'
      run.time = time
      run.nextBoss = Infinity
      stepRun(run, idle, 1 / 60)
      counts.push(run.enemies.length)
      const initialHp = run.enemies[0].maxHp
      run.enemies = Array.from({ length: LIMITS.enemies }, (_, i) =>
        enemy(i, 250, 250, 999)
      )
      run.spawnClock = 0
      run.nextBoss = time
      stepRun(run, idle, 1 / 60)
      assert.equal(run.enemies.length, LIMITS.enemies)
      assert.equal(run.enemies.filter(e => e.kind === 'boss').length, 1)
      assert.ok(initialHp >= 2)
      assert.equal(run.phase, 'playing')
    }
    assert.ok(counts[1] > counts[0])
    assert.ok(counts[2] > counts[1])
    assert.ok(counts[3] <= 10)
  })
  test('upgrade pool respects caps and performance adapts only after sustained measured cost', () => {
    const run = createRun(10)
    run.player.orbit = 4
    run.player.quills = 6
    for (let i = 0; i < 100; i++) {
      offerUpgrades(run)
      assert.ok(run.choices.every(c => c.id !== 'orbit' && c.id !== 'quills'))
    }
    assert.equal(assessPerformance([100]).stop, false)
    assert.equal(assessPerformance(Array(120).fill(2)).quality, 'full')
    const first = assessPerformance(Array(120).fill(28))
    assert.equal(first.quality, 'low')
    assert.equal(first.stop, false)
    assert.equal(
      assessPerformance(Array(120).fill(28), first.quality, first.slowWindows)
        .stop,
      true
    )
    assert.equal(
      assessPerformance([...Array(119).fill(2), 200]).quality,
      'full'
    )
    assert.equal(assessPerformance(Array(120).fill(2), 'low', 1).slowWindows, 0)
  })
})
