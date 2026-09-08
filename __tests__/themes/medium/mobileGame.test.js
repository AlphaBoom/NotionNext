import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SecretWalk from '@/themes/medium/components/SecretWalk'
import { createWalk } from '@/themes/medium/lib/hedgehogWalk'

jest.mock('@/themes/medium/lib/hedgehogWalk', () => ({
  ...jest.requireActual('@/themes/medium/lib/hedgehogWalk'),
  createWalk: jest.fn()
}))
const actualCreate = jest.requireActual(
  '@/themes/medium/lib/hedgehogWalk'
).createWalk
const originals = {
  observer: global.IntersectionObserver,
  pointer: window.PointerEvent
}
let frame, visibility

beforeEach(() => {
  jest.useFakeTimers()
  createWalk.mockImplementation(actualCreate)
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false
  })
  global.IntersectionObserver = class {
    constructor(callback) {
      visibility = callback
    }
    observe() {}
    disconnect() {}
  }
  window.PointerEvent = class extends MouseEvent {
    constructor(type, props) {
      super(type, props)
      this.pointerId = props.pointerId || 1
      this.isPrimary = true
    }
  }
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frame = callback
    return 1
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    frame = null
  })
})
afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
  global.IntersectionObserver = originals.observer
  window.PointerEvent = originals.pointer
})

test('lane taps and horizontal swipes move; vertical scrolling and cancelled gestures do not', () => {
  const { container } = render(<SecretWalk onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '出发 ↗' }))
  const board = container.querySelector('.walk-board')
  board.getBoundingClientRect = () => ({ left: 0, width: 300 })
  const lane = () => screen.getByRole('img').getAttribute('aria-label')
  fireEvent.click(screen.getByRole('button', { name: '走左边的小路' }))
  expect(lane()).toContain('左')
  fireEvent.pointerDown(board, { clientX: 100, clientY: 200, button: 0 })
  fireEvent.pointerMove(board, { clientX: 200, clientY: 205 })
  fireEvent.pointerUp(board, { clientX: 200, clientY: 205 })
  expect(lane()).toContain('中')
  fireEvent.pointerDown(board, { clientX: 280, clientY: 200, button: 0 })
  fireEvent.pointerUp(board, { clientX: 280, clientY: 200 })
  expect(lane()).toContain('右')
  fireEvent.pointerDown(board, { clientX: 50, clientY: 200, button: 0 })
  fireEvent.pointerMove(board, { clientX: 45, clientY: 260 })
  fireEvent.pointerCancel(board)
  fireEvent.pointerUp(board, { clientX: 50, clientY: 200 })
  expect(lane()).toContain('右')
})

test('scrolling away pauses the clock; exit and Escape stay available, with listeners cleaned up', () => {
  const onClose = jest.fn()
  const { container, unmount } = render(<SecretWalk onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: '出发 ↗' }))
  act(() => frame(34))
  act(() => visibility([{ intersectionRatio: 0.2 }]))
  expect(container.querySelector('.medium-walk').dataset.phase).toBe('paused')
  expect(frame).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '继续散步 ↗' }))
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  fireEvent(document, new Event('visibilitychange'))
  expect(container.querySelector('.medium-walk').dataset.phase).toBe('paused')
  fireEvent.click(
    screen.getByRole('button', { name: '退出散步，返回个人信息' })
  )
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(2)
  unmount()
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('the first mobile win uses the shared celebration and three-second reveal', async () => {
  createWalk.mockImplementation(mode => ({
    ...actualCreate(mode),
    time: 59.99
  }))
  const reveal = jest.fn(() => Promise.resolve(true)),
    onClose = jest.fn(),
    onVictory = jest.fn(() => reveal)
  render(<SecretWalk onClose={onClose} onVictory={onVictory} />)
  fireEvent.click(screen.getByRole('button', { name: '出发 ↗' }))
  await act(async () => frame(34))
  expect(onVictory).toHaveBeenCalledWith('won')
  expect(screen.getByRole('status').textContent).toContain('隐藏主题已解锁')
  expect(screen.getByRole('status').textContent).toContain('3')
  await act(async () => jest.advanceTimersByTime(1000))
  expect(screen.getByRole('status').textContent).toContain('2')
  expect(reveal).not.toHaveBeenCalled()
  await act(async () => jest.advanceTimersByTime(2000))
  expect(reveal).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('an unlocked mobile run continues beyond one minute and does not claim a reward', () => {
  createWalk.mockImplementation(mode => ({
    ...actualCreate(mode),
    time: 59.99,
    nextWave: 100
  }))
  const onVictory = jest.fn()
  const { container } = render(
    <SecretWalk onClose={() => {}} onVictory={onVictory} unlocked />
  )
  fireEvent.click(screen.getByRole('button', { name: '出发 ↗' }))
  act(() => frame(34))
  expect(container.querySelector('.medium-walk').dataset.mode).toBe('endless')
  expect(container.querySelector('.medium-walk').dataset.phase).toBe('playing')
  expect(onVictory).not.toHaveBeenCalled()
})
