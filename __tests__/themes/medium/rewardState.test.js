import assert from 'node:assert/strict'
import { installRewardConsole } from '@/themes/medium/lib/rewardConsole'
import {
  EMPTY_REWARD,
  readReward,
  REWARD_KEY,
  rewardAfterVictory,
  writeReward
} from '@/themes/medium/lib/rewardState'
import { createRun, RUN_SECONDS, stepRun } from '@/themes/medium/lib/survivors'

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
    run.time = RUN_SECONDS - 0.01
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
  test('later victories cannot reopen the reward, including after exiting the theme', () => {
    for (const enabled of [true, false])
      assert.equal(rewardAfterVictory('won', { unlocked: true, enabled }), null)
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

describe('reward console shortcut', () => {
  test('all command names use the shared unlock callback and restore globals on cleanup', async () => {
    const original = () => 'existing'
    const target = { NewGame: original }
    let wins = 0
    const remove = installRewardConsole(target, async () => {
      wins++
      return true
    })
    assert.equal(wins, 0)
    for (const name of ['NewGame', 'New Game！', 'New Game!'])
      assert.match(await target[name](), /主题已开启/)
    assert.equal(wins, 3)
    remove()
    assert.equal(target.NewGame, original)
    assert.equal('New Game！' in target, false)
    assert.equal('New Game!' in target, false)
  })
  test('protected or subsequently replaced global properties are preserved', () => {
    const target = {}
    Object.defineProperty(target, 'NewGame', {
      value: 'protected',
      configurable: false
    })
    const remove = installRewardConsole(target, async () => true)
    Object.defineProperty(target, 'New Game!', {
      value: 'replacement',
      configurable: true
    })
    remove()
    assert.equal(target.NewGame, 'protected')
    assert.equal(target['New Game!'], 'replacement')
  })
})
