import { trackInteraction } from '@/lib/plugins/interactionAnalytics'
import { siteConfig } from '@/lib/config'

jest.mock('@/lib/config', () => ({ siteConfig: jest.fn() }))

beforeEach(() => {
  siteConfig.mockImplementation(key => key === 'ANALYTICS_GOOGLE_ID' ? 'G-TEST' : false)
  window.gtag = jest.fn()
  window.history.replaceState({}, '', '/article/example?token=secret#heading')
})

afterEach(() => {
  delete window.gtag
  delete window['ga-disable-G-TEST']
  window.history.replaceState({}, '', '/')
})

it('only sends allowlisted identifiers and strips URL parameters and hashes', () => {
  trackInteraction('navigation_click', {
    placement: 'header', link_url: '/about?email=private@example.com#details',
    clipboard: 'private text', user_id: 'visitor', method: 'private@example.com'
  })
  expect(window.gtag).toHaveBeenCalledTimes(1)
  expect(window.gtag).toHaveBeenCalledWith('event', 'navigation_click', {
    send_to: 'G-TEST', page_location: 'http://localhost/article/example',
    placement: 'header', link_url: 'http://localhost/about'
  })
})

it('redacts search paths and titles, and keeps only the origin of an external target', () => {
  window.history.replaceState({}, '', '/search/private%40example.com?q=secret')
  trackInteraction('navigation_click', { link_url: 'https://elsewhere.test/private/token?secret=1' })
  expect(window.gtag.mock.calls[0][2]).toEqual({
    send_to: 'G-TEST', page_location: 'http://localhost/search',
    page_title: 'Search', link_url: 'https://elsewhere.test'
  })
})

it('does not send events when GA is missing, disabled or opted out', () => {
  delete window.gtag
  expect(trackInteraction('copy_link')).toBe(false)
  window.gtag = jest.fn()
  siteConfig.mockReturnValue(false)
  expect(trackInteraction('copy_link')).toBe(false)
  siteConfig.mockImplementation(key => key === 'ANALYTICS_GOOGLE_ID' ? 'G-TEST' : true)
  expect(trackInteraction('copy_link')).toBe(false)
  siteConfig.mockImplementation(key => key === 'ANALYTICS_GOOGLE_ID' ? 'G-TEST' : false)
  window['ga-disable-G-TEST'] = true
  expect(trackInteraction('copy_link')).toBe(false)
  expect(window.gtag).not.toHaveBeenCalled()
})

it('isolates analytics failures and never manufactures page views or automatic clicks', () => {
  expect(trackInteraction('page_view')).toBe(false)
  expect(trackInteraction('click')).toBe(false)
  expect(window.gtag).not.toHaveBeenCalled()
  window.gtag.mockImplementation(() => { throw new Error('Blocked analytics') })
  expect(() => trackInteraction('share_click', { method: 'twitter' })).not.toThrow()
  expect(trackInteraction('share_click', { method: 'twitter' })).toBe(false)
})
