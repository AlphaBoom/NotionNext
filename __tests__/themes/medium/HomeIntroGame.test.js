import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import HomeIntro from '@/themes/medium/components/HomeIntro'

const mockDesktopLoad = jest.fn(),
  mockMobileLoad = jest.fn()
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
  useReward: () => ({ unlocked: true })
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
