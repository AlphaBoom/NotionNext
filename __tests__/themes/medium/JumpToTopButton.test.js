import { fireEvent, render, screen } from '@testing-library/react'
import { siteConfig } from '@/lib/config'
import JumpToTopButton from '@/themes/medium/components/JumpToTopButton'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn()
}))

describe('Medium JumpToTopButton', () => {
  beforeEach(() => {
    siteConfig.mockReturnValue(true)
    window.scrollTo = jest.fn()
  })

  it('renders the desktop control as one centered circular button', () => {
    const { container } = render(
      <JumpToTopButton className='hidden md:flex' />
    )

    const button = screen.getByRole('button', { name: 'Scroll to top' })
    expect(button).toHaveAttribute('id', 'jump-to-top')
    expect(button).toHaveClass('w-9', 'h-9', 'rounded-full', 'md:flex')
    expect(container.querySelectorAll('#jump-to-top')).toHaveLength(1)
  })

  it('renders the mobile bottom-bar control without fixed positioning', () => {
    render(<JumpToTopButton inline className='flex w-full' />)

    const button = screen.getByRole('button', { name: 'Scroll to top' })
    expect(button).not.toHaveAttribute('id')
    expect(button).toHaveClass('flex', 'w-full')
    expect(button).not.toHaveClass('fixed', 'rounded-full')

    fireEvent.click(button)
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    })
  })
})
