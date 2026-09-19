import { render } from '@testing-library/react'
import SEO, { generateStructuredData } from '@/components/SEO'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/global', () => ({ useGlobal: () => ({ locale: {} }) }))
jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback) => ({
    LINK: 'https://example.com', TITLE: 'Example Blog', AUTHOR: 'Author'
  })[key] ?? fallback
}))

it('renders one noindex tag for an entry and restores indexing when navigating to an article', () => {
  useRouter.mockReturnValue({ route: '/[prefix]', query: {} })
  const siteInfo = { title: 'Example Blog', description: 'Blog', pageCover: '/cover.png' }
  const { container, rerender } = render(<SEO siteInfo={siteInfo} post={{
    title: 'Database entry', slug: 'entry', type: 'page', noIndex: true
  }} />)
  expect(container.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
  expect(container.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  rerender(<SEO siteInfo={siteInfo} post={{
    title: 'Article', slug: 'article/example', type: 'Post', noIndex: false
  }} />)
  expect(container.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
  expect(container.querySelector('meta[name="robots"]').content).toContain('follow, index')
})

describe('SEO structured data', () => {
  const siteInfo = {
    title: 'Example Blog',
    description: 'Example description',
    icon: '/logo.png'
  }

  it('generates BlogPosting data for published articles', () => {
    const data = generateStructuredData(
      {
        type: 'Post',
        title: 'Structured data in NotionNext',
        description: 'A test article',
        publishTime: '2026-07-01T00:00:00.000Z',
        modifiedTime: '2026-07-02T00:00:00.000Z',
        tags: ['notion', 'seo'],
        category: 'Engineering'
      },
      siteInfo,
      'https://example.com/article/structured-data',
      'https://example.com/cover.png',
      'Example Author',
      'https://example.com'
    )

    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Structured data in NotionNext',
      url: 'https://example.com/article/structured-data',
      datePublished: '2026-07-01T00:00:00.000Z',
      dateModified: '2026-07-02T00:00:00.000Z',
      keywords: 'notion, seo',
      articleSection: 'Engineering',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://example.com/article/structured-data'
      }
    })
    expect(data.publisher.logo.url).toBe('https://example.com/logo.png')
  })

  it('generates WebSite data for non-article pages', () => {
    const data = generateStructuredData(
      { type: 'Page' },
      siteInfo,
      'https://example.com/about',
      'https://example.com/cover.png',
      'Example Author',
      'https://example.com'
    )

    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Example Blog',
      url: 'https://example.com'
    })
  })
})
