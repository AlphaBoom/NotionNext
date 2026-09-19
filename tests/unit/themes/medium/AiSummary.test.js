import { fireEvent, render, screen } from '@testing-library/react'
import AiSummary from '@/themes/medium/components/AiSummary'

const preferenceKey = 'notionnext:ai-summary-collapsed'

beforeEach(() => window.localStorage.clear())

it('renders no section or spacing for a missing or blank summary', () => {
  const { container, rerender } = render(<AiSummary />)
  for (const summary of [undefined, null, '', ' \n ', [], {}]) {
    rerender(<AiSummary summary={summary} />)
    expect(container).toBeEmptyDOMElement()
  }
})

it('shows the supplied plain text and toggles its visibility without interpreting markup', () => {
  const { container } = render(<AiSummary summary={'第一段\n\n<script>alert(1)</script>'} />)
  const button = screen.getByRole('button', { name: 'AI 摘要 收起' })
  const content = document.getElementById(button.getAttribute('aria-controls'))
  expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(content).toBeVisible()
  expect(content.textContent).toBe('第一段\n\n<script>alert(1)</script>')
  expect(container.querySelector('script')).toBeNull()
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(content).not.toBeVisible()
  expect(window.localStorage.getItem(preferenceKey)).toBe('true')
  fireEvent.click(button)
  expect(content).toBeVisible()
  expect(window.localStorage.getItem(preferenceKey)).toBe('false')
})

it('remembers folding when visiting another article or refreshing', () => {
  const first = render(<AiSummary summary='文章一的摘要' />)
  fireEvent.click(screen.getByRole('button', { name: 'AI 摘要 收起' }))
  first.unmount()
  const second = render(<AiSummary summary='文章二的摘要' />)
  expect(screen.getByRole('button', { name: 'AI 摘要 展开' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByText('文章二的摘要')).not.toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'AI 摘要 展开' }))
  second.unmount()
  render(<AiSummary summary='文章二的摘要' />)
  expect(screen.getByText('文章二的摘要')).toBeVisible()
})

it('still folds when the browser blocks reading and writing local storage', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  render(<AiSummary summary='摘要' />)
  const button = screen.getByRole('button', { name: 'AI 摘要 收起' })
  fireEvent.click(button)
  expect(screen.getByText('摘要')).not.toBeVisible()
  fireEvent.click(button)
  expect(screen.getByText('摘要')).toBeVisible()
})
