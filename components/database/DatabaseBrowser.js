import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { NotionContextProvider } from 'react-notion-x'
import { Property } from 'react-notion-x/build/third-party/collection'
import {
  compactId,
  textContent,
  unwrapRecord,
  visibleProperties
} from '@/lib/notion/database/model'
import { galleryVisibilityClassName } from '@/lib/notion/galleryVisibilityClassName'
import DatabaseControls from './DatabaseControls'
import useDatabase from './useDatabase'
import styles from './DatabaseBrowser.module.css'

function Cover({ source, title, contain }) {
  const [failed, setFailed] = useState(false)
  if (!source || failed) return null
  // Sources already pass through the site's Notion image mapper.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={title}
      loading='lazy'
      decoding='async'
      className={contain ? 'database-cover contain' : 'database-cover'}
      onError={() => setFailed(true)}
    />
  )
}

function Cell({ row, field, collection }) {
  return (
    <Property
      propertyId={field.id}
      schema={collection.schema[field.id]}
      data={row.properties?.[field.id]}
      block={row}
      collection={collection}
      linkToTitlePage={false}
    />
  )
}

function DatabaseRows({ rows, collection, view, ctx, onNavigate }) {
  const fields = visibleProperties(collection, view)
  const href = row => ctx.mapPageUrl?.(row.id) || `/${compactId(row.id)}`
  const title = row => textContent(row.properties?.title) || '无标题'
  const rowLink = (row, children, className) => (
    <Link
      href={href(row)}
      prefetch={false}
      onClick={onNavigate}
      aria-label={`打开 ${title(row)}`}
      className={className}
    >
      {children}
    </Link>
  )
  if (view.type === 'table')
    return (
      <div
        className='database-table-scroll'
        role='region'
        aria-label='数据库表格，可横向滚动'
        tabIndex={0}
      >
        <table className='database-table'>
          <thead>
            <tr>
              {fields.map(field => (
                <th
                  key={field.id}
                  scope='col'
                  style={{
                    minWidth: Math.min(500, Math.max(100, field.width || 160))
                  }}
                >
                  {field.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {fields.map(field => (
                  <td
                    key={field.id}
                    className={
                      (field.wrap ?? view.format?.table_wrap)
                        ? 'database-wrap'
                        : ''
                    }
                  >
                    {field.type === 'title' ? (
                      rowLink(
                        row,
                        <Cell row={row} field={field} collection={collection} />
                      )
                    ) : (
                      <Cell row={row} field={field} collection={collection} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  const card = row => {
    const cover = view.format?.gallery_cover || { type: 'page_cover' }
    let source = cover.type === 'none' ? null : row.format?.page_cover
    if (cover.type === 'property')
      source = row.properties?.[cover.property]?.[0]?.[1]?.find(
        value => value[0] === 'a'
      )?.[1]
    if (source) source = ctx.mapImageUrl?.(source, row) || source
    const hideTitle = galleryVisibilityClassName(view).includes('hide-titles')
    const cardFields = fields.filter(field => field.type !== 'title')
    return (
      <article key={row.id} className='database-card'>
        {view.type !== 'list' &&
          source &&
          rowLink(
            row,
            <Cover
              source={source}
              title={title(row)}
              contain={view.format?.gallery_cover_aspect === 'contain'}
            />,
            'database-cover-link'
          )}
        {(!hideTitle || !source) &&
          rowLink(row, title(row), 'database-card-title')}
        {cardFields.length > 0 && (
          <dl>
            {cardFields.map(field => (
              <div key={field.id}>
                <dt>{field.name}</dt>
                <dd>
                  <Cell row={row} field={field} collection={collection} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </article>
    )
  }
  if (view.type === 'board') {
    const property =
      view.format?.board_columns_by?.property ||
      view.format?.collection_group_by?.property
    const groups = new Map()
    rows.forEach(row => {
      const group = textContent(row.properties?.[property]) || '未分组'
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group).push(row)
    })
    return (
      <div className='database-board'>
        {[...groups].map(([name, items]) => (
          <section key={name}>
            <h4>
              {name} <small>已加载 {items.length}</small>
            </h4>
            {items.map(card)}
          </section>
        ))}
      </div>
    )
  }
  return (
    <div
      className={`database-cards ${view.type === 'list' ? 'database-list' : ''}`}
      data-size={view.format?.gallery_cover_size || 'medium'}
    >
      {rows.map(card)}
    </div>
  )
}

export default function DatabaseBrowser({ block, ctx, collection }) {
  const rootRef = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    if (rootRef.current) observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [])
  const db = useDatabase(block, collection, visible)
  const views = block.view_ids
    .map(id => unwrapRecord(ctx.recordMap.collection_view?.[id]))
    .filter(Boolean)
  const view =
    views.find(view => compactId(view.id) === compactId(db.query.viewId)) ||
    views[0]
  const map = useMemo(
    () => ({
      ...ctx.recordMap,
      block: { ...ctx.recordMap.block, ...db.result?.recordMap.block }
    }),
    [ctx.recordMap, db.result]
  )
  const rows = (db.result?.blockIds || [])
    .map(id => unwrapRecord(db.result.recordMap.block[id]))
    .filter(Boolean)
  const sourceUrl = `https://www.notion.so/${compactId(block.id)}?v=${compactId(db.query.viewId)}`
  const supported = ['table', 'gallery', 'list', 'board'].includes(view?.type)
  const hideHeading =
    block.format?.hide_inline_collection_name ||
    view?.format?.hide_linked_collection_name
  return (
    <NotionContextProvider {...ctx} recordMap={map}>
      <section
        ref={rootRef}
        className={styles.root}
        aria-label={textContent(collection.name) || '数据库'}
      >
        {!hideHeading && (
          <div className='database-heading'>
            <h3>{textContent(collection.name) || '数据库'}</h3>
            <a href={sourceUrl} target='_blank' rel='noreferrer'>
              在 Notion 中查看 ↗
            </a>
          </div>
        )}
        <div className='database-views' role='group' aria-label='数据库视图'>
          {views.map(item => (
            <button
              key={item.id}
              type='button'
              aria-pressed={item.id === view?.id}
              onClick={() =>
                db.updateQuery({
                  viewId: item.id,
                  search: '',
                  filters: [],
                  sorts: []
                })
              }
            >
              {item.name || '默认视图'}
            </button>
          ))}
        </div>
        {supported && (
          <DatabaseControls
            query={db.query}
            schema={collection.schema}
            onChange={db.updateQuery}
            id={`database-${compactId(block.id)}`}
          />
        )}
        {!supported && (
          <p>
            这个视图请
            <a href={sourceUrl} target='_blank' rel='noreferrer'>
              在 Notion 中查看
            </a>
            。
          </p>
        )}
        {supported && rows.length > 0 && (
          <DatabaseRows
            rows={rows}
            collection={collection}
            view={view}
            ctx={ctx}
            onNavigate={db.remember}
          />
        )}
        {db.busy && !rows.length && (
          <div className='database-placeholder' role='status'>
            正在加载条目…
          </div>
        )}
        {!db.busy && !db.error && db.result && !rows.length && (
          <div className='database-placeholder'>
            {db.result.hasMore
              ? '这一批没有可显示的条目，可继续加载。'
              : '没有符合条件的条目。'}
            {(db.query.search || db.query.filters.length > 0) &&
              '可以调整筛选条件或搜索词。'}
          </div>
        )}
        {db.error && (
          <div className='database-error' role='alert'>
            <p>
              {db.error === 'CURSOR_EXPIRED'
                ? '这次浏览的结果已过期，请刷新结果后继续。'
                : db.error === 'RATE_LIMITED'
                  ? '请求较多，请稍后重试。'
                  : '数据库暂时无法加载。'}
            </p>
            <button
              type='button'
              onClick={() => {
                void (db.error === 'CURSOR_EXPIRED' ? db.refresh() : db.retry())
              }}
              disabled={db.busy}
            >
              {db.error === 'CURSOR_EXPIRED' ? '刷新结果' : '重试'}
            </button>
            <a href={sourceUrl} target='_blank' rel='noreferrer'>
              在 Notion 中查看 ↗
            </a>
          </div>
        )}
        {db.result?.incomplete && (
          <p role='status'>
            Notion 限制了本次查询的结果数量，请添加筛选条件缩小范围。
          </p>
        )}
        {db.result && (
          <footer className='database-footer'>
            <span aria-live='polite'>
              已加载 {rows.length} 条
              {db.result.total != null ? ` / 共 ${db.result.total} 条` : ''}
              {!db.result.hasMore && !db.result.incomplete
                ? ' · 已全部加载'
                : ''}
            </span>
            {db.result.hasMore && !db.error && (
              <button
                type='button'
                onClick={() => {
                  void db.loadMore()
                }}
                disabled={db.busy}
              >
                {db.busy ? '加载中…' : '加载更多'}
              </button>
            )}
          </footer>
        )}
      </section>
    </NotionContextProvider>
  )
}
