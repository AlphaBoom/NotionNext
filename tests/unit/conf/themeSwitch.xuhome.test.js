/**
 * @jest-environment node
 */
import { getThemeSwitchMeta } from '@/conf/themeSwitch.manifest'
import CONFIG from '@/themes/xuhome/config'

describe('XuHome theme console colors', () => {
  it('exposes every color config in the palette instead of text settings', () => {
    const meta = getThemeSwitchMeta('xuhome')
    const colorKeys = Object.keys(CONFIG).filter(key =>
      /_COLOR(?:_|$)|_THEME_COLOR(?:_|$)/.test(key)
    )
    const paletteKeys = meta.palette.map(item => item.key)
    const settingKeys = meta.settings.map(item => item.key)

    expect(paletteKeys).toEqual(expect.arrayContaining(colorKeys))
    expect(settingKeys).not.toEqual(expect.arrayContaining(colorKeys))
    expect(new Set(paletteKeys).size).toBe(paletteKeys.length)
  })
})
