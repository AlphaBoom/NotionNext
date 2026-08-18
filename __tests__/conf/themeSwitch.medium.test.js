/**
 * @jest-environment node
 */
import { getThemeSwitchMeta } from '@/conf/themeSwitch.manifest'

describe('Medium theme console colors', () => {
  it('keeps the page background distinct from the article card', () => {
    const palette = Object.fromEntries(
      getThemeSwitchMeta('medium').palette.map(item => [item.key, item])
    )

    expect(palette.MEDIUM_COLOR_BG.defaultValue).toBe('#eeeeee')
    expect(palette.MEDIUM_COLOR_CARD.defaultValue).toBe('#ffffff')
  })
})
