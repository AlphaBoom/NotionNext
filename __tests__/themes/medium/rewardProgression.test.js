import React, { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import RewardProvider, {
  useReward
} from '@/themes/medium/components/RewardProvider'
import { prepareArtwork } from '@/themes/medium/components/NewGameTheme'
import { REWARD_KEY, readReward } from '@/themes/medium/lib/rewardState'
import { useVictoryReveal } from '@/themes/medium/lib/useVictoryReveal'

jest.mock('@/themes/medium/components/NewGameTheme', () => ({
  __esModule: true,
  default: () => null,
  NewGameHero: () => null,
  prepareArtwork: jest.fn(() => Promise.resolve())
}))

const wrapper = ({ children }) => <RewardProvider>{children}</RewardProvider>
const flush = () => act(async () => {})
const advance = ms =>
  act(async () => {
    jest.advanceTimersByTime(ms)
  })
function setup(customWrapper = wrapper) {
  const closed = jest.fn()
  const hook = renderHook(
    ({ phase }) => {
      const context = useReward()
      return {
        ...context,
        reveal: useVictoryReveal(phase, context.claimReward, closed)
      }
    },
    { initialProps: { phase: 'playing' }, wrapper: customWrapper }
  )
  return { ...hook, closed }
}

beforeEach(() => {
  jest.useFakeTimers()
  localStorage.clear()
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false
  })
  prepareArtwork.mockImplementation(() => Promise.resolve())
})
afterEach(() => {
  jest.useRealTimers()
})

test('first victory saves the unlock, shows 3 / 2 / 1, then opens the theme once', async () => {
  const game = setup()
  await flush()
  expect(prepareArtwork).not.toHaveBeenCalled()
  game.rerender({ phase: 'won' })
  await flush()
  expect(readReward(localStorage)).toEqual({ unlocked: true, enabled: false })
  expect(game.result.current.reveal.seconds).toBe(3)
  await advance(1000)
  expect(game.result.current.reveal.seconds).toBe(2)
  await advance(1000)
  expect(game.result.current.reveal.seconds).toBe(1)
  await advance(900)
  expect(game.result.current.active).toBe(false)
  await advance(100)
  expect(game.result.current.active).toBe(true)
  expect(game.closed).toHaveBeenCalledTimes(1)
  await advance(5000)
  expect(game.closed).toHaveBeenCalledTimes(1)
})

test.each([false, true])(
  'an existing unlock never reopens the theme (enabled=%s)',
  async enabled => {
    localStorage.setItem(
      REWARD_KEY,
      JSON.stringify({ unlocked: true, enabled })
    )
    const game = setup()
    await flush()
    game.rerender({ phase: 'won' })
    await advance(10000)
    expect(game.result.current.reveal.stage).toBe('saved')
    expect(game.result.current.active).toBe(enabled)
    expect(game.closed).not.toHaveBeenCalled()
  }
)

test('leaving the victory screen cancels the countdown but keeps the unlock', async () => {
  const game = setup()
  game.rerender({ phase: 'won' })
  await advance(1000)
  game.rerender({ phase: 'playing' })
  await advance(4000)
  expect(readReward(localStorage)).toEqual({ unlocked: true, enabled: false })
  expect(game.closed).not.toHaveBeenCalled()
  game.rerender({ phase: 'won' })
  await advance(4000)
  expect(game.result.current.active).toBe(false)
})

test('leaving during a slow asset load also cancels theme activation', async () => {
  const game = setup()
  game.rerender({ phase: 'won' })
  await flush()
  let resolveArtwork
  prepareArtwork.mockImplementation(
    () =>
      new Promise(resolve => {
        resolveArtwork = resolve
      })
  )
  await advance(3000)
  expect(game.result.current.reveal.stage).toBe('loading')
  game.rerender({ phase: 'playing' })
  await act(async () => {
    resolveArtwork()
  })
  expect(game.result.current.active).toBe(false)
  expect(readReward(localStorage)).toEqual({ unlocked: true, enabled: false })
  expect(game.closed).not.toHaveBeenCalled()
})

test('the countdown pauses while the tab is hidden', async () => {
  const game = setup()
  game.rerender({ phase: 'won' })
  await advance(1000)
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  await advance(5000)
  expect(game.result.current.reveal.seconds).toBe(2)
  expect(game.result.current.active).toBe(false)
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false
  })
  await advance(100)
  await advance(2000)
  expect(game.closed).toHaveBeenCalledTimes(1)
})

test('Strict Mode cannot consume the claim twice or skip the celebration', async () => {
  const game = setup(({ children }) => (
    <StrictMode>
      <RewardProvider>{children}</RewardProvider>
    </StrictMode>
  ))
  game.rerender({ phase: 'won' })
  await advance(2000)
  expect(game.result.current.reveal.seconds).toBe(1)
  expect(game.result.current.active).toBe(false)
  await advance(1000)
  expect(game.closed).toHaveBeenCalledTimes(1)
})

test('a failed optional load can be retried without another game', async () => {
  const game = setup()
  game.rerender({ phase: 'won' })
  await flush()
  prepareArtwork.mockRejectedValueOnce(Error('temporary'))
  await advance(3000)
  expect(game.result.current.reveal.stage).toBe('error')
  expect(readReward(localStorage).unlocked).toBe(true)
  await act(async () => {
    await game.result.current.reveal.retry()
  })
  expect(game.result.current.active).toBe(true)
  expect(game.closed).toHaveBeenCalledTimes(1)
})
