import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import SecretSurvivors from '@/themes/medium/components/SecretSurvivors'
import { createRun } from '@/themes/medium/lib/survivors'
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

test('Escape closes the loss screen even when focus has left the game', () => {
  const { onClose, unmount } = setup()
  expect(screen.getByRole('button', { name: '再出发一次 ↗' })).toBeTruthy()
  const outside = screen.getByRole('button', { name: '博客里的其他按钮' })
  outside.focus()
  fireEvent.keyDown(outside, { key: 'Escape', code: 'Escape' })
  fireEvent.keyDown(outside, { key: 'Escape', code: 'Escape', repeat: true })
  expect(onClose).toHaveBeenCalledTimes(1)
  unmount()
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('the loss screen offers a clickable return beside retry', () => {
  const { onClose } = setup()
  fireEvent.click(screen.getByRole('button', { name: '返回博客', exact: true }))
  expect(onClose).toHaveBeenCalledTimes(1)
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

test.each(['ready', 'paused', 'upgrade', 'won'])(
  'the exit button remains clickable in the %s phase',
  phase => {
    createRun.mockImplementation((seed, mode) => ({
      ...actualCreateRun(seed, mode),
      phase
    }))
    const { onClose } = setup()
    fireEvent.click(
      screen.getByRole('button', { name: '退出游戏，返回个人信息' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  }
)

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
