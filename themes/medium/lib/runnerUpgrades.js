// Mobile builds keep their own balance: two lanes, short decisions, six slots.
export const RUNNER_BUILD_SLOTS = 6
export const RUNNER_UPGRADES = [
  {
    id: 'power',
    name: '硬刺',
    mark: '✦',
    detail: '飞刺伤害 +25%',
    max: 4,
    unlock: 1
  },
  {
    id: 'haste',
    name: '急性子',
    mark: '»',
    detail: '射击间隔缩短 15%',
    max: 4,
    unlock: 1
  },
  {
    id: 'pierce',
    name: '一线穿心',
    mark: '↗',
    detail: '飞刺多穿透 1 个敌人',
    max: 3,
    unlock: 1
  },
  {
    id: 'heart',
    name: '热可可',
    mark: '♡',
    detail: '生命上限 +1，恢复 2 点生命',
    max: 3,
    unlock: 1
  },
  {
    id: 'focus',
    name: '会心一刺',
    mark: '✧',
    detail: '暴击率 +12%，造成双倍伤害',
    max: 4,
    unlock: 3
  },
  {
    id: 'guard',
    name: '叶片护盾',
    mark: '⬡',
    detail: '抵挡一次伤害；24 / 19 / 14 秒恢复',
    max: 3,
    unlock: 3
  },
  {
    id: 'twin',
    name: '隔道援护',
    mark: '⇈',
    detail: '另一跑道同步射击，伤害为主弹的 30% / 50% / 70%',
    max: 3,
    unlock: 3
  },
  {
    id: 'frost',
    name: '霜刺',
    mark: '❄',
    detail: '命中减速 2 秒，每级减速 +15%',
    max: 3,
    unlock: 5
  },
  {
    id: 'blast',
    name: '松果爆破',
    mark: '◉',
    detail: '命中溅射附近两道敌人，每级造成 25% 伤害',
    max: 3,
    unlock: 5
  },
  {
    id: 'scholar',
    name: '夜行笔记',
    mark: '▤',
    detail: '击退和过门经验 +20%',
    max: 3,
    unlock: 5
  },
  {
    id: 'execute',
    name: '乘胜追击',
    mark: '⌁',
    detail: '对半血以下敌人伤害 +30%',
    max: 3,
    unlock: 8
  },
  {
    id: 'leech',
    name: '野餐时间',
    mark: '♨',
    detail: '每击退 24 / 18 / 12 个敌人恢复 1 点生命',
    max: 3,
    unlock: 8
  },
  {
    id: 'barrage',
    name: '进化 · 流星刺雨',
    mark: '✺',
    detail: '飞刺伤害 +50%，额外穿透 2 个敌人',
    max: 1,
    unlock: 10,
    requires: { haste: 3, pierce: 2 },
    evolution: true
  },
  {
    id: 'blizzard',
    name: '进化 · 冰花绽放',
    mark: '❉',
    detail: '爆破范围扩大，溅射冻结普通敌人 0.6 秒',
    max: 1,
    unlock: 10,
    requires: { frost: 2, blast: 2 },
    evolution: true
  },
  {
    id: 'crossfire',
    name: '进化 · 双生星芒',
    mark: '↯',
    detail: '援护弹获得完整伤害，暴击伤害提升至 3 倍',
    max: 1,
    unlock: 10,
    requires: { twin: 2, focus: 2 },
    evolution: true
  },
  {
    id: 'vigor',
    name: '百炼之刺',
    mark: '✦',
    detail: '飞刺伤害 +5%，不占槽位，可重复',
    max: Infinity,
    unlock: 12,
    supply: true
  },
  {
    id: 'ration',
    name: '补给时刻',
    mark: '♡',
    detail: '恢复 2 点生命，不占槽位',
    max: Infinity,
    unlock: 1,
    supply: true
  }
]
export const RUNNER_EVOLUTIONS = RUNNER_UPGRADES.filter(u => u.evolution)
export const runnerSlots = run =>
  RUNNER_UPGRADES.filter(u => !u.evolution && !u.supply && run.upgrades[u.id])
    .length
export const runnerChoiceLevel = run =>
  run.level - Math.max(0, run.pendingUpgrades - 1)

export function runnerUpgradeAvailable(run, upgrade) {
  return (
    run.mode === 'endless' &&
    runnerChoiceLevel(run) >= upgrade.unlock &&
    (run.upgrades[upgrade.id] || 0) < upgrade.max &&
    (run.upgrades[upgrade.id] ||
      upgrade.evolution ||
      upgrade.supply ||
      runnerSlots(run) < RUNNER_BUILD_SLOTS) &&
    (!upgrade.requires ||
      Object.entries(upgrade.requires).every(
        ([id, rank]) => (run.upgrades[id] || 0) >= rank
      )) &&
    !(upgrade.id === 'ration' && run.hp >= run.maxHp)
  )
}

// Selection has its own RNG: a critical hit cannot change the next three cards.
function randomChoice(run) {
  run.choiceSeed = (Math.imul(run.choiceSeed, 1664525) + 1013904223) >>> 0
  return run.choiceSeed / 4294967296
}
export function rollRunnerChoices(run, exclude = []) {
  const available = RUNNER_UPGRADES.filter(u => runnerUpgradeAvailable(run, u))
  const pool = available.filter(u => !exclude.includes(u.id))
  const result = []
  const take = candidates => {
    if (!candidates.length || result.length >= 3) return
    const picked = candidates[Math.floor(randomChoice(run) * candidates.length)]
    result.push(picked)
    pool.splice(pool.indexOf(picked), 1)
  }
  // Make earned evolutions visible, and let invested builds keep progressing.
  take(pool.filter(u => u.evolution))
  take(pool.filter(u => run.upgrades[u.id] && !u.supply))
  while (pool.length && result.length < 3) take(pool)
  for (const upgrade of available) {
    if (result.length >= 3) break
    if (!result.includes(upgrade)) result.push(upgrade)
  }
  // A fully capped build always has a useful, repeatable damage reward.
  if (!result.length) result.push(RUNNER_UPGRADES.find(u => u.id === 'vigor'))
  run.choices = result
}
export function canRerollRunner(run) {
  return (
    run.phase === 'upgrade' &&
    run.rerolls > 0 &&
    RUNNER_UPGRADES.some(
      u =>
        runnerUpgradeAvailable(run, u) &&
        !run.choices.some(choice => choice.id === u.id)
    )
  )
}
export function rerollRunner(run) {
  if (!canRerollRunner(run)) return false
  const excluded = run.choices.map(u => u.id)
  run.rerolls--
  rollRunnerChoices(run, excluded)
  return true
}
export function chooseRunnerUpgrade(run, id) {
  if (run.phase !== 'upgrade' || !run.choices.some(u => u.id === id))
    return false
  run.upgrades[id] = (run.upgrades[id] || 0) + 1
  if (id === 'heart') {
    run.maxHp++
    run.hp = Math.min(run.maxHp, run.hp + 2)
  }
  if (id === 'ration') run.hp = Math.min(run.maxHp, run.hp + 2)
  if (id === 'guard') {
    run.shield = true
    run.shieldClock = 0
  }
  run.pendingUpgrades = Math.max(0, run.pendingUpgrades - 1)
  if (run.pendingUpgrades) rollRunnerChoices(run)
  else {
    run.choices = []
    run.phase = 'playing'
  }
  return true
}
