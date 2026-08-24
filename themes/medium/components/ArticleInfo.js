import LazyImage from '@/components/LazyImage'
import SmartLink from '@/components/SmartLink'
import { useGlobal } from '@/lib/global'
import { siteConfig } from '@/lib/config'
import NotionIcon from '@/components/NotionIcon'

/**
 * 文章详情页介绍
 * @param {*} props
 * @returns
 */
export default function ArticleInfo(props) {
  const { post, siteInfo } = props
  const { locale } = useGlobal()
  const showArticleStats =
    typeof post?.wordCount === 'number' &&
    typeof post?.readTime === 'number'

  return (<>
        {/* title */}
        <h1 className="text-3xl pt-12  dark:text-gray-300">{siteConfig('POST_TITLE_ICON') && <NotionIcon icon={post?.pageIcon} />}{post?.title}</h1>

        {/* meta */}
        <section className="py-2 items-center text-sm  px-1">
            <div className='flex h-7 items-center justify-between gap-4 overflow-hidden text-gray-500 py-1 dark:text-gray-600'>
                <div className='flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap'>
                    <span className='shrink-0 whitespace-nowrap'> <i className='far fa-calendar mr-2' />{post?.publishDay}</span>
                    <span className='mx-1 shrink-0'>|</span>
                    <span className='min-w-0 truncate'><i className='far fa-calendar-check mr-2' />{post?.lastEditedDay}</span>
                    <div className="hidden busuanzi_container_page_pv font-light mr-2 whitespace-nowrap">
                        <i className="mr-1 fas fa-eye" /><span className="busuanzi_value_page_pv" />
                    </div>
                </div>
                {showArticleStats && (
                    <div className='flex shrink-0 items-center whitespace-nowrap'>
                        <span><i className='fas fa-file-word mr-1' />{locale.COMMON.WORD_COUNT}: {post.wordCount}</span>
                        <span className='mx-2 shrink-0'>|</span>
                        <span><i className='fas fa-clock mr-1' />{locale.COMMON.READ_TIME}: {post.readTime} {locale.COMMON.MINUTE}</span>
                    </div>
                )}
            </div>
            <SmartLink href="/about" passHref legacyBehavior>
                <div className='flex pt-2'>
                    <LazyImage src={siteInfo?.icon} className='rounded-full cursor-pointer' width={22} height={22} alt={siteConfig('AUTHOR')} />

                    <div className="mr-3 ml-2 my-auto text-green-500 cursor-pointer">
                        {siteConfig('AUTHOR')}
                    </div>
                </div>
            </SmartLink>
        </section>
    </>)
}
