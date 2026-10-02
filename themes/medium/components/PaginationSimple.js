import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useGlobal } from '@/lib/global'

// Keep the first/last page and a small window around the current page.
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const start = Math.max(2, Math.min(current - 1, total - 4))
  const end = Math.min(total - 1, Math.max(current + 1, 5))
  const pages = [1]
  if (start > 2) pages.push('start-gap')
  for (let page = start; page <= end; page++) pages.push(page)
  if (end < total - 1) pages.push('end-gap')
  pages.push(total)
  return pages
}

const PaginationSimple = ({ page = 1, totalPage }) => {
  const { locale } = useGlobal()
  const router = useRouter()
  const totalValue = Number(totalPage)
  const total = Number.isFinite(totalValue)
    ? Math.max(1, Math.floor(totalValue))
    : 1
  const current = Math.min(total, Math.max(1, Math.floor(Number(page) || 1)))
  const prefix = router.asPath
    .split(/[?#]/)[0]
    .replace(/\/page\/[1-9]\d*\/?$/, '')
    .replace(/\/$/, '')
  const href = number => ({
    pathname: number === 1 ? prefix || '/' : `${prefix}/page/${number}`,
    query: router.query.s ? { s: router.query.s } : {}
  })

  if (total <= 1) return null

  const direction = (number, label, rel) =>
    number < 1 || number > total ? (
      <span className='medium-pagination-direction' aria-disabled='true'>
        {label}
      </span>
    ) : (
      <SmartLink
        className='medium-pagination-direction'
        href={href(number)}
        prefetch={false}
        rel={rel}
      >
        {label}
      </SmartLink>
    )

  return (
    <nav className='medium-pagination' aria-label='文章分页'>
      {direction(current - 1, locale.PAGINATION.PREV, 'prev')}
      <ol className='medium-pagination-pages'>
        {pageNumbers(current, total).map(number => (
          <li key={number}>
            {typeof number === 'string' ? (
              <span className='medium-pagination-gap' aria-hidden='true'>
                …
              </span>
            ) : number === current ? (
              <span
                className='medium-pagination-number'
                aria-current='page'
                aria-label={`第 ${number} 页`}
              >
                {number}
              </span>
            ) : (
              <SmartLink
                className='medium-pagination-number'
                href={href(number)}
                prefetch={false}
                aria-label={`第 ${number} 页`}
              >
                {number}
              </SmartLink>
            )}
          </li>
        ))}
      </ol>
      <span
        className='medium-pagination-indicator'
        aria-label={`第 ${current} 页，共 ${total} 页`}
      >
        {current} / {total}
      </span>
      {direction(current + 1, locale.PAGINATION.NEXT, 'next')}
    </nav>
  )
}

export default PaginationSimple
