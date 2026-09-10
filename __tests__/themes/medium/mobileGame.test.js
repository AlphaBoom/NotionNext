import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SecretRunner from '@/themes/medium/components/SecretRunner'
import { createRunner } from '@/themes/medium/lib/hedgehogRunner'

jest.mock('@/themes/medium/lib/hedgehogRunner', () => ({
  ...jest.requireActual('@/themes/medium/lib/hedgehogRunner'),
  createRunner: jest.fn()
}))
const actualCreate = jest.requireActual(
  '@/themes/medium/lib/hedgehogRunner'
).createRunner
const originals = {
  observer: global.IntersectionObserver,
  pointer: window.PointerEvent
}
let frame, visibility

beforeEach(() => {
  jest.useFakeTimers()
  createRunner.mockImplementation(actualCreate)
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
  const { container } = render(<SecretRunner onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '开跑 ↗' }))
  const board = container.querySelector('.runner-board')
  board.getBoundingClientRect = () => ({ left: 0, width: 300 })
  const lane = () => screen.getByRole('img').getAttribute('aria-label')
  fireEvent.click(screen.getByRole('button', { name: '移到左边跑道' }))
  expect(lane()).toContain('左')
  fireEvent.pointerDown(board, { clientX: 100, clientY: 200, button: 0 })
  fireEvent.pointerMove(board, { clientX: 200, clientY: 205 })
  fireEvent.pointerUp(board, { clientX: 200, clientY: 205 })
  expect(lane()).toContain('右')
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
  const { container, unmount } = render(<SecretRunner onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: '开跑 ↗' }))
  act(() => frame(34))
  act(() => visibility([{ intersectionRatio: 0.2 }]))
  expect(container.querySelector('.medium-runner').dataset.phase).toBe('paused')
  expect(frame).toBeNull()
  act(() => visibility([{ intersectionRatio: 1 }]))
  fireEvent.click(screen.getByRole('button', { name: '继续开跑 ↗' }))
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  fireEvent(document, new Event('visibilitychange'))
  expect(container.querySelector('.medium-runner').dataset.phase).toBe('paused')
  fireEvent.click(
    screen.getByRole('button', { name: '退出游戏，返回个人信息' })
  )
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(2)
  unmount()
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('the mobile intro shows 30 seconds and then uses the three-second reveal', async () => {
  createRunner.mockImplementation(mode => ({
    ...actualCreate(mode),
    time: 29.99
  }))
  const reveal = jest.fn(() => Promise.resolve(true)),
    onClose = jest.fn(),
    onVictory = jest.fn(() => reveal)
  render(<SecretRunner onClose={onClose} onVictory={onVictory} />)
  expect(screen.getByText('30 SECOND RUN')).toBeTruthy()
  expect(screen.getByText('/ 00:30')).toBeTruthy()
  expect(screen.getByRole('progressbar', { name: '30 秒闯关进度' }).max).toBe(
    30
  )
  fireEvent.click(screen.getByRole('button', { name: '开跑 ↗' }))
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
  createRunner.mockImplementation(mode => ({
    ...actualCreate(mode),
    time: 59.99,
    nextGate: 100,
    nextEnemy: 100
  }))
  const onVictory = jest.fn()
  const { container } = render(
    <SecretRunner onClose={() => {}} onVictory={onVictory} unlocked />
  )
  fireEvent.click(screen.getByRole('button', { name: '开跑 ↗' }))
  act(() => frame(34))
  expect(container.querySelector('.medium-runner').dataset.mode).toBe('endless')
  expect(container.querySelector('.medium-runner').dataset.phase).toBe(
    'playing'
  )
  expect(onVictory).not.toHaveBeenCalled()
})

function queuedRun(rewards = 2) {
  const run = actualCreate('endless', 10)
  run.level = rewards + 1
  run.pendingUpgrades = rewards
  run.nextGate = run.nextEnemy = run.nextShot = run.nextBoss = Infinity
  return run
}
function beginChoices(rewards = 2) {
  createRunner.mockImplementation(() => queuedRun(rewards))
  const view = render(<SecretRunner onClose={() => {}} unlocked />)
  fireEvent.click(screen.getByRole('button', { name: '开跑 ↗' }))
  act(() => frame(34))
  return view
}
function readyChoices() {
  act(() => jest.advanceTimersByTime(310))
}

test('queued touch choices stay paused, block rapid double taps and resume only after the final choice', () => {
  const { container } = beginChoices()
  const phase = () => container.querySelector('.medium-runner').dataset.phase
  expect(phase()).toBe('upgrade')
  expect(frame).toBeNull()
  let card = container.querySelector('.runner-choice')
  expect(card.disabled).toBe(true)
  fireEvent.click(card)
  expect(screen.getByRole('status')).toHaveTextContent('还有 2 次选择')
  readyChoices()
  fireEvent.click(container.querySelector('.runner-choice'))
  expect(phase()).toBe('upgrade')
  expect(screen.getByRole('status')).toHaveTextContent('选好再出发')
  fireEvent.click(container.querySelector('.runner-choice'))
  expect(phase()).toBe('upgrade')
  expect(frame).toBeNull()
  readyChoices()
  fireEvent.click(container.querySelector('.runner-choice'))
  expect(phase()).toBe('playing')
  expect(frame).toEqual(expect.any(Function))
})

test('holding a choice key cannot consume another reward and reroll does not resume combat', () => {
  const { container } = beginChoices()
  const panel = container.querySelector('.medium-runner')
  fireEvent.keyDown(panel, { key: '1' })
  expect(screen.getByRole('status')).toHaveTextContent('还有 2 次选择')
  readyChoices()
  fireEvent.click(screen.getByRole('button', { name: '重抽 · 剩余 3 次' }))
  expect(
    screen.getByRole('button', { name: '重抽 · 剩余 2 次' })
  ).toBeDisabled()
  expect(frame).toBeNull()
  readyChoices()
  fireEvent.keyDown(panel, { key: '1' })
  readyChoices()
  fireEvent.keyDown(panel, { key: '1', repeat: true })
  expect(panel.dataset.phase).toBe('upgrade')
  fireEvent.keyDown(panel, { key: '1', repeat: false })
  expect(panel.dataset.phase).toBe('playing')
})

test('finishing a queued choice after leaving the viewport or opening the build does not restart the clock', () => {
  const { container } = beginChoices(1)
  act(() => visibility([{ intersectionRatio: 0.2 }]))
  readyChoices()
  fireEvent.click(container.querySelector('.runner-choice'))
  expect(container.querySelector('.medium-runner').dataset.phase).toBe('paused')
  expect(frame).toBeNull()
  act(() => visibility([{ intersectionRatio: 1 }]))
  fireEvent.click(screen.getByRole('button', { name: '继续开跑 ↗' }))
  const details = container.querySelector('details')
  details.open = true
  fireEvent(details, new Event('toggle'))
  expect(container.querySelector('.medium-runner').dataset.phase).toBe('paused')
  expect(frame).toBeNull()
})

test('hidden pages cannot choose an upgrade; return keeps the reward and requires deliberate resume', () => {
  const { container } = beginChoices(1)
  readyChoices()
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  fireEvent(document, new Event('visibilitychange'))
  fireEvent.click(container.querySelector('.runner-choice'))
  expect(container.querySelector('.medium-runner').dataset.phase).toBe(
    'upgrade'
  )
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false
  })
  fireEvent(document, new Event('visibilitychange'))
  fireEvent.click(container.querySelector('.runner-choice'))
  expect(container.querySelector('.medium-runner').dataset.phase).toBe('paused')
})

test('a gesture that starts as vertical scrolling never turns into a lane change', () => {
  const { container } = render(<SecretRunner onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '开跑 ↗' }))
  const board = container.querySelector('.runner-board')
  board.getBoundingClientRect = () => ({ left: 0, width: 300 })
  fireEvent.pointerDown(board, { clientX: 50, clientY: 100, button: 0 })
  fireEvent.pointerMove(board, { clientX: 54, clientY: 125 })
  fireEvent.pointerMove(board, { clientX: 220, clientY: 130 })
  fireEvent.pointerUp(board, { clientX: 220, clientY: 130 })
  expect(screen.getByRole('img')).toHaveAttribute(
    'aria-label',
    expect.stringContaining('左')
  )
})

test('results show the build and run stats; restarting clears progression and pending rewards', () => {
  createRunner.mockImplementation(() => {
    const run = actualCreate('endless', 8)
    run.hp = 1
    run.score = 430
    run.kills = 20
    run.level = 8
    run.bosses = 2
    run.upgrades = { haste: 3 }
    run.nextGate = run.nextEnemy = run.nextShot = run.nextBoss = Infinity
    run.items = [
      {
        id: 99,
        kind: 'enemy',
        lane: 0,
        y: 0.819,
        speed: 1,
        hp: 100,
        maxHp: 100,
        hit: 0
      }
    ]
    return run
  })
  const { container } = render(<SecretRunner onClose={() => {}} unlocked />)
  fireEvent.click(screen.getByRole('button', { name: '开跑 ↗' }))
  act(() => frame(34))
  expect(screen.getByLabelText('本局成绩')).toHaveTextContent('430')
  expect(screen.getByLabelText('本局成绩')).toHaveTextContent('击退首领')
  expect(container.querySelector('.runner-build')).toHaveTextContent('急性子')
  createRunner.mockImplementation(actualCreate)
  fireEvent.click(screen.getByRole('button', { name: '再跑一次 ↗' }))
  expect(container.querySelector('.medium-runner').dataset.phase).toBe(
    'playing'
  )
  expect(screen.getByText('LV.1')).toBeTruthy()
  expect(container.querySelector('.runner-build summary')).toHaveTextContent(
    '0/6'
  )
  expect(screen.getByLabelText('生命 3/3')).toBeTruthy()
})
