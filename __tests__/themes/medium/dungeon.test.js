import assert from 'node:assert/strict'
import { createRun, move, upgrade } from '@/themes/medium/lib/dungeon'

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
function arena() {
  const run = createRun(seeded(1))
  run.tiles = Array.from({ length: 9 }, (_, y) =>
    Array.from({ length: 9 }, (_, x) =>
      x === 0 || y === 0 || x === 8 || y === 8 ? '#' : '.'
    )
  )
  run.enemies = []
  run.supplies = []
  return run
}

describe('hidden dungeon', () => {
  test('all generated floors, exits and supplies remain connected with no overlapping spawns', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const random = seeded(seed)
      let run = createRun(random)
      for (let floor = 1; floor <= 3; floor++) {
        const visited = new Set(['1,1']),
          queue = [{ x: 1, y: 1 }]
        for (let i = 0; i < queue.length; i++) {
          for (const [dx, dy] of [
            [0, 1],
            [1, 0],
            [-1, 0],
            [0, -1]
          ]) {
            const x = queue[i].x + dx,
              y = queue[i].y + dy,
              key = `${x},${y}`
            if (run.tiles[y]?.[x] === '.' && !visited.has(key)) {
              visited.add(key)
              queue.push({ x, y })
            }
          }
        }
        assert.equal(
          visited.size,
          run.tiles.flat().filter(t => t === '.').length
        )
        const objects = [run.player, run.exit, ...run.supplies, ...run.enemies]
        assert.equal(
          new Set(objects.map(p => `${p.x},${p.y}`)).size,
          objects.length
        )
        objects.forEach(p => assert(visited.has(`${p.x},${p.y}`)))
        run = upgrade({ ...run, phase: 'upgrade' }, 'blade', random)
      }
    }
  })
  test('walls and invalid moves do not consume a turn or mutate the run', () => {
    const run = arena()
    assert.equal(move(run, -1, 0), run)
    assert.equal(move(run, 1, 1), run)
    const before = JSON.stringify(run)
    move(run, 1, 0)
    assert.equal(JSON.stringify(run), before)
  })
  test('an attacked enemy staggers while a flanking enemy can hit the player', () => {
    const run = arena()
    run.enemies = [
      { id: 0, x: 2, y: 1, hp: 2, kind: 'slime' },
      { id: 1, x: 1, y: 2, hp: 2, kind: 'slime' }
    ]
    const next = move(run, 1, 0)
    assert.equal(next.enemies[0].hp, 1)
    assert.equal(next.player.hp, 7)
    assert.equal(next.player.x, 1)
    assert.equal(move(next, 1, 0).kills, 1)
  })
  test('waiting advances enemies, shields absorb damage, and defeat ends input', () => {
    const run = arena()
    run.player.hp = 1
    run.player.shield = 1
    run.enemies = [{ id: 0, x: 2, y: 1, hp: 2, kind: 'slime' }]
    const blocked = move(run, 0, 0)
    assert.equal(blocked.player.hp, 1)
    assert.equal(blocked.player.shield, 0)
    const lost = move(blocked, 0, 0)
    assert.equal(lost.phase, 'lost')
    assert.equal(move(lost, 0, 0), lost)
  })
  test('potions stay at full health and heal without exceeding the maximum', () => {
    const run = arena()
    run.supplies = [{ x: 2, y: 1, kind: 'potion' }]
    assert.equal(move(run, 1, 0).supplies.length, 1)
    run.player.hp = 7
    const next = move(run, 1, 0)
    assert.equal(next.player.hp, 8)
    assert.equal(next.supplies.length, 0)
  })
  test('exits require a cleared floor, upgrades persist, and the last exit wins', () => {
    const run = arena()
    run.player.x = 6
    run.player.y = 7
    run.enemies = [{ id: 0, x: 1, y: 1, hp: 2, kind: 'slime' }]
    assert.equal(move(run, 1, 0).phase, 'playing')
    run.enemies = []
    const choosing = move(run, 1, 0)
    assert.equal(choosing.phase, 'upgrade')
    assert.equal(move(choosing, 0, 0), choosing)
    const next = upgrade(choosing, 'guard', seeded(2))
    assert.equal(next.floor, 2)
    assert.equal(next.player.armor, 2)
    assert.equal(next.player.shield, 2)
    assert.equal(upgrade(choosing, 'invalid'), choosing)
    assert.equal(upgrade(choosing, 'blade', seeded(2)).player.attack, 2)
    assert.equal(upgrade(choosing, 'heart', seeded(2)).player.maxHp, 11)
    run.floor = 3
    assert.equal(move(run, 1, 0).phase, 'won')
    assert.equal(createRun(seeded(1)).kills, 0)
  })
})
