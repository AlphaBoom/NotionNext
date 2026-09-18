import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuItemDrop } from '@/themes/medium/components/MenuItemDrop'

jest.mock('@/lib/config', () => ({ siteConfig: key => ({ LINK: 'http://localhost', ANALYTICS_GOOGLE_ID: 'G-TEST' })[key] }))
jest.mock('next/link', () => ({ children, onClick, ...props }) => <a {...props} onClick={event => { onClick?.(event); event.preventDefault() }}>{children}</a>)

it('opens the database navigation by keyboard and closes it with Escape', async () => {
  render(<ul><MenuItemDrop link={{ name: '数据库', show: true, subMenus: [{ id: 'db', title: '赛马娘', href: '/database' }] }} /></ul>)
  const button = screen.getByRole('button', { name: '数据库' })
  expect(screen.queryByRole('link', { name: '赛马娘' })).not.toBeInTheDocument()
  button.focus()
  await userEvent.keyboard('{Enter}')
  const link = screen.getByRole('link', { name: '赛马娘' })
  expect(link).toHaveAttribute('href', '/database')
  link.focus()
  fireEvent.keyDown(link, { key: 'Escape' })
  expect(button).toHaveFocus()
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('link', { name: '赛马娘' })).not.toBeInTheDocument()
})

it('records navigation once, without counting opening the dropdown', () => {
  window.gtag = jest.fn()
  render(<ul><MenuItemDrop link={{ name: '数据库', show: true, subMenus: [{ id: 'db', title: '赛马娘', href: '/database' }] }} /></ul>)
  fireEvent.click(screen.getByRole('button', { name: '数据库' }))
  expect(window.gtag).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('link', { name: '赛马娘' }))
  expect(window.gtag).toHaveBeenCalledTimes(1)
  expect(window.gtag).toHaveBeenCalledWith('event', 'navigation_click', expect.objectContaining({ placement: 'header_submenu', link_url: 'http://localhost/database' }))
  delete window.gtag
})
