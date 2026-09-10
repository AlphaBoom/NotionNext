import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SecretSurvivors from '@/themes/medium/components/SecretSurvivors'
import {
  beginLeaderboardRun,
  submitLeaderboardRun
} from '@/themes/medium/lib/survivorsLeaderboard'
import { stepRun } from '@/themes/medium/lib/survivors'

jest.mock('@/themes/medium/lib/survivorsLeaderboard', () => ({
  ...jest.requireActual('@/themes/medium/lib/survivorsLeaderboard'),
  LEADERBOARD_ENABLED: true,
  beginLeaderboardRun: jest.fn(),
  loadLeaderboard: jest.fn(async () => ({ entries: [] })),
  savedNickname: () => '',
  formatSurvivalTime: value => String(value),
  submitLeaderboardRun: jest.fn(async () => ({
    personalBest: true,
    best: { id: 'qa' },
    entries: []
  }))
}))
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
// jsdom does not implement the native dialog lifecycle.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
afterAll(() => {
  delete HTMLDialogElement.prototype.showModal
  delete HTMLDialogElement.prototype.close
})
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

test('new endless run registers once; pause/resume keeps ticket; death freezes result; restart registers anew', async () => {
  render(<SecretSurvivors unlocked onClose={() => {}} />)
  expect(beginLeaderboardRun).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /出发/ }))
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: /^排行榜/ }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  await screen.findByText(/第一段夜行/)
  fireEvent.click(screen.getByRole('button', { name: '关闭排行榜' }))
  expect(screen.getByRole('button', { name: /继续夜行/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /继续夜行/ }))
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(1)
  act(() => frame(1000))
  expect(await screen.findByText('#01')).toBeTruthy()
  expect(submitLeaderboardRun).not.toHaveBeenCalled()
  const nickname = screen.getByRole('textbox', {
    name: '排行榜昵称'
  })
  expect(
    screen.getByRole('heading', { name: '这一夜，你走了这么远。' })
  ).toHaveFocus()
  expect(fireEvent.keyDown(nickname, { key: 'p', code: 'KeyP' })).toBe(true)
  fireEvent.change(nickname, { target: { value: '刺猬' } })
  fireEvent.click(screen.getByRole('button', { name: /上传成绩/ }))
  expect(await screen.findByRole('button', { name: /已上传/ })).toBeDisabled()
  expect(submitLeaderboardRun).toHaveBeenCalledWith(
    expect.objectContaining({
      result: { durationMs: 90125, kills: 30, bosses: 1, level: 5 }
    }),
    '刺猬'
  )
  fireEvent.click(screen.getByRole('button', { name: /查看完整榜单/ }))
  fireEvent.click(screen.getByRole('button', { name: '关闭排行榜' }))
  fireEvent.click(screen.getByRole('button', { name: '再来一局' }))
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(2)
})

test('intro games never register for the endless board', async () => {
  render(<SecretSurvivors onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /^排行榜/ }))
  expect(screen.getByRole('dialog')).toHaveTextContent('通关首次一分钟关卡后')
  await screen.findByText(/第一段夜行/)
  expect(screen.queryByRole('textbox')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '关闭排行榜' }))
  fireEvent.click(screen.getByRole('button', { name: /出发/ }))
  expect(beginLeaderboardRun).not.toHaveBeenCalled()
})

test('the leaderboard consumes game shortcuts and Escape closes only the dialog', async () => {
  const onClose = jest.fn()
  const { container } = render(<SecretSurvivors unlocked onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: /出发/ }))
  fireEvent.click(screen.getByRole('button', { name: /^排行榜/ }))
  const dialog = screen.getByRole('dialog')
  await screen.findByText(/第一段夜行/)
  fireEvent.keyDown(dialog, { key: 'p', code: 'KeyP' })
  expect(container.querySelector('.medium-survivors')).toHaveAttribute(
    'data-phase',
    'paused'
  )
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onClose).not.toHaveBeenCalled()
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('restarting while hidden creates the new ticket only when that run resumes', async () => {
  const { container } = render(<SecretSurvivors unlocked onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /出发/ }))
  act(() => frame(1000))
  await screen.findByText('#01')
  const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: '不上传，再来一局' }))
  expect(container.querySelector('.medium-survivors')).toHaveAttribute(
    'data-phase',
    'paused'
  )
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(1)
  hidden.mockReturnValue(false)
  fireEvent.click(screen.getByRole('button', { name: /继续夜行/ }))
  expect(beginLeaderboardRun).toHaveBeenCalledTimes(2)
  expect(submitLeaderboardRun).not.toHaveBeenCalled()
})
