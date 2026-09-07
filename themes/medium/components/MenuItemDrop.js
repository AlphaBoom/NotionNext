import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useEffect, useId, useState } from 'react'

export const MenuItemDrop = ({ link }) => {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const menuId = useId()
  useEffect(() => setOpen(false), [router.asPath])
  if (!link || !link.show) return null
  const hasChildren = link.subMenus?.length > 0
  const selected = router.asPath.split('?')[0] === link.href
  return (
    <li className={`medium-nav-item ${selected ? 'is-current' : ''}`} onKeyDown={e => {
      if (e.key === 'Escape') {
        setOpen(false)
        e.currentTarget.querySelector('button')?.focus()
      }
    }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      {hasChildren ? <>
        <button type='button' onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={menuId}>
          {link.name}<i className='fas fa-chevron-down' aria-hidden='true' />
        </button>
        <ul id={menuId} className='medium-submenu' hidden={!open}>
          {link.subMenus.filter(item => item.show !== false).map((item, index) => (
            <li key={item.id || index}><SmartLink href={item.href} target={item.target || link.target}>{item.title || item.name}</SmartLink></li>
          ))}
        </ul>
      </> : <SmartLink href={link.href} target={link.target} aria-current={selected ? 'page' : undefined}>{link.name}</SmartLink>}
    </li>
  )
}
