import SmartLink from '@/components/SmartLink'
import WritingModeBadge from './WritingModeBadge'

/**
 * 归档分组
 * @param {*} param0
 * @returns
 */
export default function BlogArchiveItem({ archiveTitle, archivePosts }) {
  return (
    <div key={archiveTitle} className='medium-archive-group'>
      <div
        id={archiveTitle}
        className='medium-archive-month pt-16 pb-4 text-3xl dark:text-gray-300'
      >
        {archiveTitle}
      </div>
      <ul className='medium-archive-list'>
        {archivePosts[archiveTitle]?.map(post => {
          return (
            <li
              key={post.id}
              className='medium-archive-row border-l-2 p-1 text-xs md:text-base items-center  hover:scale-x-105 hover:border-gray-500 dark:hover:border-gray-300 dark:border-gray-400 transform duration-500'
            >
              <div id={post?.publishDay} className='medium-archive-entry'>
                <span className='medium-archive-date text-gray-400'>
                  {post.date?.start_date}
                </span>{' '}
                <SmartLink
                  passHref
                  href={post?.href}
                  className='medium-archive-link dark:text-gray-400  dark:hover:text-gray-300 overflow-x-hidden hover:underline cursor-pointer text-gray-600'
                >
                  {post.title}
                </SmartLink>{' '}
                <WritingModeBadge writingMode={post.writingMode} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
