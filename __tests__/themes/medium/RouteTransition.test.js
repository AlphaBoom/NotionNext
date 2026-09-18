import { act, fireEvent, render, screen } from '@testing-library/react'
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime'
import NotionLink from '@/components/NotionLink'
import RouteTransition from '@/themes/medium/components/RouteTransition'

let mockRouter
jest.mock('next/router', () => ({ useRouter: () => mockRouter }))

const skills = '/2066672153bb49c1a74ce0f754171251'
let finishNavigation

beforeEach(() => {
  const listeners = new Map()
  mockRouter = {
    pathname: '/[prefix]', asPath: '/database', query: { prefix: 'database' },
    locale: 'zh-CN', locales: ['zh-CN', 'en-US'], defaultLocale: 'zh-CN',
    basePath: '', isReady: true,
    beforePopState: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    events: {
      on: (event, fn) => {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event).add(fn)
      },
      off: (event, fn) => listeners.get(event)?.delete(fn),
      emit: (event, ...args) => listeners.get(event)?.forEach(fn => fn(...args))
    },
    push: jest.fn((url, as) => {
      mockRouter.events.emit('routeChangeStart', as || url, { shallow: false })
      return new Promise(resolve => {
        finishNavigation = () => {
          mockRouter.asPath = as || url
          mockRouter.events.emit('routeChangeComplete', as || url, { shallow: false })
          resolve(true)
        }
      })
    })
  }
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

function Page({ children }) {
  return (
    <RouterContext.Provider value={mockRouter}>
      <RouteTransition>
        {children || <>
          <h1>进入数据库</h1>
          <NotionLink href={skills}>赛马娘技能数据库</NotionLink>
          <input aria-label='保留的输入' defaultValue='原内容' />
        </>}
      </RouteTransition>
    </RouterContext.Provider>
  )
}

it('shows the destination before the page data resolves, then reveals the new page', async () => {
  const { rerender } = render(<Page />)
  const link = screen.getByRole('link', { name: '赛马娘技能数据库' })
  expect(mockRouter.prefetch).not.toHaveBeenCalled()
  fireEvent.click(link)

  expect(mockRouter.push).toHaveBeenCalledTimes(1)
  expect(mockRouter.asPath).toBe('/database') // Next commits the URL after data.
  expect(screen.queryByRole('heading', { name: '进入数据库' })).toBeNull()
  expect(screen.getByRole('heading', { name: '赛马娘技能数据库' })).toHaveFocus()
  expect(screen.getByRole('status')).toHaveTextContent('正在加载页面内容')
  expect(link).not.toBeVisible()

  await act(() => {
    finishNavigation()
    rerender(<Page><h1>技能列表</h1><p>正在加载数据库…</p></Page>)
    return Promise.resolve()
  })
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.getByRole('heading', { name: '技能列表' })).toBeVisible()
})

it.each([false, true])('restores content, input, focus and scroll on error (cancelled=%s)', cancelled => {
  render(<Page />)
  const link = screen.getByRole('link', { name: '赛马娘技能数据库' })
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: '尚未提交的输入' } })
  link.focus()
  jest.replaceProperty(window, 'scrollY', 420)
  fireEvent.click(link)
  act(() => mockRouter.events.emit('routeChangeError', { cancelled }, skills))
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.getByRole('textbox')).toBe(input)
  expect(input).toHaveValue('尚未提交的输入')
  expect(link).toHaveFocus()
  expect(window.scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 420, behavior: 'instant' })
})

it('ignores old navigation errors/completions while the newer destination loads', () => {
  render(<Page />)
  act(() => {
    mockRouter.events.emit('routeChangeStart', skills, {})
    mockRouter.events.emit('routeChangeStart', '/other-page', {})
    mockRouter.events.emit('routeChangeError', { cancelled: true }, skills)
    mockRouter.events.emit('routeChangeComplete', skills, {})
  })
  expect(screen.getByRole('status')).toBeVisible()
  expect(screen.getByRole('heading', { name: '正在打开页面' })).toBeVisible()
  act(() => mockRouter.events.emit('routeChangeComplete', '/other-page', {}))
  expect(screen.queryByRole('status')).toBeNull()
})

it('keeps filters, same-page anchors and modified clicks on the current page', () => {
  render(<Page />)
  act(() => {
    mockRouter.events.emit('routeChangeStart', '/database?filter=rare', { shallow: true })
    mockRouter.events.emit('routeChangeComplete', '/database?filter=rare', { shallow: true })
    mockRouter.events.emit('routeChangeStart', '/zh-CN/database#section', {})
  })
  fireEvent.click(screen.getByRole('link', { name: '赛马娘技能数据库' }), { ctrlKey: true })
  expect(mockRouter.push).not.toHaveBeenCalled()
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.getByRole('heading', { name: '进入数据库' })).toBeVisible()
})

it('matches locale-prefixed destinations and handles back/forward without a visible link', () => {
  render(<Page />)
  act(() => mockRouter.events.emit('routeChangeStart', `/zh-CN${skills}`, {}))
  expect(screen.getByRole('heading', { name: '赛马娘技能数据库' })).toBeVisible()
  act(() => mockRouter.events.emit('routeChangeComplete', `/zh-CN${skills}`, {}))
  act(() => mockRouter.events.emit('routeChangeStart', '/en-US/search?q=skill', {}))
  expect(screen.getByRole('heading', { name: '搜索结果' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('正在加载搜索结果')
})

it.each([
  { target: '_blank' }, { target: 'preview' }, { download: '' },
  { href: '#section' }, { href: 'https://example.com/skills' },
  { href: 'mailto:test@example.com' }
])('preserves native link semantics for %j', props => {
  render(<Page><NotionLink href={skills} {...props}>原生链接</NotionLink></Page>)
  fireEvent.click(screen.getByRole('link', { name: '原生链接' }))
  expect(mockRouter.push).not.toHaveBeenCalled()
  expect(screen.queryByRole('status')).toBeNull()
})

it('honors caller cancellation before starting navigation', () => {
  render(<Page><NotionLink href={skills} onClick={event => event.preventDefault()}>取消链接</NotionLink></Page>)
  fireEvent.click(screen.getByRole('link', { name: '取消链接' }))
  expect(mockRouter.push).not.toHaveBeenCalled()
  expect(screen.queryByRole('status')).toBeNull()
})
