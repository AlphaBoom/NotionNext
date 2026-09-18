import { useEffect, useId, useRef, useState } from 'react'

function columnWidth(field) {
  const minimum =
    field.type === 'title' ? 180 : field.type === 'text' ? 300 : 120
  return Math.min(500, Math.max(minimum, Number(field.width) || minimum))
}

export default function DatabaseTable({ rows, fields, renderCell }) {
  const scroller = useRef(null)
  const hintId = useId()
  const [wrap, setWrap] = useState(true)
  const [viewportWidth, setViewportWidth] = useState(null)
  const [edges, setEdges] = useState({
    overflow: false,
    left: false,
    right: false
  })
  // A long description should fit in one viewport after scrolling to its column.
  const widths = fields.map(field =>
    Math.min(columnWidth(field), viewportWidth || 500)
  )
  const width = widths.reduce((sum, value) => sum + value, 0)
  const measure = () => {
    const el = scroller.current
    if (!el) return
    if (el.clientWidth > 0) setViewportWidth(el.clientWidth)
    const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft
    const next = {
      overflow: el.scrollWidth > el.clientWidth + 1,
      left: el.scrollLeft > 1,
      right: remaining > 1
    }
    setEdges(previous =>
      Object.keys(next).every(key => previous[key] === next[key])
        ? previous
        : next
    )
  }
  useEffect(() => {
    measure()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (scroller.current) observer?.observe(scroller.current)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [width])
  const move = direction => {
    const el = scroller.current
    if (el)
      el.scrollBy({
        left: direction * Math.max(180, el.clientWidth * 0.8),
        behavior: 'smooth'
      })
  }

  return (
    <div className='database-table-view'>
      <div className='database-table-tools'>
        {edges.overflow && <p id={hintId}>左右滑动查看其余列</p>}
        <div>
          <button
            type='button'
            aria-pressed={wrap}
            onClick={() => setWrap(value => !value)}
          >
            自动换行
          </button>
          {edges.overflow && (
            <>
              <button
                type='button'
                aria-label='向左滚动表格'
                disabled={!edges.left}
                onClick={() => move(-1)}
              >
                ←
              </button>
              <button
                type='button'
                aria-label='向右滚动表格'
                disabled={!edges.right}
                onClick={() => move(1)}
              >
                →
              </button>
            </>
          )}
        </div>
      </div>
      <div
        ref={scroller}
        className='database-table-scroll'
        role='region'
        aria-label='数据库表格，可横向滚动'
        aria-describedby={edges.overflow ? hintId : undefined}
        tabIndex={0}
        onScroll={measure}
        data-scroll-left={edges.left || undefined}
        data-scroll-right={edges.right || undefined}
      >
        <table
          className={`database-table ${wrap ? 'database-wrap' : 'database-nowrap'}`}
          style={{ width }}
        >
          <caption className='sr-only'>数据库条目</caption>
          <colgroup>
            {fields.map((field, index) => (
              <col key={field.id} style={{ width: widths[index] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {fields.map((field, index) => (
                <th
                  key={field.id}
                  scope='col'
                  className={
                    index === 0 && field.type === 'title'
                      ? 'database-title-cell'
                      : undefined
                  }
                >
                  {field.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {fields.map((field, index) => (
                  <td
                    key={field.id}
                    className={
                      index === 0 && field.type === 'title'
                        ? 'database-title-cell'
                        : undefined
                    }
                  >
                    <div className='database-cell-value'>
                      {renderCell(row, field)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
