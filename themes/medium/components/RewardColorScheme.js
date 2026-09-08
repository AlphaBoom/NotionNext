import { GlobalContext } from '@/lib/global'
import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'

const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
const ignore = () => {}

// NEW GAME! has its own light palette. Keep the user's normal preference in
// the parent context/storage while both CSS and JS-rendered widgets see light.
export default function RewardColorScheme({ active, children }) {
  const global = useContext(GlobalContext)
  const preference = useRef(global?.isDarkMode)
  preference.current = global?.isDarkMode
  useBrowserLayoutEffect(() => {
    if (!active) return
    const html = document.documentElement
    const originalDark = html.classList.contains('dark')
    const originalScheme = html.style.colorScheme
    html.classList.remove('dark')
    html.classList.add('light')
    html.style.colorScheme = 'light'
    return () => {
      const dark = preference.current ?? originalDark
      html.classList.toggle('dark', dark)
      html.classList.toggle('light', !dark)
      html.style.colorScheme = originalScheme
    }
  }, [active, global?.isDarkMode])
  const appearance = useMemo(
    () =>
      active
        ? {
            ...global,
            isDarkMode: false,
            toggleDarkMode: ignore,
            updateDarkMode: ignore
          }
        : global,
    [active, global]
  )
  return (
    <GlobalContext.Provider value={appearance}>
      {children}
    </GlobalContext.Provider>
  )
}
