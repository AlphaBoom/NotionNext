import { fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/router'
import PaginationSimple from '@/themes/medium/components/PaginationSimple'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: { PAGINATION: { PREV: '上一页', NEXT: '下一页' } }
  })
}))
jest.mock(
  '@/components/SmartLink',
  () =>
    function MockSmartLink({ href, prefetch, children, ...rest }) {
      return (
        <a
          href={`${href.pathname}${href.query.s ? `?s=${encodeURIComponent(href.query.s)}` : ''}`}
          data-prefetch={String(prefetch)}
          {...rest}
        >
          {children}
        </a>
      )
    }
)

beforeEach(() => useRouter.mockReturnValue({
  asPath: '/',
  query: {},
  push: jest.fn().mockResolvedValue(true)
}))

test.each([0, 1])('does not show pagination for %s pages', totalPage => {
  render(<PaginationSimple totalPage={totalPage} />)
  expect(screen.queryByRole('navigation')).toBeNull()
})

test.each([
  '',
  '/category/C%2B%2B',
  '/tag/%E6%B8%B8%E6%88%8F',
  '/search/C%2B%2B'
])('page links preserve the list path and query: %s', prefix => {
  useRouter.mockReturnValue({
    asPath: `${prefix}/page/2?s=C%2B%2B#posts`,
    query: { s: 'C++' }
  })
  const { container } = render(<PaginationSimple page='2' totalPage={4} />)
  expect(screen.getByRole('link', { name: '第 1 页' })).toHaveAttribute(
    'href',
    `${prefix || '/'}?s=C%2B%2B`
  )
  expect(screen.getByRole('link', { name: '下一页' })).toHaveAttribute(
    'href',
    `${prefix}/page/3?s=C%2B%2B`
  )
  expect(container.querySelector('[aria-current="page"]')).toHaveTextContent(
    '2'
  )
  expect(
    [...container.querySelectorAll('a')].every(
      link => link.dataset.prefetch === 'false'
    )
  ).toBe(true)
})

test('large lists offer nearby pages and the first/last page without a long number row', () => {
  render(<PaginationSimple page={10} totalPage={30} />)
  expect(screen.getByRole('link', { name: '第 1 页' })).toHaveAttribute(
    'href',
    '/'
  )
  expect(screen.getByRole('link', { name: '第 30 页' })).toHaveAttribute(
    'href',
    '/page/30'
  )
  expect(screen.getByRole('link', { name: '第 9 页' })).toBeTruthy()
  expect(screen.getByRole('link', { name: '第 11 页' })).toBeTruthy()
  expect(screen.getAllByRole('listitem')).toHaveLength(7)
})

test.each([
  [1, '上一页'],
  [4, '下一页']
])('page %s cannot navigate beyond the list', (page, label) => {
  render(<PaginationSimple page={page} totalPage={4} />)
  expect(screen.queryByRole('link', { name: label })).toBeNull()
  expect(screen.getByText(label)).toHaveAttribute('aria-disabled', 'true')
})

test.each([
  '',
  '/category/C%2B%2B',
  '/tag/%E6%B8%B8%E6%88%8F',
  '/search/C%2B%2B'
])('the mobile selector jumps to a chosen page and preserves filters: %s', prefix => {
  const push = jest.fn().mockResolvedValue(true)
  useRouter.mockReturnValue({
    asPath: `${prefix}/page/2?s=C%2B%2B&theme=newgame#posts`,
    query: { s: 'C++' },
    push
  })
  render(<PaginationSimple page={2} totalPage={4} />)
  const selector = screen.getByRole('combobox', { name: '选择页码，共 4 页' })
  expect(selector).toHaveValue('2')
  expect(screen.getAllByRole('option')).toHaveLength(4)
  fireEvent.change(selector, { target: { value: '3' } })
  expect(push).toHaveBeenLastCalledWith({
    pathname: `${prefix}/page/3`,
    query: { s: 'C++', theme: 'newgame' }
  })
  fireEvent.change(selector, { target: { value: '1' } })
  expect(push).toHaveBeenLastCalledWith({
    pathname: prefix || '/',
    query: { s: 'C++', theme: 'newgame' }
  })
})

test('selecting the current page does not reload it', () => {
  render(<PaginationSimple totalPage={3} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
  expect(useRouter().push).not.toHaveBeenCalled()
})
