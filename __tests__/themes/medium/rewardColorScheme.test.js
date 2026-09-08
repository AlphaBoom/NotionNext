import React, { StrictMode, useContext } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { GlobalContext } from '@/lib/global'
import RewardColorScheme from '@/themes/medium/components/RewardColorScheme'

jest.mock('@/lib/global', () => ({
  GlobalContext: require('react').createContext()
}))

function Widget() {
  const { isDarkMode, toggleDarkMode, user } = useContext(GlobalContext)
  return (
    <button onClick={toggleDarkMode}>
      {user} / {isDarkMode ? 'dark' : 'light'}
    </button>
  )
}
const preference = dark => ({
  isDarkMode: dark,
  toggleDarkMode: jest.fn(),
  updateDarkMode: jest.fn(),
  user: 'reader'
})
const tree = (global, active, key = 'article') => (
  <StrictMode>
    <GlobalContext.Provider value={global}>
      <RewardColorScheme active={active}>
        <Widget key={key} />
      </RewardColorScheme>
    </GlobalContext.Provider>
  </StrictMode>
)
beforeEach(() => {
  document.documentElement.className = 'dark unrelated-class'
  document.documentElement.style.colorScheme = ''
  localStorage.setItem('darkMode', 'true')
})

test('Notion/Prism/comment consumers and root CSS agree, without overwriting normal preference', () => {
  const global = preference(true)
  const page = render(tree(global, false))
  expect(screen.getByRole('button').textContent).toBe('reader / dark')
  page.rerender(tree(global, true))
  expect(screen.getByRole('button').textContent).toBe('reader / light')
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(document.documentElement.classList.contains('unrelated-class')).toBe(
    true
  )
  expect(document.documentElement.style.colorScheme).toBe('light')
  fireEvent.click(screen.getByRole('button'))
  expect(global.toggleDarkMode).not.toHaveBeenCalled()
  expect(global.updateDarkMode).not.toHaveBeenCalled()
  expect(localStorage.getItem('darkMode')).toBe('true')
  page.rerender(tree(global, true, 'next-article'))
  expect(screen.getByRole('button').textContent).toBe('reader / light')
  page.rerender(tree(global, false))
  expect(screen.getByRole('button').textContent).toBe('reader / dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(document.documentElement.style.colorScheme).toBe('')
  fireEvent.click(screen.getByRole('button'))
  expect(global.toggleDarkMode).toHaveBeenCalledTimes(1)
})

test('unmount and changing normal preference restore the latest choice', () => {
  const page = render(tree(preference(true), true))
  page.rerender(tree(preference(false), true))
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  page.unmount()
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(document.documentElement.classList.contains('light')).toBe(true)
  const other = render(tree(preference(true), true))
  other.unmount()
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(document.documentElement.classList.contains('unrelated-class')).toBe(
    true
  )
})
