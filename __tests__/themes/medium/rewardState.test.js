import assert from 'node:assert/strict'
import {
  EMPTY_REWARD,
  readReward,
  REWARD_KEY,
  rewardAfterVictory,
  writeReward
} from '@/themes/medium/lib/rewardState'
import { createRun, stepRun } from '@/themes/medium/lib/survivors'

describe('NEW GAME! completion reward', () => {
  test('only a completed survival run grants the theme', () => {
    for (const phase of [
      'ready',
      'playing',
      'lost',
      'paused',
      'upgrade',
      'unavailable'
    ])
      assert.equal(rewardAfterVictory(phase), null)
    const run = createRun(13)
    run.phase = 'playing'
    run.time = 89.99
    stepRun(run, { x: 0, y: 0 }, 1 / 60)
    assert.deepEqual(rewardAfterVictory(run.phase), {
      unlocked: true,
      enabled: true
    })
  })
  test('completion, exit and refresh retain unlock without re-enabling an exited theme', () => {
    const data = new Map()
    const storage = {
      getItem: key => data.get(key) || null,
      setItem: (key, value) => data.set(key, value)
    }
    assert.deepEqual(readReward(storage), EMPTY_REWARD)
    writeReward(storage, rewardAfterVictory('won'))
    assert.deepEqual(readReward(storage), { unlocked: true, enabled: true })
    writeReward(storage, { unlocked: true, enabled: false })
    assert.deepEqual(readReward(storage), { unlocked: true, enabled: false })
    data.set(REWARD_KEY, '{broken')
    assert.deepEqual(readReward(storage), EMPTY_REWARD)
    data.set(REWARD_KEY, JSON.stringify({ unlocked: false, enabled: true }))
    assert.deepEqual(readReward(storage), EMPTY_REWARD)
  })
  test('blocked browser storage does not throw or unlock the theme', () => {
    const blocked = {
      getItem: () => {
        throw Error('denied')
      },
      setItem: () => {
        throw Error('denied')
      }
    }
    assert.deepEqual(readReward(blocked), EMPTY_REWARD)
    assert.doesNotThrow(() => writeReward(blocked, rewardAfterVictory('won')))
  })
})
