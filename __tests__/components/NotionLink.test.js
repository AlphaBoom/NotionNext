import { act, fireEvent, render, screen } from '@testing-library/react'
import NotionLink, {
  shouldOpenNotionLinkInNewTab
} from '@/components/NotionLink'
import { getSteamAppId } from '@/components/SteamGameLink'

describe('NotionLink', () => {
  const originalMatchMedia = window.matchMedia
  afterEach(() => {
    window.matchMedia = originalMatchMedia
    jest.useRealTimers()
  })

  it('loads a Steam cover on hover, keeps it hoverable, and dismisses with Escape', () => {
    jest.useFakeTimers()
    window.matchMedia = jest.fn(() => ({ matches: true }))
    const { container } = render(
      <NotionLink href='https://store.steampowered.com/app/638970/'>
        如龙0
      </NotionLink>
    )
    const link = screen.getByRole('link', { name: '如龙0' })
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.mouseEnter(link)
    const preview = screen.getByRole('dialog')
    expect(preview.parentElement).toBe(document.body)
    expect(preview.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/638970/header.jpg')
    )
    expect(link).toHaveAttribute('aria-controls', preview.id)
    expect(link).toHaveAttribute('aria-expanded', 'true')
    fireEvent.mouseLeave(link)
    fireEvent.mouseEnter(preview)
    act(() => jest.advanceTimersByTime(200))
    expect(preview).toBeVisible()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(link).not.toHaveAttribute('aria-controls')
    expect(link).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens from keyboard focus and keeps the preview inside the viewport', () => {
    render(
      <NotionLink href='https://store.steampowered.com/app/638970/'>
        如龙0
      </NotionLink>
    )
    const link = screen.getByRole('link', { name: '如龙0' })
    jest.spyOn(link, 'getBoundingClientRect').mockReturnValue({
      left: window.innerWidth - 40,
      top: window.innerHeight - 50,
      bottom: window.innerHeight - 20
    })
    act(() => link.focus())
    const preview = screen.getByRole('dialog')
    expect(
      Number.parseFloat(preview.style.left) +
        Number.parseFloat(preview.style.width)
    ).toBeLessThan(window.innerWidth)
    expect(Number.parseFloat(preview.style.bottom)).toBeGreaterThan(0)
    fireEvent.scroll(window)
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => link.blur())
    act(() => link.focus())
    expect(screen.getByRole('dialog')).toBeVisible()
    act(() => link.blur())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('previews on the first touch and lets the next touch open Steam', () => {
    jest.useFakeTimers()
    window.matchMedia = jest.fn(() => ({ matches: false }))
    render(
      <NotionLink href='https://store.steampowered.com/app/638970/'>
        如龙0
      </NotionLink>
    )
    const link = screen.getByRole('link', { name: '如龙0' })
    fireEvent.mouseEnter(link)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fireEvent.click(link, { detail: 1 })).toBe(false)
    const preview = screen.getByRole('dialog', { name: '如龙0' })
    expect(preview.querySelector('a')).toHaveAttribute('href', link.href)
    expect(preview.querySelector('a')).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    )
    fireEvent.mouseLeave(link)
    act(() => jest.advanceTimersByTime(200))
    expect(preview).toBeVisible()
    expect(fireEvent.click(link, { detail: 1 })).toBe(true)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fireEvent.click(link, { detail: 1 })).toBe(false)
    fireEvent.scroll(window)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('recognizes a touch on a device that also supports mouse hover', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }))
    render(
      <NotionLink href='https://store.steampowered.com/app/638970/'>
        如龙0
      </NotionLink>
    )
    const link = screen.getByRole('link', { name: '如龙0' })
    fireEvent(
      link,
      Object.assign(new Event('pointerdown', { bubbles: true }), {
        pointerType: 'touch'
      })
    )
    fireEvent.mouseEnter(link)
    expect(fireEvent.click(link, { detail: 1 })).toBe(false)
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('allows keyboard access to the preview link and returns focus on Escape', () => {
    jest.useFakeTimers()
    render(
      <NotionLink href='https://store.steampowered.com/app/638970/'>
        如龙0
      </NotionLink>
    )
    const link = screen.getByRole('link', { name: '如龙0' })
    act(() => link.focus())
    const preview = screen.getByRole('dialog')
    act(() => preview.querySelector('a').focus())
    fireEvent.mouseLeave(link)
    act(() => jest.advanceTimersByTime(200))
    expect(preview).toBeVisible()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(link).toHaveFocus()
  })

  it('preserves desktop, keyboard, modified clicks, and caller cancellation', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }))
    const onClick = jest.fn()
    render(
      <NotionLink
        href='https://store.steampowered.com/app/638970/'
        onClick={onClick}
      >
        如龙0
      </NotionLink>
    )
    const link = screen.getByRole('link', { name: '如龙0' })
    expect(fireEvent.click(link, { detail: 1 })).toBe(true)
    window.matchMedia = jest.fn(() => ({ matches: false }))
    expect(fireEvent.click(link, { detail: 0 })).toBe(true)
    expect(fireEvent.click(link, { detail: 1, ctrlKey: true })).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    onClick.mockImplementation(event => event.preventDefault())
    expect(fireEvent.click(link, { detail: 1 })).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onClick).toHaveBeenCalledTimes(4)
  })

  it('only enhances genuine Steam app links', () => {
    expect(
      getSteamAppId(
        'https://store.steampowered.com/app/638970/Yakuza_0/?l=schinese'
      )
    ).toBe('638970')
    for (const href of [
      'https://store.steampowered.com.evil.test/app/638970/',
      'https://store.steampowered.com@evil.test/app/638970/',
      'https://evil.test@store.steampowered.com/app/638970/',
      'https://store.steampowered.com/app/638970bad/',
      'https://store.steampowered.com/app/0/',
      'https://store.steampowered.com/bundle/638970/',
      '/app/638970/',
      null
    ])
      expect(getSteamAppId(href)).toBeNull()
  })

  it('opens external http links in a new tab', () => {
    render(<NotionLink href='https://example.com'>Example</NotionLink>)

    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('keeps same-origin absolute links in current tab', () => {
    expect(
      shouldOpenNotionLinkInNewTab(
        'https://blog.example.com/article/abc',
        undefined,
        'https://blog.example.com'
      )
    ).toBe(false)
  })

  it('preserves existing rel tokens when forcing a new tab', () => {
    render(
      <NotionLink href='https://example.com' rel='nofollow sponsored'>
        Example
      </NotionLink>
    )

    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('sponsored'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('keeps mailto links in current tab by default', () => {
    render(<NotionLink href='mailto:test@example.com'>Mail</NotionLink>)

    const link = screen.getByRole('link', { name: 'Mail' })
    expect(link).toHaveAttribute('href', 'mailto:test@example.com')
    expect(link).not.toHaveAttribute('target')
    expect(link).not.toHaveAttribute('rel')
  })

  it('keeps explicit blank targets and adds safe rel tokens', () => {
    render(
      <NotionLink href='mailto:test@example.com' target='_blank'>
        Mail
      </NotionLink>
    )

    const link = screen.getByRole('link', { name: 'Mail' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('shouldOpenNotionLinkInNewTab', () => {
  it('returns true for explicit blank targets and cross-origin http links', () => {
    expect(
      shouldOpenNotionLinkInNewTab('mailto:test@example.com', '_blank')
    ).toBe(true)
    expect(
      shouldOpenNotionLinkInNewTab(
        'https://external.example.com',
        undefined,
        'https://blog.example.com'
      )
    ).toBe(true)
    expect(
      shouldOpenNotionLinkInNewTab(
        'http://external.example.com',
        undefined,
        'https://blog.example.com'
      )
    ).toBe(true)
  })

  it('returns false for non-http links and same-origin http links', () => {
    expect(shouldOpenNotionLinkInNewTab('/posts/demo')).toBe(false)
    expect(shouldOpenNotionLinkInNewTab('#section-1')).toBe(false)
    expect(shouldOpenNotionLinkInNewTab('mailto:test@example.com')).toBe(false)
    expect(
      shouldOpenNotionLinkInNewTab(
        'https://blog.example.com/abc',
        undefined,
        'https://blog.example.com'
      )
    ).toBe(false)
  })
})
