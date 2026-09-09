import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SecretSurvivors from '@/themes/medium/components/SecretSurvivors'
import { beginLeaderboardRun } from '@/themes/medium/lib/survivorsLeaderboard'
import { stepRun } from '@/themes/medium/lib/survivors'

jest.mock('@/themes/medium/lib/survivorsLeaderboard', () => ({
  LEADERBOARD_ENABLED: true,
  beginLeaderboardRun: jest.fn()
}))
jest.mock(
  '@/themes/medium/components/SurvivorsLeaderboard',
  () =>
    ({ entry, finished }) => (
      <div>
        <input aria-label='昵称' />
        <output>{finished ? JSON.stringify(entry?.result) : '排行榜'}</output>
      </div>
    )
)
jest.mock('@/themes/medium/lib/survivors', () => ({
  ...jest.requireActual('@/themes/medium/lib/survivors'),
  stepRun: jest.fn()
}))
jest.mock('@/themes/medium/lib/survivorsCanvas', () => ({
  createRenderer: () => ({ draw() {}, resize() {} }),
  HEDGEHOG: [],
  HEDGEHOG_COLORS: {}
}))
let frame
const oldResize = global.ResizeObserver
const oldIntersection = global.IntersectionObserver
beforeEach(() => {
  global.ResizeObserver = global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  }
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frame = callback
    return 1
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  beginLeaderboardRun
    .mockReset()
    .mockImplementation(() => ({ ticket: Promise.resolve({}), result: null }))
  stepRun.mockImplementation(run =>
    Object.assign(run, {
      phase: 'lost',
      time: 90.125,
      kills: 30,
      bosses: 1,
      level: 5
    })
  )
})
afterEach(() => {
  global.ResizeObserver = oldResize
  global.IntersectionObserver = oldIntersection
  jest.restoreAllMocks()
})

test('new endless run registers once; pause/resume keeps ticket; death freezes result; restart registers anew', () => {
  render(<SecretSurvivors unlocked onClose={() => {}} />)
  expect(beginLeaderboardRun).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /出发/ }))
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '暂停游戏' }))
  const nickname = screen.getByRole('textbox', { name: '昵称' })
  expect(fireEvent.keyDown(nickname, { key: 'p', code: 'KeyP' })).toBe(true)
  expect(screen.getByRole('button', { name: /继续夜行/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /继续夜行/ }))
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(1)
  act(() => frame(1000))
  expect(
    screen.getByText(
      JSON.stringify({ durationMs: 90125, kills: 30, bosses: 1, level: 5 })
    )
  ).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /再出发一次/ }))
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(2)
})

test('intro games never register for the endless board', () => {
  render(<SecretSurvivors onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /出发/ }))
  expect(beginLeaderboardRun).not.toHaveBeenCalled()
})
