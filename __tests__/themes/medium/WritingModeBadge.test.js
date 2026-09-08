import { act, fireEvent, render, screen } from '@testing-library/react'
import WritingModeBadge from '@/themes/medium/components/WritingModeBadge'
import ArticleInfo from '@/themes/medium/components/ArticleInfo'
import ArticleAround from '@/themes/medium/components/ArticleAround'

jest.mock('@/components/SmartLink', () => ({ __esModule: true, default: ({ children, ...props }) => <a {...props}>{children}</a> }))
jest.mock('@/components/NotionIcon', () => ({ __esModule: true, default: () => null }))
jest.mock('@/lib/config', () => ({ siteConfig: () => false }))
jest.mock('@/lib/global', () => ({ useGlobal: () => ({ locale: { COMMON: { MINUTE: '分钟' } } }) }))

// jsdom does not supply PointerEvent; retain real pointer type and coordinates in gestures.
beforeAll(() => {
  if (!window.PointerEvent) {
    window.PointerEvent = class extends MouseEvent {
      constructor(type, options = {}) {
        super(type, options)
        this.pointerType = options.pointerType || 'mouse'
      }
    }
  }
})

afterEach(() => jest.useRealTimers())

it('keeps the explanation hidden until activation and dismisses it without navigating', () => {
  render(<WritingModeBadge writingMode='ai-generated' />)
  const button = screen.getByRole('button', { name: 'AI 生成' })
  expect(screen.queryByText('本文由 AI 生成。')).not.toBeInTheDocument()
  fireEvent.click(button)
  expect(screen.getByRole('tooltip')).toHaveTextContent('本文由 AI 生成。')
  expect(button).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
  fireEvent.keyDown(button, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.click(button)
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.click(button)
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'false')
})

it('keeps the touch explanation open through release and the browser-synthesized click', () => {
  jest.useFakeTimers()
  render(<WritingModeBadge writingMode='ai-polished' />)
  const button = screen.getByRole('button', { name: 'AI 润色' })
  fireEvent.pointerDown(button, { pointerType: 'touch', clientX: 30, clientY: 30 })
  act(() => jest.advanceTimersByTime(499))
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  act(() => jest.advanceTimersByTime(1))
  fireEvent.pointerUp(button, { pointerType: 'touch' })
  fireEvent.click(button)
  expect(screen.getByRole('tooltip')).toHaveTextContent('本文由作者撰写，AI 辅助润色。')
  fireEvent.scroll(window)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})

it('cancels long presses during scrolling, cancelled gestures and unmount', () => {
  jest.useFakeTimers()
  const { unmount } = render(<WritingModeBadge writingMode='ai-generated' />)
  const button = screen.getByRole('button', { name: 'AI 生成' })
  for (const cancel of [
    () => fireEvent.pointerMove(button, { pointerType: 'touch', clientX: 30, clientY: 60 }),
    () => fireEvent.pointerCancel(button, { pointerType: 'touch' })
  ]) {
    fireEvent.pointerDown(button, { pointerType: 'touch', clientX: 30, clientY: 30 })
    cancel()
    act(() => jest.advanceTimersByTime(600))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  }
  fireEvent.pointerDown(button, { pointerType: 'touch' })
  unmount()
  expect(jest.getTimerCount()).toBe(0)
})

it('places the article badge alongside its heading and renders no standalone notice', () => {
  const { container, rerender } = render(<ArticleInfo post={{ title: '测试文章', publishDay: '2026-9-8', writingMode: 'ai-generated', wordCount: 1080, readTime: 4 }} />)
  const heading = screen.getByRole('heading', { name: '测试文章' })
  expect(heading.parentElement).toContainElement(screen.getByRole('button', { name: 'AI 生成' }))
  expect(container.querySelector('.medium-article-meta')).toHaveTextContent('2026-9-8')
  expect(container.querySelector('.medium-writing-notice')).toBeNull()
  expect(screen.queryByText('本文由 AI 生成。')).not.toBeInTheDocument()
  rerender(<ArticleInfo post={{ title: '测试文章', publishDay: '2026-9-8' }} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('keeps previous and next article links separate from interactive badges', () => {
  render(<ArticleAround prev={{ title: '上一篇', href: '/previous', writingMode: 'ai-polished' }} next={{ title: '下一篇', href: '/next', writingMode: 'ai-generated' }} />)
  for (const button of screen.getAllByRole('button')) {
    expect(button.closest('a')).toBeNull()
    fireEvent.click(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.keyDown(button, { key: 'Escape' })
  }
  expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/previous', '/next'])
})
