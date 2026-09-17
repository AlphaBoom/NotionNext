jest.mock('notion-utils', () => ({
  idToUuid: id =>
    `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(
      16,
      20
    )}-${id.slice(20)}`
}))

import { convertInnerUrl } from '@/lib/db/notion/convertInnerUrl'

describe('convertInnerUrl', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState({}, '', 'http://localhost/notice')
  })

  it('maps notice links to published Page records from allLinkPages', () => {
    document.body.innerHTML = `
      <div id="notion-article">
        <a class="notion-link" href="https://www.notion.so/4aea95fb3fd5fcf81846aaaaaaaaaaaa" target="_blank">Links</a>
      </div>
    `

    convertInnerUrl({
      allPages: [
        {
          title: 'Links',
          type: 'Page',
          href: '/links',
          slug: 'links',
          short_id: 'fcf8-1846-aaaaaaaaaaaa'
        }
      ],
      lang: undefined
    })

    expect(document.querySelector('a.notion-link')).toHaveAttribute(
      'href',
      '/links'
    )
  })

  it('does not resolve Page links when only post navigation data is present', () => {
    const rawNotionUrl =
      'https://www.notion.so/4aea95fb3fd5fcf81846aaaaaaaaaaaa'
    document.body.innerHTML = `
      <div id="notion-article">
        <a class="notion-link" href="${rawNotionUrl}" target="_blank">Links</a>
      </div>
    `

    convertInnerUrl({
      allPages: [
        {
          title: 'Post only',
          type: 'Post',
          href: '/post-only',
          slug: 'post-only',
          short_id: '1111-2222-bbbbbbbbbbbb'
        }
      ],
      lang: undefined
    })

    expect(document.querySelector('a.notion-link')).toHaveAttribute(
      'href',
      rawNotionUrl
    )
  })

  it('keeps published Page slugs ahead of parent-path fallback', () => {
    document.body.innerHTML = `
      <div id="notion-article">
        <a class="notion-page-link" href="https://www.notion.so/4aea95fb3fd5fcf81846aaaaaaaaaaaa" target="_blank">Links</a>
      </div>
    `

    convertInnerUrl({
      allPages: [
        {
          title: 'Links',
          type: 'Page',
          href: '/links',
          slug: 'links',
          short_id: 'fcf8-1846-aaaaaaaaaaaa'
        }
      ],
      lang: undefined,
      innerPageUrlParentPath: true
    })

    expect(document.querySelector('a.notion-page-link')).toHaveAttribute(
      'href',
      '/links'
    )
  })

  it('can append unresolved Notion child pages to the current article path', () => {
    window.history.replaceState({}, '', 'http://localhost/article/parent-post')
    document.body.innerHTML = `
      <div id="notion-article">
        <a class="notion-page-link" href="https://www.notion.so/4aea95fb3fd5fcf81846aaaaaaaaaaaa" target="_blank">Child page</a>
      </div>
    `

    convertInnerUrl({
      allPages: [],
      lang: undefined,
      innerPageUrlParentPath: true
    })

    expect(document.querySelector('a.notion-page-link')).toHaveAttribute(
      'href',
      '/article/parent-post/4aea95fb3fd5fcf81846aaaaaaaaaaaa'
    )
  })

  it('strips query params before extracting Notion ID', () => {
    // Notion URLs often include ?pvs=4 which must not break ID extraction
    document.body.innerHTML = `
      <div id="notion-article">
        <a class="notion-link" href="https://www.notion.so/4aea95fb3fd5fcf81846aaaaaaaaaaaa?pvs=4" target="_blank">Links</a>
      </div>
    `

    convertInnerUrl({
      allPages: [
        {
          title: 'Links',
          type: 'Page',
          href: '/links',
          slug: 'links',
          short_id: 'fcf8-1846-aaaaaaaaaaaa'
        }
      ],
      lang: undefined
    })

    expect(document.querySelector('a.notion-link')).toHaveAttribute(
      'href',
      '/links'
    )
  })

  it('retains the hash fragment when resolving a Notion page ID', () => {
    document.body.innerHTML = `
      <div id="notion-article">
        <a class="notion-link" href="https://www.notion.so/4aea95fb3fd5fcf81846aaaaaaaaaaaa#section" target="_blank">Links</a>
      </div>
    `

    convertInnerUrl({
      allPages: [
        {
          title: 'Links',
          type: 'Page',
          href: '/links',
          slug: 'links',
          short_id: 'fcf8-1846-aaaaaaaaaaaa'
        }
      ],
      lang: undefined
    })

    expect(document.querySelector('a.notion-link')).toHaveAttribute(
      'href',
      '/links#section'
    )
  })
})

describe('section navigation', () => {
  const id = '3dd41bc4e39b8073a594f90c420c5f30'
  const hash = '#3dd41bc4e39b80a4aa3cc22d13c145ec'
  const allPages = [{ id, href: '/article/20260917' }]

  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost/article/20260917')
  })

  it('keeps same-article sections hash-only through repeated conversions', () => {
    document.body.innerHTML = `<div id="notion-article"><a class="notion-link" href="https://app.notion.com/p/${id}?pvs=24${hash}" target="_blank">Section</a></div>`
    convertInnerUrl({ allPages })
    convertInnerUrl({ allPages })
    const link = document.querySelector('a')
    expect(link).toHaveAttribute('href', hash)
    expect(link).not.toHaveAttribute('target')
  })

  it('preserves a native block fragment instead of mapping the current page again', () => {
    document.body.innerHTML = `<div id="notion-article"><a class="notion-link" href="${hash}" target="_blank">Section</a></div>`
    convertInnerUrl({ allPages })
    expect(document.querySelector('a')).toHaveAttribute('href', hash)
    expect(document.querySelector('a')).not.toHaveAttribute('target')
  })

  it('preserves cross-article fragments and the language prefix', () => {
    window.history.replaceState({}, '', 'http://localhost/en/another-post')
    document.body.innerHTML = `<div id="notion-article"><a class="notion-link" href="https://www.notion.so/AI-${id}${hash}" target="_blank">Section</a></div>`
    convertInnerUrl({ allPages, lang: 'en' })
    expect(document.querySelector('a')).toHaveAttribute(
      'href',
      '/en/article/20260917' + hash
    )
    expect(document.querySelector('a')).not.toHaveAttribute('target')
  })

  it('leaves external sites alone even if their path contains a known page UUID', () => {
    const href = `https://example.com/${id}${hash}`
    document.body.innerHTML = `<div id="notion-article"><a class="notion-link" href="${href}" target="_blank">External</a></div>`
    convertInnerUrl({ allPages })
    expect(document.querySelector('a')).toHaveAttribute('href', href)
    expect(document.querySelector('a')).toHaveAttribute('target', '_blank')
  })
})
