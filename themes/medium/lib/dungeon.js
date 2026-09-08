export const SIZE = 9
export const LAST_FLOOR = 3
export const UPGRADES = [
  { id: 'blade', name: '磨砺', description: '攻击 +1。更快击败守卫。' },
  { id: 'heart', name: '生息', description: '生命上限 +3，并恢复 3 点。' },
  { id: 'guard', name: '护符', description: '每层抵挡前 2 点伤害，可叠加。' }
]
const directions = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0]
]
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const same = (a, b) => a.x === b.x && a.y === b.y

function reachable(tiles, start) {
  const queue = [start]
  const visited = new Set([`${start.x},${start.y}`])
  for (let i = 0; i < queue.length; i++) {
    for (const [dx, dy] of directions) {
      const x = queue[i].x + dx,
        y = queue[i].y + dy
      const key = `${x},${y}`
      if (tiles[y]?.[x] === '.' && !visited.has(key)) {
        visited.add(key)
        queue.push({ x, y })
      }
    }
  }
  return queue
}

function floorState(run, random) {
  const tiles = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) =>
      x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? '#' : '.'
    )
  )
  const player = { ...run.player, x: 1, y: 1, shield: run.player.armor }
  const exit = { x: 7, y: 7 }
  // Reject walls that disconnect any floor tile, including supplies and the exit.
  for (let i = 0; i < 12; i++) {
    const x = 1 + Math.floor(random() * 7),
      y = 1 + Math.floor(random() * 7)
    if (x + y < 5 || (x === exit.x && y === exit.y) || tiles[y][x] === '#')
      continue
    tiles[y][x] = '#'
    const count = tiles.flat().filter(tile => tile === '.').length
    if (reachable(tiles, player).length !== count) tiles[y][x] = '.'
  }
  const available = reachable(tiles, player).filter(
    p => distance(p, player) > 3 && !same(p, exit)
  )
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[available[i], available[j]] = [available[j], available[i]]
  }
  const enemies = Array.from({ length: 2 + run.floor }, (_, id) => ({
    ...available.pop(),
    id,
    hp: run.floor === LAST_FLOOR && id === 0 ? 5 : 2,
    kind: run.floor === LAST_FLOOR && id === 0 ? 'warden' : 'slime'
  }))
  const supplies = Array.from({ length: 2 }, () => ({
    ...available.pop(),
    kind: 'potion'
  }))
  return {
    ...run,
    tiles,
    player,
    exit,
    enemies,
    supplies,
    phase: 'playing',
    message: `第 ${run.floor} 层 · 击败守卫，寻找出口。`
  }
}

export function createRun(random = Math.random) {
  return floorState(
    {
      floor: 1,
      turns: 0,
      kills: 0,
      player: { hp: 8, maxHp: 8, attack: 1, armor: 0 }
    },
    random
  )
}

function nextEnemyStep(state, enemy) {
  const queue = [{ x: enemy.x, y: enemy.y, first: null }]
  const visited = new Set([`${enemy.x},${enemy.y}`])
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i]
    for (const [dx, dy] of directions) {
      const next = { x: point.x + dx, y: point.y + dy }
      if (same(next, state.player)) return point.first || next
      const key = `${next.x},${next.y}`
      if (
        state.tiles[next.y]?.[next.x] !== '.' ||
        visited.has(key) ||
        state.enemies.some(e => e.id !== enemy.id && same(e, next))
      )
        continue
      visited.add(key)
      queue.push({ ...next, first: point.first || next })
    }
  }
  return enemy
}

export function move(state, dx, dy) {
  if (state.phase !== 'playing' || Math.abs(dx) + Math.abs(dy) > 1) return state
  const target = { x: state.player.x + dx, y: state.player.y + dy }
  if (state.tiles[target.y]?.[target.x] !== '.') return state
  const next = {
    ...state,
    player: { ...state.player },
    enemies: state.enemies.map(e => ({ ...e })),
    supplies: [...state.supplies],
    turns: state.turns + 1
  }
  const struck = next.enemies.find(e => same(e, target))
  if (struck) {
    struck.hp -= next.player.attack
    next.message = `命中${struck.kind === 'warden' ? '看守者' : '守卫'} · ${next.player.attack} 点伤害。`
    if (struck.hp <= 0) {
      next.enemies = next.enemies.filter(e => e.id !== struck.id)
      next.kills++
      next.message = next.enemies.length ? '守卫消散了。' : '出口已开启。'
    }
  } else {
    Object.assign(next.player, target)
    next.message = dx || dy ? '脚步声在纸间回响。' : '你屏息等待了一回合。'
    const potion = next.supplies.find(p => same(p, target))
    if (potion && next.player.hp < next.player.maxHp) {
      next.player.hp = Math.min(next.player.maxHp, next.player.hp + 3)
      next.supplies = next.supplies.filter(p => p !== potion)
      next.message = '拾起药水 · 恢复 3 点生命。'
    }
    if (same(target, next.exit) && next.enemies.length === 0) {
      next.phase = next.floor === LAST_FLOOR ? 'won' : 'upgrade'
      next.message =
        next.phase === 'won'
          ? '你找到了藏在书页深处的光。'
          : '向更深处出发前，带走一份馈赠。'
      return next
    }
  }
  for (const enemy of next.enemies) {
    // A hit staggers its target for this turn; other enemies still act.
    if (enemy.id === struck?.id) continue
    if (distance(enemy, next.player) === 1) {
      if (next.player.shield > 0) next.player.shield--
      else next.player.hp--
      next.message = '侧翼受到攻击。留意相邻的守卫。'
    } else if (distance(enemy, next.player) <= 5 && next.turns % 2 === 0) {
      Object.assign(enemy, nextEnemyStep(next, enemy))
    }
    if (next.player.hp <= 0) {
      next.player.hp = 0
      next.phase = 'lost'
      next.message = '这一页，暂时写到了这里。'
      break
    }
  }
  return next
}

export function upgrade(state, id, random = Math.random) {
  if (state.phase !== 'upgrade' || !UPGRADES.some(item => item.id === id))
    return state
  const player = { ...state.player }
  if (id === 'blade') player.attack++
  if (id === 'heart') {
    player.maxHp += 3
    player.hp = Math.min(player.maxHp, player.hp + 3)
  }
  if (id === 'guard') player.armor += 2
  player.hp = Math.min(player.maxHp, player.hp + 2)
  return floorState({ ...state, floor: state.floor + 1, player }, random)
}
