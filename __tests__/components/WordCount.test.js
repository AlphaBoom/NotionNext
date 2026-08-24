import { render, screen } from '@testing-library/react'
import WordCount from '@/components/WordCount'

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        WORD_COUNT: 'Words',
        READ_TIME: 'Read Time',
        MINUTE: 'min'
      }
    }
  })
}))

describe('WordCount', () => {
  it('renders the word count and estimated reading time', () => {
    render(<WordCount wordCount={1234} readTime={4} />)

    expect(screen.getByText('Words')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()
    expect(screen.getByText('Read Time≈')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('min')).toBeInTheDocument()
  })
})
