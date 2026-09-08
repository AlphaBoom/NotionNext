export const REWARD_KEY = 'notionnext:new-game-reward:v1'
export const EMPTY_REWARD = { unlocked: false, enabled: false }

export function readReward(storage) {
  try {
    const value = JSON.parse(storage.getItem(REWARD_KEY))
    return value?.unlocked === true
      ? { unlocked: true, enabled: value.enabled === true }
      : { ...EMPTY_REWARD }
  } catch {
    return { ...EMPTY_REWARD }
  }
}

export function writeReward(storage, value) {
  try {
    storage.setItem(REWARD_KEY, JSON.stringify(value))
  } catch {
    /* Private browsing may disallow persistence. */
  }
}

export function rewardAfterVictory(phase) {
  return phase === 'won' ? { unlocked: true, enabled: true } : null
}
