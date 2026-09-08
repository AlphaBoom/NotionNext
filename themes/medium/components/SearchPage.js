import { siteConfig } from '@/lib/config'
import { useRouter } from 'next/router'
import { useState } from 'react'
import BlogPostListPage from './BlogPostListPage'
import BlogPostListScroll from './BlogPostListScroll'
import CategoryGroup from './CategoryGroup'
import SearchInput from './SearchInput'
import TagGroups from './TagGroups'

export default function SearchPage(props) {
  const router = useRouter()
  const query = props.keyword ?? router.query?.keyword ?? router.query?.s
  const keyword = typeof query === 'string' ? query.trim() : ''
  const [status, setStatus] = useState({ pending: false, keyword: '' })
  const pending = status.pending || router.isFallback
  const count = props.postCount ?? props.posts?.length ?? 0
  const requested = status.pending ? status.keyword : keyword
  const List =
    props.searchClientSide || siteConfig('POST_LIST_STYLE') === 'scroll'
      ? BlogPostListScroll
      : BlogPostListPage
  return (
    <section className='medium-search-page' aria-label='文章搜索'>
      <div className='medium-search-panel'>
        <h1>搜索文章</h1>
        <SearchInput currentSearch={keyword} onStatusChange={setStatus} />
        {!keyword && !pending && (
          <div className='medium-search-discovery'>
            <TagGroups {...props} />
            <CategoryGroup {...props} />
          </div>
        )}
      </div>
      {(keyword || pending) && (
        <section
          className='medium-search-results'
          aria-label='搜索结果'
          aria-busy={pending}
        >
          {pending ? (
            <>
              <p className='medium-search-feedback' role='status'>
                <span className='medium-search-spinner' aria-hidden='true' />
                正在搜索「{requested}」…
              </p>
              <div className='medium-search-skeletons' aria-hidden='true'>
                {[0, 1].map(index => (
                  <div className='medium-search-skeleton' key={index}>
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className='medium-search-count' role='status'>
                「{keyword}」的搜索结果 <span>{count} 篇</span>
              </p>
              {count > 0 ? (
                <List {...props} key={keyword} searchKeyword={keyword} />
              ) : (
                <div className='medium-search-empty'>
                  <h2>没有找到相关文章</h2>
                  <p>试试更短的关键词，或检查一下拼写。</p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <style jsx global>{`
        #theme-medium .medium-search-page {
          padding: 36px 0 48px;
        }
        #theme-medium .medium-search-panel {
          margin: 0;
        }
        #theme-medium .medium-search-panel h1 {
          margin: 0 0 20px;
          color: var(--ink);
          font-size: 24px;
          font-weight: 600;
        }
        #theme-medium .medium-search-field {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 56px;
          padding: 6px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--wash);
          transition:
            border-color 150ms,
            box-shadow 150ms;
        }
        #theme-medium .medium-search-field:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--accent) 15%, transparent);
        }
        #theme-medium .medium-search-icon {
          flex: 0 0 21px;
          width: 21px;
          height: 21px;
          margin-left: 10px;
          color: var(--muted);
        }
        #theme-medium .medium-search-field input {
          flex: 1;
          min-width: 0;
          width: 100%;
          padding: 8px 0;
          border: 0;
          outline: 0;
          border-radius: 0;
          box-shadow: none;
          color: var(--ink);
          background: transparent;
          font: inherit;
          font-size: 16px;
          line-height: 1.5;
        }
        #theme-medium .medium-search-field input::placeholder {
          color: var(--muted);
          opacity: 1;
        }
        #theme-medium .medium-search-field input::-webkit-search-cancel-button {
          -webkit-appearance: none;
        }
        #theme-medium .medium-search-clear {
          flex: 0 0 32px;
          width: 32px;
          height: 38px;
          color: var(--muted);
          font: 24px/1 sans-serif;
          border-radius: 8px;
        }
        #theme-medium .medium-search-clear:hover {
          background: var(--line);
          color: var(--ink);
        }
        #theme-medium .medium-search-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex: 0 0 auto;
          min-height: 42px;
          padding: 9px 17px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: var(--accent);
          color: var(--paper);
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }
        #theme-medium .medium-search-submit:hover {
          color: var(--paper);
          filter: brightness(0.94);
        }
        #theme-medium .medium-search-submit:disabled {
          cursor: wait;
          opacity: 0.8;
        }
        #theme-medium .medium-search-error {
          margin: 10px 0 0;
          color: #bc4555;
          font-size: 13px;
        }
        .dark #theme-medium .medium-search-error {
          color: #ff9cab;
        }
        #theme-medium .medium-search-field[data-invalid='true'] {
          border-color: #bc4555;
        }
        #theme-medium .medium-search-results {
          margin-top: 30px;
        }
        #theme-medium .medium-search-count {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          align-items: baseline;
          margin: 0 0 18px;
          color: var(--ink);
          overflow-wrap: anywhere;
        }
        #theme-medium .medium-search-count span {
          color: var(--muted);
          white-space: nowrap;
          font-size: 13px;
        }
        #theme-medium .medium-search-feedback {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 18px;
          color: var(--accent);
          overflow-wrap: anywhere;
        }
        #theme-medium .medium-search-spinner {
          display: inline-block;
          flex: 0 0 16px;
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: medium-search-spin 0.7s linear infinite;
        }
        #theme-medium .medium-search-skeletons {
          display: grid;
          gap: 18px;
        }
        #theme-medium .medium-search-skeleton {
          display: grid;
          gap: 14px;
          padding: 28px 24px;
          min-height: 158px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: var(--paper);
        }
        #theme-medium .medium-search-skeleton span {
          display: block;
          height: 12px;
          border-radius: 5px;
          background: var(--wash);
          animation: medium-search-pulse 1.4s ease-in-out infinite alternate;
        }
        #theme-medium .medium-search-skeleton span:first-child {
          width: 28%;
          height: 9px;
        }
        #theme-medium .medium-search-skeleton span:nth-child(2) {
          width: 66%;
          height: 20px;
        }
        #theme-medium .medium-search-skeleton span:last-child {
          width: 86%;
        }
        #theme-medium .medium-search-empty {
          padding: 38px 24px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: var(--wash);
          text-align: center;
        }
        #theme-medium .medium-search-empty h2 {
          margin: 0 0 10px;
          font-size: 18px;
          font-weight: 500;
        }
        #theme-medium .medium-search-empty p {
          margin: 0;
          color: var(--muted);
        }
        #theme-medium .medium-search-highlight {
          padding: 0 0.06em;
          border-radius: 3px;
          background: #e0ebbb;
          color: #33432c;
          font-weight: inherit;
        }
        .dark #theme-medium .medium-search-highlight {
          background: #455944;
          color: #f0f6d8;
        }
        #theme-medium.medium-newgame .medium-search-page {
          padding-top: 0;
        }
        #theme-medium.medium-newgame .medium-search-field {
          background: #f0e5fa;
          border-color: #c3a4d9;
        }
        #theme-medium.medium-newgame .medium-search-field:focus-within {
          border-color: #ad4e95;
        }
        #theme-medium.medium-newgame .medium-search-field input {
          color: #493953;
        }
        #theme-medium.medium-newgame .medium-search-field input::placeholder {
          color: #776180;
        }
        #theme-medium.medium-newgame .medium-search-submit {
          background: #86519f;
          color: #fffaff;
        }
        #theme-medium.medium-newgame .medium-search-count,
        #theme-medium.medium-newgame .medium-search-feedback {
          align-self: flex-start;
          width: fit-content;
          max-width: 100%;
          padding: 7px 13px;
          border: 1px solid #ffffffcc;
          border-radius: 10px;
          background: #fffaffed;
          color: #624477;
        }
        #theme-medium.medium-newgame .medium-search-highlight {
          background: #fff0a3;
          color: #63406d;
        }
        #theme-medium.medium-newgame .medium-search-empty {
          background: #fffaff;
          color: #493953;
          border: 2px solid white;
          box-shadow: 4px 4px 0 #8e72b633;
        }
        @keyframes medium-search-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes medium-search-pulse {
          from {
            opacity: 0.45;
          }
          to {
            opacity: 1;
          }
        }
        @media (max-width: 640px) {
          #theme-medium .medium-search-page {
            padding-top: 24px;
          }
          #theme-medium .medium-search-panel h1 {
            font-size: 21px;
          }
          #theme-medium .medium-search-field {
            gap: 4px;
          }
          #theme-medium .medium-search-icon {
            display: none;
          }
          #theme-medium .medium-search-field input {
            padding-left: 7px;
          }
          #theme-medium .medium-search-submit {
            padding: 9px 11px;
          }
          #theme-medium .medium-search-results {
            margin-top: 24px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          #theme-medium .medium-search-spinner,
          #theme-medium .medium-search-skeleton span {
            animation: none;
          }
        }
      `}</style>
    </section>
  )
}
