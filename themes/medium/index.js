import Comment from '@/components/Comment'
import Live2D from '@/components/Live2D'
import replaceSearchResult from '@/components/Mark'
import NotionPage from '@/components/NotionPage'
import ShareBar from '@/components/ShareBar'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isBrowser } from '@/lib/utils'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { createContext, useContext, useEffect, useState } from 'react'
import ArticleAround from './components/ArticleAround'
import ArticleInfo from './components/ArticleInfo'
import AiSummary from './components/AiSummary'
import { ArticleLock } from './components/ArticleLock'
import BlogArchiveItem from './components/BlogArchiveItem'
import BlogPostBar from './components/BlogPostBar'
import BlogPostListPage from './components/BlogPostListPage'
import BlogPostListScroll from './components/BlogPostListScroll'
import BottomMenuBar from './components/BottomMenuBar'
import Catalog from './components/Catalog'
import CategoryGroup from './components/CategoryGroup'
import CategoryItem from './components/CategoryItem'
import Footer from './components/Footer'
import JumpToTopButton from './components/JumpToTopButton'
import RouteTransition from './components/RouteTransition'
import SearchInput from './components/SearchInput'
import TagGroups from './components/TagGroups'
import TagItemMini from './components/TagItemMini'
import TocDrawer from './components/TocDrawer'
import TopNavBar from './components/TopNavBar'
import HomeIntro from './components/HomeIntro'
import RewardProvider, { useReward } from './components/RewardProvider'
import CONFIG from './config'
import { Style } from './style'

// 主题全局状态
const ThemeGlobalMedium = createContext()
export const useMediumGlobal = () => useContext(ThemeGlobalMedium)

/**
 * 基础布局
 * 正文居中，宽屏目录位于外侧留白区域
 * @returns {JSX.Element}
 * @constructor
 */
const LayoutBase = props => (
  <RewardProvider><MediumLayout {...props} /></RewardProvider>
)

const MediumLayout = props => {
  const { active: rewardActive } = useReward()
  const { children, post, lock } = props
  const { fullWidth } = useGlobal()
  const router = useRouter()
  const [tocVisible, changeTocVisible] = useState(false)
  const hasToc = !lock && post?.toc?.length > 0

  useEffect(() => {
    changeTocVisible(false)
  }, [router.asPath])

  return (
    <ThemeGlobalMedium.Provider value={{ tocVisible, changeTocVisible }}>
      <Style />
      <div id='theme-medium' data-reward-theme={rewardActive ? 'new-game' : undefined} className={`medium-site ${rewardActive ? 'medium-newgame' : ''} ${post ? 'medium-reading' : ''} ${fullWidth ? 'medium-full-width' : ''}`}>
        <a className='medium-skip-link' href='#container-inner'>跳至内容</a>
        <TopNavBar {...props} />
        <div id='wrapper' className='medium-layout'>
          <main id='container-inner' tabIndex={-1}>
            <RouteTransition>
              <BlogPostBar {...props} />
              {children}
            </RouteTransition>
          </main>
          {hasToc && !fullWidth && (
            <aside className='medium-desktop-toc' aria-label='文章目录'>
              <Catalog key={post.id} toc={post.toc} />
            </aside>
          )}
        </div>
        {hasToc && <TocDrawer post={post} />}
        <JumpToTopButton className='medium-desktop-top' />
        <Footer />
        <BottomMenuBar {...props} />
        <Live2D />
      </div>
    </ThemeGlobalMedium.Provider>
  )
}

/**
 * 首页
 * 首页就是一个博客列表
 * @param {*} props
 * @returns
 */
const LayoutIndex = props => {
  return (
    <>
      <HomeIntro {...props} />
      <LayoutPostList {...props} />
    </>
  )
}

/**
 * 博客列表
 * @returns
 */
const LayoutPostList = props => {
  return (
    <>
      {siteConfig('POST_LIST_STYLE') === 'page' ? (
        <BlogPostListPage {...props} />
      ) : (
        <BlogPostListScroll {...props} />
      )}
    </>
  )
}

/**
 * 文章详情
 * @param {*} props
 * @returns
 */
const LayoutSlug = props => {
  const { post, prev, next, lock, validPassword } = props
  const router = useRouter()
  const showCategory = Boolean(
    siteConfig('MEDIUM_POST_DETAIL_CATEGORY', null, CONFIG) && post?.category
  )
  const showTags = Boolean(
    siteConfig('MEDIUM_POST_DETAIL_TAG', null, CONFIG) && post?.tagItems?.length
  )
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000
  useEffect(() => {
    // 404
    if (!post) {
      setTimeout(
        () => {
          if (isBrowser) {
            const article = document.querySelector(
              '#article-wrapper #notion-article'
            )
            if (!article) {
              router.push('/404').then(() => {
                console.warn('找不到页面', router.asPath)
              })
            }
          }
        },
        waiting404
      )
    }
  }, [post])

  return (
    <div>
      {/* 文章锁 */}
      {lock && <ArticleLock validPassword={validPassword} />}

      {!lock && post && (
        <div>
          {/* 文章信息 */}
          <ArticleInfo {...props} />

          {/* Notion文章主体 */}
          <article id='article-wrapper' aria-label={post.title}>
            <AiSummary summary={post.aiSummary} />
            {post && <NotionPage post={post} />}
          </article>

          {/* 文章底部区域  */}
          <section className='medium-article-end'>
            {/* 分享 */}
            <ShareBar post={post} />
            {/* 文章分类和标签信息 */}
            {(showCategory || showTags) && (
              <div className='flex justify-between'>
                {showCategory && <CategoryItem category={post.category} />}
                {showTags && <div>
                  {post.tagItems.map(tag => (
                    <TagItemMini key={tag.name} tag={tag} />
                  ))}
                </div>}
              </div>
            )}
            {/* 上一篇下一篇文章 */}
            {post?.type === 'Post' && <ArticleAround prev={prev} next={next} />}
            {/* 评论区 */}
            {post.type === 'Post' && post.status === 'Published' && (
              <Comment frontMatter={post} />
            )}
          </section>

        </div>
      )}
    </div>
  )
}

/**
 * 搜索
 * @param {*} props
 * @returns
 */
const LayoutSearch = props => {
  const { locale } = useGlobal()
  const { keyword } = props
  const router = useRouter()
  const currentSearch = keyword || router?.query?.s

  useEffect(() => {
    if (isBrowser) {
      replaceSearchResult({
        doms: document.getElementById('posts-wrapper'),
        search: keyword,
        target: {
          element: 'span',
          className: 'text-red-500 border-b border-dashed'
        }
      })
    }
  }, [])

  return (
    <>
      {/* 搜索导航栏 */}
      <div className='medium-search-panel py-12'>
        <div className='pb-4 w-full'>{locale.NAV.SEARCH}</div>
        <SearchInput currentSearch={currentSearch} {...props} />
        {!currentSearch && (
          <>
            <TagGroups {...props} />
            <CategoryGroup {...props} />
          </>
        )}
      </div>

      {/* 文章列表 */}
      {currentSearch && (
        <div>
          {siteConfig('POST_LIST_STYLE') === 'page' ? (
            <BlogPostListPage {...props} />
          ) : (
            <BlogPostListScroll {...props} />
          )}
        </div>
      )}
    </>
  )
}

/**
 * 归档
 * @param {*} props
 * @returns
 */
const LayoutArchive = props => {
  const { archivePosts } = props
  return (
    <>
      <div className='medium-archive mb-10 pb-20 md:py-12 py-3 min-h-full'>
        {Object.keys(archivePosts)?.map(archiveTitle => (
          <BlogArchiveItem
            key={archiveTitle}
            archiveTitle={archiveTitle}
            archivePosts={archivePosts}
          />
        ))}
      </div>
    </>
  )
}

/**
 * 404
 * @param {*} props
 * @returns
 */
const Layout404 = () => {
  return (
    <div className='flex min-h-[60vh] w-full flex-col items-center justify-center px-6 text-center'>
      <div className='text-6xl font-bold text-gray-300 dark:text-gray-600'>404</div>
      <h1 className='mt-6 text-xl font-medium text-gray-800 dark:text-gray-200'>
        未找到页面
      </h1>
      <p className='mt-3 max-w-xl leading-7 text-gray-500 dark:text-gray-400'>
        这可能是链接发生了变化，或页面暂时无法从 Notion 加载。您可以返回首页，
        也可以前往 Notion 公开页面寻找原始内容。
      </p>
      <div className='mt-8 flex flex-wrap justify-center gap-3'>
        <SmartLink
          href='/'
          className='inline-flex h-10 items-center justify-center rounded-md bg-gray-800 px-5 text-sm leading-none text-white transition-colors hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white'>
          返回首页
        </SmartLink>
        <a
          href='https://alphaboom.notion.site/alphaboom/32c16f6bb85e4e949eba49dee2d73a5c?v=e7c99abff7b6444683b94893a4f838a1'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex h-10 items-center justify-center rounded-md border border-gray-300 px-5 text-sm leading-none text-gray-700 transition-colors hover:border-gray-500 hover:text-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-400 dark:hover:text-white'>
          访问 Notion 公开页面
        </a>
      </div>
    </div>
  )
}

/**
 * 分类列表
 * @param {*} props
 * @returns
 */
const LayoutCategoryIndex = props => {
  const { categoryOptions } = props
  const { locale } = useGlobal()
  return (
    <>
      <div className='py-10'>
        <div className='dark:text-gray-200 mb-5'>
          <i className='mr-4 fas fa-th' />
          {locale.COMMON.CATEGORY}:
        </div>
        <div id='category-list' className='duration-200 flex flex-wrap'>
          {categoryOptions?.map(category => {
            return (
              <SmartLink
                key={category.name}
                href={`/category/${category.name}`}
                passHref
                legacyBehavior>
                <div
                  className={
                    'hover:text-black dark:hover:text-white dark:text-gray-300 dark:hover:bg-gray-600 px-5 cursor-pointer py-2 hover:bg-gray-100'
                  }>
                  <i className='mr-4 fas fa-folder' />
                  {category.name}({category.count})
                </div>
              </SmartLink>
            )
          })}
        </div>
      </div>
    </>
  )
}

/**
 * 标签列表
 * @param {*} props
 * @returns
 */
const LayoutTagIndex = props => {
  const { tagOptions } = props
  const { locale } = useGlobal()
  return (
    <>
      <div className='py-10'>
        <div className='dark:text-gray-200 mb-5'>
          <i className='mr-4 fas fa-tag' />
          {locale.COMMON.TAGS}:
        </div>
        <div id='tags-list' className='duration-200 flex flex-wrap'>
          {tagOptions?.map(tag => {
            return (
              <div key={tag.name} className='p-2'>
                <TagItemMini key={tag.name} tag={tag} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export {
  Layout404,
  LayoutArchive,
  LayoutBase,
  LayoutCategoryIndex,
  LayoutIndex,
  LayoutPostList,
  LayoutSearch,
  LayoutSlug,
  LayoutTagIndex,
  CONFIG as THEME_CONFIG
}
