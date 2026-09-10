import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import SecretSurvivors from '@/themes/medium/components/SecretSurvivors'
import { createRun } from '@/themes/medium/lib/survivors'
import { offerUpgrades } from '@/themes/medium/lib/survivors'
import { createRenderer } from '@/themes/medium/lib/survivorsCanvas'

jest.mock('@/themes/medium/lib/survivors', () => ({
  ...jest.requireActual('@/themes/medium/lib/survivors'),
  createRun: jest.fn()
}))
jest.mock('@/themes/medium/lib/survivorsCanvas', () => ({
  createRenderer: jest.fn(),
  HEDGEHOG: [],
  HEDGEHOG_COLORS: {}
}))

const actualCreateRun = jest.requireActual(
  '@/themes/medium/lib/survivors'
).createRun
const observer = class {
  observe() {}
  disconnect() {}
}
const originals = {
  ResizeObserver: global.ResizeObserver,
  IntersectionObserver: global.IntersectionObserver,
  matchMedia: window.matchMedia
}

beforeEach(() => {
  createRenderer.mockReturnValue({ draw: jest.fn(), resize: jest.fn() })
  createRun.mockImplementation((seed, mode) => ({
    ...actualCreateRun(seed, mode),
    phase: 'lost'
  }))
  global.ResizeObserver = observer
  global.IntersectionObserver = observer
  window.matchMedia = jest.fn(() => ({ matches: false }))
  jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  global.ResizeObserver = originals.ResizeObserver
  global.IntersectionObserver = originals.IntersectionObserver
  window.matchMedia = originals.matchMedia
})

function setup() {
  const onClose = jest.fn()
  const view = render(
    <>
      <button>博客里的其他按钮</button>
      <SecretSurvivors onClose={onClose} unlocked />
    </>
  )
  return { ...view, onClose }
}

test('loss controls return to the blog, including Escape outside the game and listener cleanup', () => {
  const { onClose, unmount } = setup()
  fireEvent.click(screen.getByRole('button', { name: '返回博客', exact: true }))
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '再出发一次 ↗' })).toBeTruthy()
  const outside = screen.getByRole('button', { name: '博客里的其他按钮' })
  outside.focus()
  fireEvent.keyDown(outside, { key: 'Escape', code: 'Escape' })
  fireEvent.keyDown(outside, { key: 'Escape', code: 'Escape', repeat: true })
  expect(onClose).toHaveBeenCalledTimes(2)
  unmount()
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('retrying keeps the exit control and Escape available during play', () => {
  const { onClose, container } = setup()
  fireEvent.click(screen.getByRole('button', { name: '再出发一次 ↗' }))
  expect(container.querySelector('.medium-survivors').dataset.phase).toBe(
    'playing'
  )
  const outside = screen.getByRole('button', { name: '博客里的其他按钮' })
  outside.focus()
  fireEvent.keyDown(outside, { key: 'Escape', code: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent.click(
    screen.getByRole('button', { name: '退出游戏，返回个人信息' })
  )
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('a renderer failure still allows Escape and the visible exit', () => {
  createRenderer.mockReturnValue(null)
  const { onClose } = setup()
  expect(screen.getByText('今晚先歇一歇')).toBeTruthy()
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
  fireEvent.click(
    screen.getByRole('button', { name: '退出游戏，返回个人信息' })
  )
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('queued upgrades keep combat stopped, ignore held digit keys, and resume only after the last selection', () => {
  let active
  createRun.mockImplementation((seed, mode) => {
    active = actualCreateRun(seed, mode)
    active.level = 4
    active.pendingUpgrades = 3
    offerUpgrades(active)
    return active
  })
  const { container } = setup()
  const panel = container.querySelector('.medium-survivors')
  expect(screen.getByText('连续升级 · 还可选择 3 项')).toBeTruthy()
  fireEvent.keyDown(panel, { code: 'Digit1', repeat: true })
  expect(active.pendingUpgrades).toBe(3)
  fireEvent.click(container.querySelector('.survivors-choices button'))
  expect(panel.dataset.phase).toBe('upgrade')
  expect(active.pendingUpgrades).toBe(2)
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  fireEvent.keyDown(panel, { code: 'Digit1' })
  expect(panel.dataset.phase).toBe('upgrade')
  expect(active.pendingUpgrades).toBe(1)
  fireEvent.keyDown(panel, { code: 'Digit1' })
  expect(panel.dataset.phase).toBe('playing')
  expect(active.pendingUpgrades).toBe(0)
  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
})

test('reroll updates cards and its remaining count while keeping combat paused', () => {
  createRun.mockImplementation((seed, mode) => {
    const run = actualCreateRun(seed, mode)
    run.level = 10
    run.pendingUpgrades = 1
    offerUpgrades(run)
    return run
  })
  const { container } = setup()
  const before = [
    ...container.querySelectorAll('.survivors-choices strong')
  ].map(e => e.textContent)
  fireEvent.click(screen.getByRole('button', { name: '重抽 · 剩余 3 次' }))
  expect(screen.getByRole('button', { name: '重抽 · 剩余 2 次' })).toBeTruthy()
  expect(
    [...container.querySelectorAll('.survivors-choices strong')].every(
      e => !before.includes(e.textContent)
    )
  ).toBe(true)
  expect(container.querySelector('.medium-survivors').dataset.phase).toBe(
    'upgrade'
  )
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
})
