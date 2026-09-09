// The first six remain the introductory run's familiar equipment.
export const UPGRADES = [
  {
    id: 'quills',
    name: '蓬松炸毛',
    detail: '每轮飞刺 +1',
    mark: '↗',
    max: 5,
    unlock: 1
  },
  {
    id: 'haste',
    name: '急性子',
    detail: '攻击间隔缩短 18%',
    mark: '»',
    max: 6,
    unlock: 1
  },
  {
    id: 'power',
    name: '硬刺',
    detail: '伤害 +1，穿透 +1（最多 4）',
    mark: '✦',
    max: 8,
    unlock: 1
  },
  {
    id: 'orbit',
    name: '松果卫星',
    detail: '环绕松果 +1，自动击退近敌',
    mark: '◎',
    max: 4,
    unlock: 1
  },
  {
    id: 'magnet',
    name: '口袋宇宙',
    detail: '拾取范围 +45，移速 +10%（上限 240）',
    mark: '◇',
    max: 6,
    unlock: 1
  },
  {
    id: 'heart',
    name: '热可可',
    detail: '生命上限 +1，恢复 3 点生命',
    mark: '♡',
    max: 8,
    unlock: 1
  },
  {
    id: 'focus',
    name: '会心一刺',
    detail: '暴击率 +10%，暴击造成双倍伤害',
    mark: '✧',
    max: 5,
    unlock: 3
  },
  {
    id: 'reach',
    name: '破风',
    detail: '飞刺速度 +20%，命中宽度 +1',
    mark: '➶',
    max: 3,
    unlock: 3
  },
  {
    id: 'guard',
    name: '叶片护盾',
    detail: '抵挡一次伤害；每级缩短护盾恢复间隔',
    mark: '⬡',
    max: 4,
    unlock: 3
  },
  {
    id: 'regen',
    name: '暖窝',
    detail: '周期恢复 1 点生命：12 / 10 / 8 秒',
    mark: '♧',
    max: 3,
    unlock: 3
  },
  {
    id: 'frost',
    name: '霜刺',
    detail: '飞刺命中减速 2 秒，每级减速 +12%',
    mark: '❄',
    max: 4,
    unlock: 5
  },
  {
    id: 'storm',
    name: '雷鸣种子',
    detail: '每 3 秒释放连锁闪电，每级多连锁一个敌人',
    mark: 'ϟ',
    max: 4,
    unlock: 5
  },
  {
    id: 'nova',
    name: '惊蛰',
    detail: '周期震退周围敌人，升级扩大范围并加快释放',
    mark: '◉',
    max: 4,
    unlock: 5
  },
  {
    id: 'scholar',
    name: '夜行笔记',
    detail: '拾取经验 +12%（包含自动回收）',
    mark: '▤',
    max: 4,
    unlock: 5
  },
  {
    id: 'execute',
    name: '乘胜追击',
    detail: '对半血以下敌人的伤害 +25%',
    mark: '⌁',
    max: 4,
    unlock: 8
  },
  {
    id: 'leech',
    name: '野餐时间',
    detail: '每击退 35 / 28 / 21 个敌人恢复 1 点生命',
    mark: '♨',
    max: 3,
    unlock: 8
  },
  {
    id: 'resonance',
    name: '星环共鸣',
    detail: '松果伤害 +40%，轨道半径 +8',
    mark: '⊙',
    max: 3,
    unlock: 8,
    requires: { orbit: 1 }
  },
  {
    id: 'thornstorm',
    name: '进化 · 万刺齐发',
    detail: '额外发射 3 根飞刺，飞刺伤害 +50%',
    mark: '✺',
    max: 1,
    unlock: 12,
    requires: { quills: 3, haste: 3 },
    evolution: true
  },
  {
    id: 'blizzard',
    name: '进化 · 极夜冰环',
    detail: '惊蛰伤害翻倍，并冻结普通敌人 1.2 秒',
    mark: '❉',
    max: 1,
    unlock: 12,
    requires: { nova: 2, frost: 2 },
    evolution: true
  },
  {
    id: 'tempest',
    name: '进化 · 天雷',
    detail: '闪电间隔减半，连锁目标 +3',
    mark: '↯',
    max: 1,
    unlock: 12,
    requires: { storm: 2, focus: 2 },
    evolution: true
  },
  {
    id: 'vigor',
    name: '百炼之刺',
    detail: '全部攻击基础伤害 +2，可重复选择',
    mark: '✦',
    max: Infinity,
    unlock: 15
  },
  {
    id: 'ration',
    name: '补给时刻',
    detail: '恢复 4 点生命',
    mark: '♡',
    max: Infinity,
    unlock: 15
  }
]

export const EVOLUTIONS = UPGRADES.filter(u => u.evolution)
export const BUILD_SLOTS = 8

export function occupiedSlots(run) {
  return UPGRADES.filter(
    u => !u.evolution && Number.isFinite(u.max) && run.upgrades[u.id]
  ).length
}

export function upgradeAvailable(run, upgrade) {
  const { id, max, unlock, requires } = upgrade
  const p = run.player
  if (run.mode === 'intro') {
    if (unlock !== 1) return false
    return (
      !(id === 'quills' && p.quills >= 6) &&
      !(id === 'orbit' && p.orbit >= 4) &&
      !(id === 'haste' && p.rate <= 0.12) &&
      !(id === 'magnet' && p.magnet >= 350 && p.speed >= 240) &&
      !(id === 'heart' && p.maxHp >= 20 && p.hp >= p.maxHp)
    )
  }
  // Earned XP can queue several levels; unlocks follow the level being chosen.
  const choiceLevel = run.level - Math.max(0, run.pendingUpgrades - 1)
  return (
    choiceLevel >= unlock &&
    (run.upgrades[id] || 0) < max &&
    (run.upgrades[id] ||
      upgrade.evolution ||
      !Number.isFinite(max) ||
      occupiedSlots(run) < BUILD_SLOTS) &&
    (!requires ||
      Object.entries(requires).every(
        ([key, rank]) => (run.upgrades[key] || 0) >= rank
      )) &&
    !(id === 'ration' && p.hp >= p.maxHp)
  )
}

export function applyUpgrade(run, id) {
  const p = run.player
  run.upgrades[id] = (run.upgrades[id] || 0) + 1
  if (id === 'quills') p.quills++
  if (id === 'haste') p.rate = Math.max(0.12, p.rate * 0.82)
  if (id === 'power') {
    p.damage++
    p.pierce = Math.min(4, p.pierce + 1)
  }
  if (id === 'orbit') p.orbit++
  if (id === 'magnet') {
    p.magnet = Math.min(350, p.magnet + 45)
    p.speed = Math.min(240, p.speed * 1.1)
  }
  if (id === 'heart') {
    p.maxHp = Math.min(20, p.maxHp + 1)
    p.hp = Math.min(p.maxHp, p.hp + 3)
  }
  if (id === 'focus') p.crit += 0.1
  if (id === 'reach') {
    p.shotSpeed += 82
    p.shotSize++
  }
  if (id === 'guard') {
    p.shield = true
    p.shieldClock = 0
  }
  if (id === 'regen') p.regenClock = 0
  if (id === 'vigor') p.damage += 2
  if (id === 'ration') p.hp = Math.min(p.maxHp, p.hp + 4)
}
