import dynamic from 'next/dynamic'
import mediumZoom from '@fisch0920/medium-zoom'
import { useEffect, useRef } from 'react'
import 'katex/dist/katex.min.css'
import { mapImgUrl } from '@/lib/notion/mapImage'
import { isBrowser } from '@/lib/utils'
import { siteConfig } from '@/lib/config'
import { NotionRenderer } from 'react-notion-x'

// Notion渲染
// const NotionRenderer = dynamic(() => import('react-notion-x').then(async (m) => {
//   return m.NotionRenderer
// }), {
//   ssr: false
// })

const Code = dynamic(() =>
  import('react-notion-x/build/third-party/code').then(async (m) => {
    return m.Code
  }), { ssr: false }
)

// 公式
const Equation = dynamic(() =>
  import('@/components/Equation').then(async (m) => {
    // 化学方程式
    await import('@/lib/mhchem')
    return m.Equation
  }), { ssr: false }
)

const Pdf = dynamic(
  () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
  {
    ssr: false
  }
)

// https://github.com/txs
// import PrismMac from '@/components/PrismMac'
const PrismMac = dynamic(() => import('@/components/PrismMac'), {
  ssr: false
})

/**
 * tweet嵌入
 */
const TweetEmbed = dynamic(() => import('react-tweet-embed'), {
  ssr: false
})

const Collection = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then((m) => m.Collection), { ssr: true }
)

const Modal = dynamic(
  () => import('react-notion-x/build/third-party/modal').then((m) => m.Modal), { ssr: false }
)

const Tweet = ({ id }) => {
  return <TweetEmbed tweetId={id} />
}

const NotionPage = ({ post, className }) => {
  useEffect(() => {
    autoScrollToTarget()
  }, [])

  const zoom = typeof window !== 'undefined' && mediumZoom({
    container: '.notion-viewport',
    background: 'rgba(0, 0, 0, 0.2)',
    margin: getMediumZoomMargin()
  })
  const zoomRef = useRef(zoom ? zoom.clone() : null)

  useEffect(() => {
    // 将相册gallery下的图片加入放大功能
    if (siteConfig('POST_DISABLE_GALLERY_CLICK')) {
      setTimeout(() => {
        if (isBrowser) {
          const imgList = document?.querySelectorAll('.notion-collection-card-cover img')
          if (imgList && zoomRef.current) {
            for (let i = 0; i < imgList.length; i++) {
              (zoomRef.current).attach(imgList[i])
            }
          }

          const cards = document.getElementsByClassName('notion-collection-card')
          for (const e of cards) {
            e.removeAttribute('href')
          }
        }
      }, 800)
    }

    /**
     * 处理页面内连接跳转
     * 如果链接就是当前网站，则不打开新窗口访问
     */
    if (isBrowser) {
      const currentURL = window.location.origin + window.location.pathname
      const allAnchorTags = document.getElementsByTagName('a') // 或者使用 document.querySelectorAll('a') 获取 NodeList
      for (const anchorTag of allAnchorTags) {
        if (anchorTag?.target === '_blank') {
          const hrefWithoutQueryHash = anchorTag.href.split('?')[0].split('#')[0]
          const hrefWithRelativeHash = currentURL.split('#')[0] + anchorTag.href.split('#')[1]

          if (currentURL === hrefWithoutQueryHash || currentURL === hrefWithRelativeHash) {
            anchorTag.target = '_self'
          }
        }
      }
    }
  }, [])

  if (!post || !post.blockMap) {
    return <>{post?.summary || ''}</>
  }

  return <div id='notion-article' className={`mx-auto overflow-hidden ${className || ''}`}>
    <NotionRenderer
      recordMap={post.blockMap}
      mapPageUrl={mapPageUrl}
      mapImageUrl={mapImgUrl}
      components={{
        Code,
        Collection,
        Equation,
        Modal,
        Pdf,
        Tweet
      }} />

      <PrismMac/>

  </div>
}

/**
 * 根据url参数自动滚动到指定区域
 */
const autoScrollToTarget = () => {
  setTimeout(() => {
    // 跳转到指定标题
    const needToJumpToTitle = window.location.hash
    if (needToJumpToTitle) {
      const tocNode = document.getElementById(window.location.hash.substring(1))
      if (tocNode && tocNode?.className?.indexOf('notion') > -1) {
        tocNode.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
  }, 180)
}

/**
 * 将id映射成博文内部链接。
 * @param {*} id
 * @returns
 */
const mapPageUrl = id => {
  // return 'https://www.notion.so/' + id.replace(/-/g, '')
  id = id.replace(/-/g, '')
  if ([
    'f21f69678d6445b1805c09af356d59d5',
    'd2d28bd552f546a6b5e99e0914543504'
  ].includes(id)) {
    return '#' + id
  }
  return '/' + id
}

/**
 * 缩放
 * @returns
 */
function getMediumZoomMargin() {
  const width = window.innerWidth

  if (width < 500) {
    return 8
  } else if (width < 800) {
    return 20
  } else if (width < 1280) {
    return 30
  } else if (width < 1600) {
    return 40
  } else if (width < 1920) {
    return 48
  } else {
    return 72
  }
}
export default NotionPage
