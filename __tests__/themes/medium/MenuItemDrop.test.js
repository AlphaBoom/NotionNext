import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuItemDrop } from '@/themes/medium/components/MenuItemDrop'

jest.mock('@/components/SmartLink', () => ({ __esModule: true, default: ({ children, ...props }) => <a {...props}>{children}</a> }))

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
