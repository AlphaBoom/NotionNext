import React from 'react'
import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server.node'
import { hydrateRoot } from 'react-dom/client'
import Loadable from 'next/dist/shared/lib/loadable.shared-runtime'
import { DynamicLayout, getBaseLayoutByTheme } from '@/themes/theme'

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: { THEME: 'medium' },
  LAYOUT_MAPPINGS: { '/': 'LayoutIndex', '/[prefix]': 'LayoutSlug' }
}))
jest.mock('@/lib/utils', () => ({
  isBrowser: true,
  getQueryParam: () => null
}))
jest.mock('next/router', () => ({
  useRouter: () => ({ asPath: '/article/test' })
}))
jest.mock('@/themes/medium', () => ({
  LayoutBase: ({ children }) => <main>{children}</main>,
  LayoutSlug: ({ post }) => <article>{post.title}</article>,
  LayoutIndex: () => <section>Posts</section>
}))
// Jest has no webpack module IDs. Supply one while retaining Next's real
// dynamic loader, preloadReady and useSyncExternalStore behavior.
jest.mock('next/dynamic', () => {
  const dynamic = jest.requireActual('next/dynamic').default
  return {
    __esModule: true,
    default: (loader, options) =>
      dynamic(loader, { ...options, modules: ['medium-layout-test'] })
  }
})

test('a cold client preloads the article layout before hydrating the server HTML', async () => {
  // Next calls preloadReady before the first component render.
  await Loadable.preloadReady(['medium-layout-test'])
  const Base = getBaseLayoutByTheme('medium')
  const page = (
    <Base>
      <DynamicLayout
        theme='medium'
        layoutName='LayoutSlug'
        post={{ title: 'Article content' }}
      />
    </Base>
  )
  const serverHtml = '<main><article>Article content</article></main>'
  expect(renderToString(page)).toBe(serverHtml)

  const container = document.createElement('div')
  container.innerHTML = serverHtml
  document.body.appendChild(container)
  const onRecoverableError = jest.fn()
  const originalArticle = container.querySelector('article')
  let root
  await act(async () => {
    root = hydrateRoot(container, page, { onRecoverableError })
  })
  expect(onRecoverableError).not.toHaveBeenCalled()
  expect(container.querySelector('article')).toBe(originalArticle)
  await act(async () => root.unmount())
  container.remove()
})
