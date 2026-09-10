import { fireEvent, render, screen } from '@testing-library/react'
import Catalog from '@/themes/medium/components/Catalog'

// Fixtures already use compact IDs. Keep navigation real without loading
// notion-utils' ESM dependency graph into this CommonJS Jest suite.
jest.mock('notion-utils', () => ({ uuidToId: id => id }))

const toc = [
  { id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', text: '第一章', indentLevel: 0 },
  { id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', text: '第一章细节', indentLevel: 1 },
  { id: 'cccccccccccccccccccccccccccccccc', text: '第二章', indentLevel: 0 },
  { id: 'dddddddddddddddddddddddddddddddd', text: '第二章细节', indentLevel: 1 }
]

describe('Medium reading directory', () => {
  it('keeps every chapter accessible while expanding the current chapter', () => {
    render(<Catalog toc={toc} />)
    expect(screen.getByRole('link', { name: '第一章' })).toBeVisible()
    expect(screen.getByRole('link', { name: '第一章细节' })).toBeVisible()
    expect(screen.getByRole('link', { name: '第二章' })).toBeVisible()
    expect(screen.queryByRole('link', { name: '第二章细节' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '第二章' }))
    expect(screen.getByRole('link', { name: '第二章细节' })).toBeVisible()
    expect(screen.queryByRole('link', { name: '第一章细节' })).not.toBeInTheDocument()
  })

  it('lets readers browse every subsection and return to the chapter view', () => {
    render(<Catalog toc={toc} />)
    fireEvent.click(screen.getByRole('button', { name: '展开全部' }))
    expect(screen.getByRole('link', { name: '第二章细节' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '收起' }))
    expect(screen.queryByRole('link', { name: '第二章细节' })).not.toBeInTheDocument()
  })

  it('reveals a heading inside nested Notion toggles before navigating', () => {
    const onNavigate = jest.fn()
    const { container } = render(<>
      <details><summary>补充</summary><details><summary>示例</summary><span id={toc[1].id}>正文</span></details></details>
      <Catalog toc={toc} onNavigate={onNavigate} />
    </>)
    fireEvent.click(screen.getByRole('link', { name: '第一章细节' }))
    container.querySelectorAll('details').forEach(toggle => expect(toggle.open).toBe(true))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('switches the directory when another article is opened', () => {
    const { rerender } = render(<Catalog toc={toc} />)
    rerender(<Catalog toc={[{ id: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', text: '新文章章节', indentLevel: 1 }]} />)
    expect(screen.getByRole('link', { name: '新文章章节' })).toHaveAttribute('aria-current', 'location')
    expect(screen.queryByRole('link', { name: '第一章' })).not.toBeInTheDocument()
  })
})
