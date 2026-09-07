import { useEffect, useRef } from 'react'
import { useMediumGlobal } from '..'
import Catalog from './Catalog'

export default function TocDrawer({ post }) {
  const { tocVisible, changeTocVisible } = useMediumGlobal()
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  useEffect(() => {
    if (!tocVisible) return
    const onKeyDown = e => {
      if (e.key === 'Escape') {
        changeTocVisible(false)
        buttonRef.current?.focus()
      }
    }
    const onPointerDown = e => {
      if (!panelRef.current?.contains(e.target)) changeTocVisible(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [tocVisible, changeTocVisible])
  return (
    <div className='medium-mobile-toc' ref={panelRef}>
      <button type='button' className='medium-toc-toggle' ref={buttonRef} aria-expanded={tocVisible} aria-controls='medium-toc-panel' onClick={() => changeTocVisible(!tocVisible)}>
        <i className='fas fa-list-ul' aria-hidden='true' />{tocVisible ? '关闭目录' : '目录'}
      </button>
      {tocVisible && <section id='medium-toc-panel' className='medium-toc-panel' aria-label='文章目录'>
        <Catalog key={post.id} toc={post.toc} onNavigate={() => changeTocVisible(false)} />
      </section>}
    </div>
  )
}
