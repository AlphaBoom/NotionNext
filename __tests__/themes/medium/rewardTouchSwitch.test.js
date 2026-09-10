import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import RewardContextMenu from '@/themes/medium/components/RewardContextMenu'

let mockPath = '/',
  desktop = false,
  root
jest.mock('next/router', () => ({ useRouter: () => ({ asPath: mockPath }) }))
jest.mock('@/components/SmartLink', () => ({ children, ...props }) => (
  <a {...props}>{children}</a>
))
const originalMedia = window.matchMedia
beforeEach(() => {
  mockPath = '/'
  desktop = false
  window.matchMedia = () => ({
    matches: desktop,
    addEventListener() {},
    removeEventListener() {}
  })
  root = document.createElement('main')
  root.id = 'theme-medium'
  document.body.appendChild(root)
})
afterEach(() => {
  root.remove()
  window.matchMedia = originalMedia
})

test('navigating to a new page moves the shortcut to its root, including pages without a footer', () => {
  const page = render(<RewardContextMenu active={false} onToggle={() => {}} />)
  const oldRoot = root
  oldRoot.remove()
  root = document.createElement('main')
  root.id = 'theme-medium'
  document.body.appendChild(root)
  mockPath = '/article/20230820'
  page.rerender(<RewardContextMenu active={false} onToggle={() => {}} />)
  expect(root.querySelector('.ng-touch-switch')).not.toBeNull()
  expect(oldRoot.querySelector('.ng-touch-switch')).toBeNull()
})

test('desktop blank-space menu still switches themes and links keep their native context menu', () => {
  desktop = true
  const toggle = jest.fn()
  render(<RewardContextMenu active={false} onToggle={toggle} />)
  expect(fireEvent.contextMenu(root, { clientX: 100, clientY: 100 })).toBe(
    false
  )
  fireEvent.click(screen.getByRole('menuitem', { name: '开启 NEW GAME! 主题' }))
  expect(toggle).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('menu')).toBeNull()
  const link = document.createElement('a')
  link.href = '/about'
  root.appendChild(link)
  expect(fireEvent.contextMenu(link)).toBe(true)
  expect(screen.queryByRole('menu')).toBeNull()
})
