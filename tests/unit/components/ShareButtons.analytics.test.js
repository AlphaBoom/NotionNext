import { act, fireEvent, render, screen } from '@testing-library/react'
import ShareButtons from '@/components/ShareButtons'

jest.mock('@/lib/config', () => ({
  siteConfig: key => ({ LINK: 'http://localhost', ANALYTICS_GOOGLE_ID: 'G-TEST', POSTS_SHARE_SERVICES: 'twitter,link,wechat' })[key]
}))
jest.mock('@/lib/global', () => ({ useGlobal: () => ({ locale: { COMMON: { URL_COPIED: 'Copied', SCAN_QR_CODE: 'Scan' } } }) }))

const post = { id: 'post-id', title: 'Article', tags: [] }
beforeEach(() => {
  window.gtag = jest.fn()
  jest.spyOn(window, 'open').mockImplementation(() => null)
  jest.spyOn(window, 'alert').mockImplementation(() => {})
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn() } })
})
afterEach(() => { delete window.gtag; delete navigator.clipboard })

it('opens sharing synchronously even if analytics fails, recording an attempt rather than completion', () => {
  window.gtag.mockImplementation(() => { throw new Error('Offline') })
  render(<ShareButtons post={post} />)
  fireEvent.click(screen.getByRole('button', { name: 'twitter' }))
  expect(window.open).toHaveBeenCalledTimes(1)
  expect(window.open.mock.invocationCallOrder[0]).toBeLessThan(window.gtag.mock.invocationCallOrder[0])
  expect(window.gtag).toHaveBeenCalledWith('event', 'share_click', expect.objectContaining({ method: 'twitter', content_id: 'post-id' }))
})

it('only records a link copy after the clipboard write succeeds', async () => {
  let finish
  navigator.clipboard.writeText.mockReturnValue(new Promise(resolve => { finish = resolve }))
  render(<ShareButtons post={post} />)
  fireEvent.click(screen.getByRole('button', { name: 'link' }))
  expect(window.gtag).not.toHaveBeenCalled()
  await act(async () => finish())
  expect(window.gtag).toHaveBeenCalledTimes(1)
  expect(window.gtag).toHaveBeenCalledWith('event', 'copy_link', expect.objectContaining({ content_id: 'post-id', placement: 'share_bar' }))
  expect(window.gtag.mock.calls[0][2]).not.toHaveProperty('clipboard')
})

it('does not count failed copies or merely hovering over a sharing button', async () => {
  navigator.clipboard.writeText.mockRejectedValue(new Error('Denied'))
  render(<ShareButtons post={post} />)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'link' })))
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'wechat' }))
  expect(window.gtag).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'wechat' }))
  expect(window.gtag).toHaveBeenCalledTimes(1)
  expect(window.gtag.mock.calls[0][1]).toBe('share_click')
})
