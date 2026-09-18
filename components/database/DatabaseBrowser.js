import { useEffect, useMemo, useRef, useState } from 'react'
import { NotionContextProvider } from 'react-notion-x'
import { Property } from 'react-notion-x/build/third-party/collection'
import {
  DATABASE_PREVIEW_LIMIT,
  DATABASE_DISPLAY_STEP,
  isSupportedView,
  mergeRecordMaps,
  textContent,
  unwrapRecord,
  visibleProperties
} from '@/lib/notion/database/model'
import { galleryVisibilityClassName } from '@/lib/notion/galleryVisibilityClassName'
import { publicNotionUrl } from '@/lib/notion/database/publicUrl'
import DatabaseTable from './DatabaseTable'
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

function DatabaseRows({ rows, collection, view, ctx }) {
  const fields = visibleProperties(collection, view)
  const href = row => publicNotionUrl(row.id)
  const title = row => textContent(row.properties?.title) || '无标题'
  const rowLink = (row, children, className) => (
    <a
      href={href(row)}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`在 Notion 中打开 ${title(row)}（新标签页）`}
      className={className}
    >
      {children}
    </a>
  )
  if (view.type === 'table')
    return (
      <DatabaseTable
        rows={rows}
        fields={fields}
        renderCell={(row, field) =>
          field.type === 'title' ? (
            rowLink(
              row,
              <Cell row={row} field={field} collection={collection} />
            )
          ) : (
            <Cell row={row} field={field} collection={collection} />
          )
        }
      />
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
              {name} <small>预览 {items.length}</small>
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

// Record references inside properties also go to public Notion, not blog routes.
function PublicPageLink({ children, ...props }) {
  return (
    <a {...props} target='_blank' rel='noopener noreferrer'>
      {children}
    </a>
  )
}
const mapPreviewPageUrl = id => publicNotionUrl(id)

export default function DatabaseBrowser({ block, ctx, collection }) {
  const rootRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [displayCount, setDisplayCount] = useState(DATABASE_DISPLAY_STEP)
  useEffect(() => {
    setSearch('')
    setDisplayCount(DATABASE_DISPLAY_STEP)
  }, [block.id])
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
  const initialView = unwrapRecord(
    ctx.recordMap.collection_view?.[block.view_ids?.[0]]
  )
  const db = useDatabase(
    block.id,
    visible && isSupportedView(initialView?.type)
  )
  const view = db.result?.view || initialView
  const previewCollection = db.result?.collection || collection
  const supported = isSupportedView(view?.type)
  const map = useMemo(() => {
    const merged = mergeRecordMaps(ctx.recordMap, db.result?.recordMap)
    merged.collection[previewCollection.id] = { value: previewCollection }
    return merged
  }, [ctx.recordMap, db.result, previewCollection])
  const previewComponents = useMemo(
    () => ({ ...ctx.components, PageLink: PublicPageLink }),
    [ctx.components]
  )
  const rows = (db.result?.blockIds || [])
    .slice(0, DATABASE_PREVIEW_LIMIT)
    .map(id => unwrapRecord(db.result.recordMap.block[id]))
    .filter(Boolean)
  const term = search.trim().normalize('NFKC').toLocaleLowerCase()
  const matches = term
    ? rows.filter(row =>
        textContent(row.properties?.title)
          .normalize('NFKC')
          .toLocaleLowerCase()
          .includes(term)
      )
    : rows
  const displayed = matches.slice(0, displayCount)
  const sourceUrl = publicNotionUrl(block.id, view?.id)
  const hideHeading =
    block.format?.hide_inline_collection_name ||
    view?.format?.hide_linked_collection_name
  return (
    <NotionContextProvider
      {...ctx}
      recordMap={map}
      mapPageUrl={mapPreviewPageUrl}
      components={previewComponents}
    >
      <section
        ref={rootRef}
        className={styles.root}
        aria-label={textContent(previewCollection.name) || '数据库预览'}
      >
        <div className='database-heading'>
          {!hideHeading && (
            <h3>{textContent(previewCollection.name) || '数据库'}</h3>
          )}
          <a href={sourceUrl} target='_blank' rel='noopener noreferrer'>
            在 Notion 中打开 ↗
          </a>
        </div>
        <p className='database-preview-note'>
          此处仅提供最多 {DATABASE_PREVIEW_LIMIT}{' '}
          条预览，完整搜索、筛选和条目详情请前往 Notion。
        </p>
        {!supported && <p>此视图请在 Notion 中查看。</p>}
        {supported && db.result && (
          <div className='database-toolbar'>
            <label className='database-search'>
              <span className='sr-only'>搜索预览条目</span>
              <input
                type='search'
                placeholder='搜索预览条目…'
                value={search}
                maxLength={200}
                onChange={event => {
                  setSearch(event.target.value)
                  setDisplayCount(DATABASE_DISPLAY_STEP)
                }}
              />
            </label>
            {search && (
              <button
                type='button'
                onClick={() => {
                  setSearch('')
                  setDisplayCount(DATABASE_DISPLAY_STEP)
                }}
              >
                清除搜索
              </button>
            )}
          </div>
        )}
        {supported && displayed.length > 0 && (
          <DatabaseRows
            rows={displayed}
            collection={previewCollection}
            view={view}
            ctx={ctx}
          />
        )}
        {supported && db.busy && (
          <div className='database-placeholder' role='status'>
            正在加载数据库预览…
          </div>
        )}
        {supported && !db.busy && !db.error && db.result && !matches.length && (
          <div className='database-placeholder'>
            {term
              ? '预览中没有匹配条目，可前往 Notion 搜索完整数据库。'
              : '暂无可显示的预览条目，可前往 Notion 查看。'}
          </div>
        )}
        {supported && db.error && (
          <div className='database-error' role='alert'>
            <p>
              {db.error === 'RATE_LIMITED'
                ? '请求较多，请稍后重试，或直接前往 Notion。'
                : '预览暂时无法加载，可直接前往 Notion 查看。'}
            </p>
            <button
              type='button'
              onClick={() => {
                void db.retry()
              }}
              disabled={db.busy}
            >
              重试
            </button>
          </div>
        )}
        {supported && db.result && (
          <footer className='database-footer'>
            <span aria-live='polite'>
              {term
                ? `预览中匹配 ${matches.length} 条 · 已显示 ${displayed.length} 条`
                : `已显示 ${displayed.length} 条预览`}
            </span>
            {displayed.length < matches.length && (
              <button
                type='button'
                onClick={() =>
                  setDisplayCount(count => count + DATABASE_DISPLAY_STEP)
                }
              >
                展开更多预览
              </button>
            )}
          </footer>
        )}
        {supported &&
          db.result &&
          displayed.length >= DATABASE_PREVIEW_LIMIT &&
          (db.result.hasMore || db.result.omitted) && (
            <aside className='database-preview-more'>
              <p>
                已达 {DATABASE_PREVIEW_LIMIT} 条预览上限，更多内容请前往
                Notion。
              </p>
              <a href={sourceUrl} target='_blank' rel='noopener noreferrer'>
                在 Notion 中查看完整数据库 ↗
              </a>
            </aside>
          )}
      </section>
    </NotionContextProvider>
  )
}
