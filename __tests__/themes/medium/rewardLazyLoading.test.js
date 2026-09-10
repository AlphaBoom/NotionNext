import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import RewardProvider, {
  useReward
} from '@/themes/medium/components/RewardProvider'
import { REWARD_KEY } from '@/themes/medium/lib/rewardState'

const mockMenuLoad = jest.fn()
const mockThemeLoad = jest.fn()
const mockPrepareArtwork = jest.fn()
let mockPath = '/'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: mockPath }) }))
jest.mock(
  '@/components/SmartLink',
  () =>
    function MockSmartLink({ children, ...props }) {
      return <a {...props}>{children}</a>
    }
)
jest.mock('@/lib/global', () => ({
  GlobalContext: require('react').createContext()
}))
jest.mock('@/themes/medium/components/RewardContextMenu', () => {
  const entry = jest.requireActual(
    '@/themes/medium/components/RewardContextMenu'
  )
  return {
    __esModule: true,
    // Track each dynamic import, including cached modules in later tests.
    then(resolve, reject) {
      mockMenuLoad().then(() => resolve(entry), reject)
    }
  }
})
jest.mock('@/themes/medium/components/NewGameTheme', () => {
  const theme = {
    __esModule: true,
    default: ({ active, opening, onCovered, onOpeningEnd }) => (
      <>
        <style data-testid='full-theme-styles'>{'.full-theme {}'}</style>
        {active && <aside>Theme decorations</aside>}
        {opening && (
          <div
            data-testid='theme-opening'
            onAnimationEnd={opening === 'cover' ? onCovered : onOpeningEnd}
          />
        )}
      </>
    ),
    NewGameHero: () => <h1>NEW GAME!</h1>,
    prepareArtwork: () => mockPrepareArtwork()
  }
  return {
    __esModule: true,
    then(resolve, reject) {
      mockThemeLoad().then(() => resolve(theme), reject)
    }
  }
})

function Page() {
  const { active, Hero } = useReward()
  return (
    <main id='theme-medium' data-active={active}>
      {active && Hero ? <Hero /> : <h1>Normal blog</h1>}
    </main>
  )
}
const tree = () => (
  <RewardProvider>
    <Page />
  </RewardProvider>
)
const flush = () => act(async () => {})
const save = enabled =>
  localStorage.setItem(REWARD_KEY, JSON.stringify({ unlocked: true, enabled }))
const finishAnimation = () =>
  act(() => fireEvent.animationEnd(screen.getByTestId('theme-opening')))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-new-game-boot')
  mockPath = '/'
  mockMenuLoad.mockImplementation(() => Promise.resolve())
  mockThemeLoad.mockImplementation(() => Promise.resolve())
  mockPrepareArtwork.mockImplementation(() => Promise.resolve())
})

test('a visitor without an unlock loads neither the entry nor the theme', async () => {
  render(tree())
  await flush()
  expect(screen.getByRole('heading', { name: 'Normal blog' })).toBeTruthy()
  expect(mockMenuLoad).not.toHaveBeenCalled()
  expect(mockThemeLoad).not.toHaveBeenCalled()
  expect(mockPrepareArtwork).not.toHaveBeenCalled()
})

test.each(['/', '/article/saved-post'])(
  'an unlocked but disabled theme loads only the switch on %s',
  async path => {
    mockPath = path
    save(false)
    render(tree())
    await flush()
    expect(
      screen.getByRole('button', { name: '开启 NEW GAME! 主题' })
    ).toBeTruthy()
    expect(mockMenuLoad).toHaveBeenCalledTimes(1)
    expect(mockThemeLoad).not.toHaveBeenCalled()
    expect(mockPrepareArtwork).not.toHaveBeenCalled()
    expect(screen.queryByTestId('full-theme-styles')).toBeNull()
  }
)

test('switching loads the theme once, removes it on exit and retains the same focused entry', async () => {
  save(false)
  render(tree())
  await flush()
  const button = screen.getByRole('button', { name: '开启 NEW GAME! 主题' })
  button.focus()
  fireEvent.click(button)
  await flush()
  expect(mockThemeLoad).toHaveBeenCalledTimes(1)
  expect(mockPrepareArtwork).toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: 'Normal blog' })).toBeTruthy()
  finishAnimation()
  expect(screen.getByRole('heading', { name: 'NEW GAME!' })).toBeTruthy()
  finishAnimation()
  expect(screen.getByRole('button', { name: '恢复原主题' })).toBe(button)
  fireEvent.click(button)
  expect(screen.getByRole('heading', { name: 'Normal blog' })).toBeTruthy()
  expect(screen.queryByTestId('full-theme-styles')).toBeNull()
  expect(screen.queryByText('Theme decorations')).toBeNull()
  expect(document.activeElement).toBe(button)
  fireEvent.click(button)
  await flush()
  finishAnimation()
  finishAnimation()
  expect(mockThemeLoad).toHaveBeenCalledTimes(1)
  expect(mockMenuLoad).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '恢复原主题' })).toBe(button)
})

test('a failed theme import leaves the entry usable for retry', async () => {
  save(false)
  mockThemeLoad.mockRejectedValueOnce(Error('Chunk unavailable'))
  render(tree())
  await flush()
  const button = screen.getByRole('button', { name: '开启 NEW GAME! 主题' })
  fireEvent.click(button)
  await flush()
  expect(screen.queryByTestId('full-theme-styles')).toBeNull()
  expect(screen.getByRole('button', { name: '开启 NEW GAME! 主题' })).toBe(
    button
  )
  fireEvent.click(button)
  await flush()
  finishAnimation()
  finishAnimation()
  expect(mockThemeLoad).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('heading', { name: 'NEW GAME!' })).toBeTruthy()
})

test('a slow entry chunk does not hold up restoring an enabled theme', async () => {
  save(true)
  mockMenuLoad.mockImplementation(() => new Promise(() => {}))
  document.documentElement.setAttribute('data-new-game-boot', 'loading')
  render(tree())
  await flush()
  expect(screen.getByRole('heading', { name: 'NEW GAME!' })).toBeTruthy()
  expect(document.documentElement.hasAttribute('data-new-game-boot')).toBe(
    false
  )
  expect(mockThemeLoad).toHaveBeenCalledTimes(1)
  expect(mockPrepareArtwork).not.toHaveBeenCalled()
})

test('disabling in another tab cancels a pending restore without losing the entry', async () => {
  save(true)
  let finishTheme
  mockThemeLoad.mockImplementation(
    () =>
      new Promise(resolve => {
        finishTheme = resolve
      })
  )
  render(tree())
  await flush()
  save(false)
  fireEvent(window, new StorageEvent('storage', { key: REWARD_KEY }))
  await act(() => {
    finishTheme()
    return Promise.resolve()
  })
  expect(screen.getByRole('heading', { name: 'Normal blog' })).toBeTruthy()
  expect(screen.queryByTestId('full-theme-styles')).toBeNull()
  expect(
    screen.getByRole('button', { name: '开启 NEW GAME! 主题' })
  ).toBeTruthy()
})
