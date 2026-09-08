import assert from 'node:assert/strict'
import { handleMovementKey } from '@/themes/medium/lib/survivorsInput'

function key(code, repeat = false) {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat }
  })
  return event
}

describe('embedded survival game keyboard ownership', () => {
  test('arrows cannot scroll the blog when play transitions into upgrades or pause', () => {
    const moved = [],
      selected = []
    const actions = {
      move: code => moved.push(code),
      select: step => selected.push(step)
    }
    for (const phase of [
      'ready',
      'playing',
      'upgrade',
      'paused',
      'won',
      'lost'
    ]) {
      for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
        const event = key(code)
        assert.equal(handleMovementKey(event, phase, actions), true)
        assert.equal(event.defaultPrevented, true, `${phase}: ${code}`)
      }
    }
    assert.deepEqual(moved, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
    assert.deepEqual(selected, [-1, 1, -1, 1])
  })
  test('a held movement key is consumed during upgrades without cycling rewards, and Enter remains native', () => {
    const steps = []
    const actions = {
      move: () => assert.fail('must not move while choosing'),
      select: step => steps.push(step)
    }
    const held = key('ArrowRight', true)
    handleMovementKey(held, 'upgrade', actions)
    assert.equal(held.defaultPrevented, true)
    assert.deepEqual(steps, [])
    handleMovementKey(key('KeyD'), 'upgrade', actions)
    assert.deepEqual(steps, [1])
    const enter = key('Enter')
    assert.equal(handleMovementKey(enter, 'upgrade', actions), false)
    assert.equal(enter.defaultPrevented, false)
  })
})
