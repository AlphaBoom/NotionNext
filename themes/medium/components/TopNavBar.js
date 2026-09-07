import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import CONFIG from '../config'
import LogoBar from './LogoBar'
import { MenuItemDrop } from './MenuItemDrop'

export default function TopNavBar({ customNav = [], customMenu = [] }) {
  const [open, setOpen] = useState(false)
  const { locale, isDarkMode, toggleDarkMode } = useGlobal()
  const router = useRouter()
  useEffect(() => setOpen(false), [router.asPath])
  const defaultLinks = [
    { name: locale.NAV.HOME || '首页', href: '/', show: true },
    { name: locale.NAV.ARCHIVE, href: '/archive', show: siteConfig('MEDIUM_MENU_ARCHIVE', null, CONFIG) },
    { name: locale.COMMON.CATEGORY, href: '/category', show: siteConfig('MEDIUM_MENU_CATEGORY', null, CONFIG) },
    { name: locale.COMMON.TAGS, href: '/tag', show: siteConfig('MEDIUM_MENU_TAG', null, CONFIG) },
    { name: locale.NAV.SEARCH, href: '/search', show: siteConfig('MEDIUM_MENU_SEARCH', null, CONFIG) }
  ]
  const links = siteConfig('CUSTOM_MENU') && customMenu?.length ? customMenu : defaultLinks.concat(customNav || [])
  return (
    <header id='top-nav' className='medium-nav'>
      <div className='medium-nav-inner'>
        <LogoBar />
        <nav id='medium-navigation' aria-label='主导航' className={open ? 'is-open' : ''}>
          <ul>{links.map((link, index) => <MenuItemDrop key={link.id || index} link={link} />)}</ul>
        </nav>
        <button type='button' className='medium-theme-toggle' onClick={toggleDarkMode} aria-label={isDarkMode ? '切换浅色模式' : '切换深色模式'}>
          <i className={isDarkMode ? 'far fa-sun' : 'far fa-moon'} aria-hidden='true' />
        </button>
        <button type='button' className='medium-menu-toggle' onClick={() => setOpen(!open)} aria-expanded={open} aria-controls='medium-navigation' aria-label={open ? '关闭导航' : '打开导航'}>
          <i className={open ? 'fas fa-times' : 'fas fa-bars'} aria-hidden='true' />
        </button>
      </div>
    </header>
  )
}
