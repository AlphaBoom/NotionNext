import BLOG from '@/blog.config'
import NotionPage from '@/components/NotionPage'
import { getPostBlocks } from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { Feed } from 'feed'
import fs from 'fs'
import ReactDOMServer from 'react-dom/server'
import { decryptEmail } from '@/lib/plugins/mailEncrypt'
import {
  getWritingModeSummary,
  prependWritingModeNotice
} from './writingMode.mjs'

export function shouldGenerateRssForLocale({
  locale,
  defaultLocale = BLOG.LANG
} = {}) {
  return !locale || locale === defaultLocale
}

function publicationDate(post) {
  for (const value of [post.publishDate, post.publishDay]) {
    if (value == null || value === '') continue
    const date = new Date(value)
    if (Number.isFinite(date.getTime())) return date
  }
  return null
}

/** RSS membership and ordering do not depend on the homepage's latestPosts. */
export function getRssPosts(allPages = []) {
  return allPages
    .filter(
      post =>
        post.type === 'Post' &&
        post.status === 'Published' &&
        publicationDate(post)
    )
    .sort((a, b) => publicationDate(b).getTime() - publicationDate(a).getTime())
    .slice(0, 20)
}

async function createFeedContent(post) {
  if (post.password) return getWritingModeSummary(post)

  const rawBlockMap = await getPostBlocks(post.id, 'rss-content', {
    cacheVersion: post.lastEditedDate
  })
  const blockMap = adapterNotionBlockMap(rawBlockMap)
  const hasRoot = Object.keys(blockMap?.block || {}).some(
    id => id.replace(/-/g, '') === String(post.id).replace(/-/g, '')
  )
  if (!hasRoot) {
    throw new Error(`RSS content is unavailable for ${post.id}`)
  }
  blockMap.block = formatNotionBlock(blockMap.block)
  const content = ReactDOMServer.renderToString(
    <NotionPage post={{ ...post, blockMap }} />
  )
  const propertyRow =
    /<div class="notion-collection-row"><div class="notion-collection-row-body"><div class="notion-collection-row-property"><div class="notion-collection-column-title"><svg.*?class="notion-collection-column-title-icon">.*?<\/svg><div class="notion-collection-column-title-body">.*?<\/div><\/div><div class="notion-collection-row-value">.*?<\/div><\/div><\/div><\/div>/g
  return prependWritingModeNotice(
    content.replace(propertyRow, ''),
    post.writingMode
  )
}

/** One full-content generator for the runtime endpoint and static exports. */
export async function buildRssFeeds({
  NOTION_CONFIG = {},
  siteInfo = {},
  allPages = []
}) {
  const posts = getRssPosts(allPages)
  const link = (siteInfo.link || BLOG.LINK).replace(/\/+$/, '')
  const subPath = String(NOTION_CONFIG.SUB_PATH || BLOG.SUB_PATH || '').replace(
    /^\/+|\/+$/g,
    ''
  )
  const baseUrl = `${link}/${subPath ? `${subPath}/` : ''}`
  const author = NOTION_CONFIG.AUTHOR || BLOG.AUTHOR
  const feed = new Feed({
    title: siteInfo.title || author,
    description: siteInfo.description || BLOG.BIO,
    link: baseUrl,
    language: NOTION_CONFIG.LANG || BLOG.LANG,
    favicon: `${link}/favicon.png`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${author}`,
    author: {
      name: author,
      email: decryptEmail(NOTION_CONFIG.CONTACT_EMAIL || BLOG.CONTACT_EMAIL),
      link
    }
  })

  // Bound cold Notion reads while preserving publication order in every format.
  for (let start = 0; start < posts.length; start += 4) {
    const batch = posts.slice(start, start + 4)
    const contents = await Promise.all(batch.map(createFeedContent))
    batch.forEach((post, index) => {
      feed.addItem({
        title: post.title,
        link: new URL((post.href || post.slug).replace(/^\/+/, ''), baseUrl)
          .href,
        description: getWritingModeSummary(post),
        content: contents[index],
        date: publicationDate(post)
      })
    })
  }

  return { xml: feed.rss2(), atomXml: feed.atom1(), json: feed.json1() }
}

/** Static files are only generated for EXPORT; hosted sites use /api/rss. */
export async function generateRss(props) {
  const content = await buildRssFeeds(props)
  fs.mkdirSync('./public/rss', { recursive: true })
  fs.writeFileSync('./public/rss/feed.xml', content.xml)
  fs.writeFileSync('./public/rss/atom.xml', content.atomXml)
  fs.writeFileSync('./public/rss/feed.json', content.json)
}
