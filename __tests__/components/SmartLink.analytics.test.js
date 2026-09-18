import { fireEvent, render, screen } from '@testing-library/react'
import SmartLink from '@/components/SmartLink'
import BlogPostCard from '@/themes/medium/components/BlogPostCard'

jest.mock('@/lib/config', () => ({
  siteConfig: key => ({ LINK: 'http://localhost', ANALYTICS_GOOGLE_ID: 'G-TEST', MEDIUM_POST_LIST_COVER: true, MEDIUM_POST_LIST_CATEGORY: true })[key]
}))
jest.mock('@/components/LazyImage', () => () => <span>Cover</span>)
jest.mock('@/components/NotionIcon', () => () => null)
jest.mock('@/components/TwikooCommentCount', () => () => null)
jest.mock('@/lib/db/notion/mapImage', () => ({ getCoverThumbnailUrl: url => url }))
jest.mock('@/themes/medium/components/WritingModeBadge', () => () => null)
jest.mock('next/link', () => ({ children, onClick, ...props }) => (
  <a {...props} onClick={event => { onClick?.(event); event.preventDefault() }}>{children}</a>
))

beforeEach(() => { window.gtag = jest.fn() })
afterEach(() => { delete window.gtag })

it('records one event for a nested card target, without leaking analytics props into the DOM', () => {
  render(<SmartLink href='/article/example' analytics={{ event: 'select_content', content_type: 'article', content_id: 'post-id', placement: 'post_card_title' }}>
    <span>Article</span>
  </SmartLink>)
  fireEvent.click(screen.getByText('Article'))
  expect(window.gtag).toHaveBeenCalledTimes(1)
  expect(window.gtag).toHaveBeenCalledWith('event', 'select_content', expect.objectContaining({ content_id: 'post-id', placement: 'post_card_title' }))
  expect(screen.getByRole('link')).toHaveAttribute('href', '/article/example')
  expect(screen.getByRole('link')).not.toHaveAttribute('analytics')
})

it('supports keyboard-style, modified and middle clicks, excluding right clicks', () => {
  render(<SmartLink href='/archive' analytics={{ event: 'navigation_click', placement: 'header' }}>Archive</SmartLink>)
  const link = screen.getByRole('link')
  fireEvent.click(link, { detail: 0 })
  fireEvent.click(link, { ctrlKey: true })
  fireEvent(link, new MouseEvent('auxclick', { bubbles: true, button: 1 }))
  fireEvent(link, new MouseEvent('auxclick', { bubbles: true, button: 2 }))
  expect(window.gtag).toHaveBeenCalledTimes(3)
})

it('preserves existing handlers, ignores cancelled links and leaves unmarked links alone', () => {
  const onClick = jest.fn(event => event.preventDefault())
  const { rerender } = render(<SmartLink href='/about' analytics={{ event: 'navigation_click', placement: 'header' }} onClick={onClick}>About</SmartLink>)
  fireEvent.click(screen.getByRole('link'))
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(window.gtag).not.toHaveBeenCalled()
  rerender(<SmartLink href='/about' onClick={onClick}>About</SmartLink>)
  fireEvent.click(screen.getByRole('link'))
  expect(onClick).toHaveBeenCalledTimes(2)
  expect(window.gtag).not.toHaveBeenCalled()
})

it('connects both actual card entry points while excluding its category link', () => {
  const { container } = render(<BlogPostCard post={{
    id: 'post-id', href: '/article/example', title: 'Example',
    pageCoverThumbnail: '/cover.png', category: 'Notes'
  }} />)
  fireEvent.click(screen.getByRole('link', { name: 'Example' }))
  fireEvent.click(container.querySelector('.medium-post-cover'))
  fireEvent.click(screen.getByRole('link', { name: 'Notes' }))
  expect(window.gtag).toHaveBeenCalledTimes(2)
  expect(window.gtag.mock.calls.map(call => call[2].placement)).toEqual(['post_card_title', 'post_card_cover'])
  expect(window.gtag.mock.calls.every(call => call[2].content_id === 'post-id')).toBe(true)
  expect(window.gtag.mock.calls.every(call => call[2].link_url === 'http://localhost/article/example')).toBe(true)
})
