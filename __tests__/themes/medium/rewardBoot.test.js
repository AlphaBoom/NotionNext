import React, { useLayoutEffect } from 'react'
import { act, render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import RewardProvider, {
  useReward
} from '@/themes/medium/components/RewardProvider'
import { prepareArtwork } from '@/themes/medium/components/NewGameTheme'
import { REWARD_KEY } from '@/themes/medium/lib/rewardState'
import {
  REWARD_BOOT_ATTRIBUTE,
  REWARD_BOOT_TIMEOUT,
  rewardBootScript,
  rewardBootStyle
} from '@/themes/medium/lib/rewardBoot'

jest.mock('@/lib/global', () => ({
  GlobalContext: require('react').createContext()
}))
let mockThemeLoad
jest.mock('@/themes/medium/components/NewGameTheme', () => {
  const theme = {
    __esModule: true,
    default: () => <style>{'.medium-newgame { color: purple; }'}</style>,
    NewGameHero: () => <h1>NEW GAME!</h1>,
    prepareArtwork: jest.fn(() => Promise.resolve())
  }
  return {
    ...theme,
    // Dynamic import assimilates this thenable, so tests can independently
    // delay/fail the theme chunk without using artwork as a stand-in for it.
    then(resolve, reject) {
      mockThemeLoad.then(() => resolve(theme), reject)
    }
  }
})

const root = document.documentElement
const boot = () => root.getAttribute(REWARD_BOOT_ATTRIBUTE)
const savedReward = { unlocked: true, enabled: true }
const flush = () => act(async () => {})
const runBoot = (theme = 'medium') => new Function(rewardBootScript(theme))()
function Page({ onCommit = () => {}, article = false }) {
  const { active, Hero } = useReward()
  useLayoutEffect(() => {
    onCommit({ active, boot: boot(), dark: root.classList.contains('dark') })
  })
  return (
    <main id='theme-medium' className={active ? 'medium-newgame' : ''}>
      {article ? (
        <h1>Saved article</h1>
      ) : active && Hero ? (
        <Hero />
      ) : (
        <h1>Normal blog</h1>
      )}
    </main>
  )
}

beforeEach(() => {
  jest.useFakeTimers()
  localStorage.clear()
  root.removeAttribute(REWARD_BOOT_ATTRIBUTE)
  root.className = 'dark'
  root.style.colorScheme = ''
  history.replaceState({}, '', '/')
  mockThemeLoad = Promise.resolve()
  prepareArtwork.mockImplementation(() => Promise.resolve())
})
afterEach(() => {
  jest.useRealTimers()
  root.removeAttribute(REWARD_BOOT_ATTRIBUTE)
})

test.each([
  null,
  '{broken',
  '{}',
  '{"enabled":true}',
  '{"unlocked":true,"enabled":false}'
])('normal visits do not hide their server-rendered content: %s', value => {
  if (value !== null) localStorage.setItem(REWARD_KEY, value)
  runBoot()
  expect(boot()).toBeNull()
})

test('the boot respects the configured and URL-selected base theme', () => {
  localStorage.setItem(REWARD_KEY, JSON.stringify(savedReward))
  runBoot('hexo')
  expect(boot()).toBeNull()
  history.replaceState({}, '', '/?theme=hexo')
  runBoot('medium')
  expect(boot()).toBeNull()
  history.replaceState({}, '', '/?theme=medium')
  runBoot('hexo')
  expect(boot()).toBe('loading')
})

test('blocked storage never prevents the normal blog from appearing', () => {
  const blocked = jest
    .spyOn(Storage.prototype, 'getItem')
    .mockImplementation(() => {
      throw Error('Storage denied')
    })
  expect(runBoot).not.toThrow()
  expect(boot()).toBeNull()
  blocked.mockRestore()
})

test.each([false, true])(
  'a saved theme restores without waiting for artwork or flashing the normal theme (article: %s)',
  async article => {
    localStorage.setItem(REWARD_KEY, JSON.stringify(savedReward))
    localStorage.setItem('darkMode', 'true')
    if (article) history.replaceState({}, '', '/article/saved-post')
    prepareArtwork.mockImplementation(() => new Promise(() => {}))
    const style = document.createElement('style')
    style.textContent = rewardBootStyle
    document.head.appendChild(style)
    const container = document.createElement('div')
    container.id = '__next'
    // The server and first client render intentionally use the same markup.
    container.innerHTML = `<main id="theme-medium" class=""><h1>${article ? 'Saved article' : 'Normal blog'}</h1></main>`
    const originalMain = container.firstChild
    runBoot()
    document.body.appendChild(container)
    expect(getComputedStyle(container).visibility).toBe('hidden')
    const onCommit = jest.fn()
    const onRecoverableError = jest.fn()
    let hydrated
    await act(async () => {
      hydrated = hydrateRoot(
        container,
        <RewardProvider>
          <Page onCommit={onCommit} article={article} />
        </RewardProvider>,
        { onRecoverableError }
      )
    })
    expect(container.firstChild).toBe(originalMain)
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(boot()).toBeNull()
    expect(prepareArtwork).not.toHaveBeenCalled()
    expect(container.textContent).toContain(
      article ? 'Saved article' : 'NEW GAME!'
    )
    expect(container.querySelector('.medium-newgame')).not.toBeNull()
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.style.colorScheme).toBe('light')
    expect(localStorage.getItem('darkMode')).toBe('true')
    expect(getComputedStyle(container).visibility).toBe('visible')
    expect(container.querySelector('[role="status"]')).toBeNull()
    for (const [frame] of onCommit.mock.calls) {
      if (!frame.active) expect(frame.boot).toBe('loading')
    }
    await act(async () => hydrated.unmount())
    container.remove()
    style.remove()
  }
)

test('a failed optional theme load releases the blog and preserves the saved choice', async () => {
  localStorage.setItem(REWARD_KEY, JSON.stringify(savedReward))
  runBoot()
  mockThemeLoad = Promise.reject(Error('Chunk unavailable'))
  const page = render(
    <RewardProvider>
      <Page />
    </RewardProvider>
  )
  await flush()
  expect(boot()).toBeNull()
  expect(page.container.textContent).toContain('Normal blog')
  expect(JSON.parse(localStorage.getItem(REWARD_KEY))).toEqual(savedReward)
})

test('a stalled startup exposes the blog after the deadline and cannot cause a late theme flash', async () => {
  localStorage.setItem(REWARD_KEY, JSON.stringify(savedReward))
  runBoot()
  let finishTheme
  mockThemeLoad = new Promise(resolve => {
    finishTheme = resolve
  })
  const page = render(
    <RewardProvider>
      <Page />
    </RewardProvider>
  )
  await flush()
  expect(boot()).toBe('loading')
  await act(async () => jest.advanceTimersByTime(REWARD_BOOT_TIMEOUT))
  expect(boot()).toBe('expired')
  await act(async () => finishTheme())
  expect(boot()).toBeNull()
  expect(page.container.textContent).toContain('Normal blog')
  expect(page.container.querySelector('.medium-newgame')).toBeNull()
  expect(JSON.parse(localStorage.getItem(REWARD_KEY))).toEqual(savedReward)
})
