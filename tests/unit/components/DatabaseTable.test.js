import { act, fireEvent, render, screen } from '@testing-library/react'
import DatabaseTable from '@/components/database/DatabaseTable'

it('fits each column in a narrow viewport and offers wrapping and horizontal navigation', () => {
  let available = 300
  let onResize
  const OriginalObserver = global.ResizeObserver
  global.ResizeObserver = class {
    constructor(callback) {
      onResize = callback
    }
    observe() {}
    disconnect() {}
  }
  jest
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockImplementation(() => available)
  jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(480)
  try {
    const fields = [
      { id: 'title', type: 'title', name: '技能名称' },
      { id: 'description', type: 'text', name: '技能描述', width: 500 }
    ]
    const { container } = render(
      <DatabaseTable
        fields={fields}
        rows={[
          {
            id: 'skill',
            title: '可以完整阅读的名称',
            description: '可以通过换行阅读的完整技能描述'
          }
        ]}
        renderCell={(row, field) => row[field.id]}
      />
    )
    const table = screen.getByRole('table')
    const region = screen.getByRole('region', {
      name: '数据库表格，可横向滚动'
    })
    expect(screen.getByText('可以通过换行阅读的完整技能描述')).toBeVisible()
    expect(region).toHaveAccessibleDescription('左右滑动查看其余列')
    expect(screen.getByRole('button', { name: '自动换行' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(
      [...container.querySelectorAll('col')].every(
        col => parseFloat(col.style.width) <= available
      )
    ).toBe(true)
    expect(parseFloat(table.style.width)).toBeGreaterThan(available)
    expect(screen.getByRole('button', { name: '向左滚动表格' })).toBeDisabled()
    const scrollBy = jest.fn()
    region.scrollBy = scrollBy
    fireEvent.click(screen.getByRole('button', { name: '向右滚动表格' }))
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number) })
    )
    region.scrollLeft = 180
    fireEvent.scroll(region)
    expect(screen.getByRole('button', { name: '向左滚动表格' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '向右滚动表格' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '自动换行' }))
    expect(screen.getByRole('button', { name: '自动换行' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    available = 260
    act(() => onResize())
    expect(
      [...container.querySelectorAll('col')].every(
        col => parseFloat(col.style.width) <= available
      )
    ).toBe(true)
  } finally {
    global.ResizeObserver = OriginalObserver
  }
})
