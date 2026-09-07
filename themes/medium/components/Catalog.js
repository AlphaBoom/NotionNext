import { uuidToId } from 'notion-utils'
import { useEffect, useMemo, useState } from 'react'

export default function Catalog({ toc = [], onNavigate }) {
  const [activeId, setActiveId] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const items = useMemo(() => {
    const rootLevel = Math.min(...toc.map(item => item.indentLevel || 0))
    let group = null
    return toc.map(item => {
      const id = uuidToId(item.id)
      const level = (item.indentLevel || 0) - rootLevel
      if (level === 0 || !group) group = id
      return { ...item, id, level, group }
    })
  }, [toc])
  const activeGroup = items.find(item => item.id === activeId)?.group || items[0]?.group

  useEffect(() => {
    let frame = null
    const update = () => {
      frame = null
      let current = items[0]?.id
      for (const item of items) {
        const anchor = document.getElementById(item.id)
        if (!anchor || !anchor.getClientRects().length) continue
        if (anchor.getBoundingClientRect().top > 120) break
        current = item.id
      }
      setActiveId(current)
    }
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [items])

  if (!items.length) return null
  return (
    <div className='medium-catalog'>
      <div className='medium-catalog-heading'>
        <span>本篇目录</span>
        {items.some(item => item.level > 0) && <button type='button' aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? '收起' : '展开全部'}</button>}
      </div>
      <nav aria-label='本篇目录'>
        <ol>
          {items.map(item => (
            <li key={item.id} hidden={!showAll && item.level > 0 && item.group !== activeGroup}>
              <a href={`#${item.id}`} aria-current={activeId === item.id ? 'location' : undefined} style={{ paddingLeft: 12 + item.level * 12 }} onClick={() => {
                // Headings inside a Notion toggle must be revealed before following their anchor.
                let parent = document.getElementById(item.id)?.parentElement
                while (parent) {
                  if (parent.tagName === 'DETAILS') parent.open = true
                  parent = parent.parentElement
                }
                setActiveId(item.id)
                onNavigate?.()
              }}>{item.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
