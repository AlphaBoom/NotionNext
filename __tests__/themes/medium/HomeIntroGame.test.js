import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import HomeIntro from '@/themes/medium/components/HomeIntro'

const mockDesktopLoad = jest.fn(),
  mockMobileLoad = jest.fn()
let mockRewardActive = false
jest.mock('@/themes/medium/components/SecretSurvivors', () => {
  mockDesktopLoad()
  return {
    __esModule: true,
    default: ({ onClose }) => (
      <button onClick={onClose}>Desktop game exit</button>
    )
  }
})
jest.mock('@/themes/medium/components/SecretRunner', () => {
  mockMobileLoad()
  return {
    __esModule: true,
    default: ({ onClose, unlocked }) => (
      <button onClick={onClose}>
        Mobile {unlocked ? 'challenge' : 'intro'} exit
      </button>
    )
  }
})
jest.mock('@/themes/medium/components/RewardProvider', () => ({
  useReward: () => ({ unlocked: true, active: mockRewardActive })
}))
jest.mock('@/components/LazyImage', () => () => <span>Portrait</span>)
jest.mock('@/components/SmartLink', () => ({ children, ...props }) => (
  <a {...props}>{children}</a>
))
jest.mock('@/lib/config', () => ({ siteConfig: () => 'AlphaBoom' }))
const originals = {
  observer: global.ResizeObserver,
  media: window.matchMedia,
  scroll: Element.prototype.scrollIntoView
}
let desktop, mediaChanged
beforeEach(() => {
  jest.useFakeTimers()
  mockRewardActive = false
  desktop = false
  window.matchMedia = jest.fn(query => ({
    get matches() {
      return query.includes('prefers-reduced-motion') ? true : desktop
    },
    addEventListener: (_, callback) => {
      mediaChanged = callback
    },
    removeEventListener: () => {}
  }))
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = jest.fn()
})
afterEach(() => {
  jest.useRealTimers()
  global.ResizeObserver = originals.observer
  window.matchMedia = originals.media
  Element.prototype.scrollIntoView = originals.scroll
})
const open = async () => {
  fireEvent.click(
    screen.getByRole('button', { name: 'AlphaBoom 的头像，开启刺猬夜行' })
  )
  await act(async () => {})
  await act(async () => jest.runOnlyPendingTimers())
}

test('the touch avatar opens only the mobile chunk and passes the existing unlock', async () => {
  render(<HomeIntro />)
  expect(mockMobileLoad).not.toHaveBeenCalled()
  expect(mockDesktopLoad).not.toHaveBeenCalled()
  await open()
  expect(
    screen.getByRole('button', { name: 'Mobile challenge exit' })
  ).toBeTruthy()
  expect(mockMobileLoad).toHaveBeenCalledTimes(1)
  expect(mockDesktopLoad).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Mobile challenge exit' }))
  await act(async () => jest.runOnlyPendingTimers())
  expect(
    screen.getByRole('button', { name: 'AlphaBoom 的头像，开启刺猬夜行' })
  ).toBeTruthy()
})

test('desktop keeps Survivors and a device-mode change safely returns to the profile', async () => {
  desktop = true
  render(<HomeIntro />)
  await open()
  expect(screen.getByRole('button', { name: 'Desktop game exit' })).toBeTruthy()
  desktop = false
  act(() => mediaChanged())
  expect(screen.queryByRole('button', { name: 'Desktop game exit' })).toBeNull()
  await open()
  expect(
    screen.getByRole('button', { name: 'Mobile challenge exit' })
  ).toBeTruthy()
})

test.each([true, false])(
  'switching from reward active=%s drops the old height before the new layout is measured',
  active => {
    mockRewardActive = active
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(() => ({ height: mockRewardActive ? 188 : 300 }))
    const commits = []
    const page = (
      <React.Profiler
        id='intro'
        onRender={() => {
          const stage = document.querySelector('.medium-intro-stage')
          commits.push({
            height: stage.style.height,
            transition: stage.style.transition
          })
        }}
      >
        <HomeIntro />
      </React.Profiler>
    )
    const { rerender, container } = render(page)
    const stage = container.querySelector('.medium-intro-stage')
    expect(stage.style.height).toBe(active ? '188px' : '300px')
    commits.length = 0
    mockRewardActive = !active
    // A fresh element makes the mocked context change visible to HomeIntro.
    rerender(React.cloneElement(page, {}, <HomeIntro />))
    // The very first commit must already use natural height, so the browser
    // never paints the new theme inside the previous theme's fixed-height box.
    expect(commits[0]).toEqual({ height: '', transition: 'none' })
    expect(stage.style.height).toBe(active ? '300px' : '188px')
    expect(stage.style.transition).toBe('')
  }
)

test('theme changes after leaving a game do not replay focus or scrolling', async () => {
  desktop = true
  const { rerender } = render(<HomeIntro />)
  await open()
  fireEvent.click(screen.getByRole('button', { name: 'Desktop game exit' }))
  await act(async () => jest.runOnlyPendingTimers())
  const avatar = screen.getByRole('button', {
    name: 'AlphaBoom 的头像，开启刺猬夜行'
  })
  expect(document.activeElement).toBe(avatar)
  const focus = jest.spyOn(avatar, 'focus')
  Element.prototype.scrollIntoView.mockClear()
  mockRewardActive = true
  rerender(<HomeIntro />)
  mockRewardActive = false
  rerender(<HomeIntro />)
  expect(focus).not.toHaveBeenCalled()
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
})

test('entering and leaving a game still supplies heights for the stage transition', async () => {
  desktop = true
  jest
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(() => ({
      height: document.querySelector('.medium-inline-game') ? 650 : 300
    }))
  const { container } = render(<HomeIntro />)
  const stage = container.querySelector('.medium-intro-stage')
  expect(stage.style.height).toBe('300px')
  await open()
  expect(stage.style.height).toBe('650px')
  expect(stage.style.transition).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Desktop game exit' }))
  await act(async () => jest.runOnlyPendingTimers())
  expect(stage.style.height).toBe('300px')
  expect(stage.style.transition).toBe('')
})
