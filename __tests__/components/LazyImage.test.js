import { act, fireEvent, render, screen } from '@testing-library/react'
import LazyImage from '@/components/LazyImage'

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback) =>
    key === 'IMG_LAZY_LOAD_PLACEHOLDER' ? '/placeholder.svg' : fallback
}))
jest.mock('@/lib/db/notion/mapImage', () => ({ compressImage: src => src }))

const originalImage = global.Image
const originalObserver = window.IntersectionObserver
let requests, intersect, observer
beforeEach(() => {
  requests = []
  global.Image = class {
    constructor() {
      requests.push(this)
    }
  }
  observer = { observe: jest.fn(), unobserve: jest.fn() }
  window.IntersectionObserver = jest.fn(callback => {
    intersect = callback
    return observer
  })
})
afterEach(() => {
  global.Image = originalImage
  window.IntersectionObserver = originalObserver
})

test('lazy images wait for visibility and decoding before replacing the placeholder', () => {
  const onLoad = jest.fn()
  const { unmount } = render(
    <LazyImage
      src='/photo.jpg'
      alt='Photo'
      width={300}
      height={200}
      onLoad={onLoad}
    />
  )
  const image = screen.getByRole('img', { name: 'Photo' })
  expect(image).toHaveAttribute('src', '/placeholder.svg')
  expect(image).toHaveAttribute('loading', 'lazy')
  expect(image).toHaveAttribute('width', '300')
  expect(image).toHaveAttribute('height', '200')
  expect(requests).toHaveLength(0)
  act(() => intersect([{ isIntersecting: false, target: image }]))
  expect(requests).toHaveLength(0)
  act(() => intersect([{ isIntersecting: true, target: image }]))
  expect(requests).toHaveLength(1)
  expect(requests[0].src).toBe('/photo.jpg')
  expect(image).toHaveAttribute('src', '/placeholder.svg')
  act(() => requests[0].onload())
  expect(image).toHaveAttribute('src', '/photo.jpg')
  expect(onLoad).toHaveBeenCalledTimes(1)
  expect(observer.unobserve).toHaveBeenCalledWith(image)
  unmount()
})

test('priority images start immediately and notify callers when loaded', () => {
  const onLoad = jest.fn()
  render(<LazyImage src='/hero.jpg' alt='Hero' priority onLoad={onLoad} />)
  const image = screen.getByRole('img', { name: 'Hero' })
  expect(image).toHaveAttribute('src', '/hero.jpg')
  expect(image).toHaveAttribute('loading', 'eager')
  expect(requests[0].src).toBe('/hero.jpg')
  expect(window.IntersectionObserver).not.toHaveBeenCalled()
  expect(onLoad).not.toHaveBeenCalled()
  act(() => requests[0].onload())
  expect(onLoad).toHaveBeenCalledTimes(1)
})

test('a failed image uses its fallback, then the placeholder if the fallback fails', () => {
  render(
    <LazyImage
      src='/missing.jpg'
      alt='Photo'
      fallbackSrc='https://images.example/fallback.jpg'
    />
  )
  const image = screen.getByRole('img', { name: 'Photo' })
  act(() => intersect([{ isIntersecting: true, target: image }]))
  act(() => requests[0].onerror())
  expect(image).toHaveAttribute('src', 'https://images.example/fallback.jpg')
  fireEvent.error(image)
  expect(image).toHaveAttribute('src', '/placeholder.svg')
})
