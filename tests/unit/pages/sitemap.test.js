/** @jest-environment node */
import { getServerSideProps } from '@/pages/sitemap.xml'
import { getServerSideSitemap } from 'next-sitemap'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

jest.mock('@/lib/db/SiteDataApi', () => ({ fetchGlobalAllData: jest.fn() }))
jest.mock('next-sitemap', () => ({ getServerSideSitemap: jest.fn(() => ({ props: {} })) }))
jest.mock('@/lib/config', () => ({ siteConfig: (key, fallback) => fallback }))

it('includes an edited article with its modification timestamp in the live sitemap', async () => {
  fetchGlobalAllData.mockResolvedValue({
    siteInfo: { link: 'https://example.com' },
    NOTION_CONFIG: {},
    allPages: [{
      slug: 'article/example', status: 'Published',
      publishDay: '2026-09-13', lastEditedDate: '2026-09-16T05:01:02.216Z'
    }]
  })
  const ctx = { res: { setHeader: jest.fn() } }
  await getServerSideProps(ctx)
  expect(getServerSideSitemap).toHaveBeenCalledWith(ctx, expect.arrayContaining([
    expect.objectContaining({
      loc: 'https://example.com/article/example', lastmod: '2026-09-16T05:01:02.216Z'
    })
  ]))
})
