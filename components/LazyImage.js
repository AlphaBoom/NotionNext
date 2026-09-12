import { siteConfig } from '@/lib/config'
import { compressImage } from '@/lib/db/notion/mapImage'
import Head from 'next/head'
import { useCallback, useEffect, useRef, useState } from 'react'

// Remember recent successes across client-side navigation, without retaining
// image bytes or replacing the browser's HTTP cache.
const loadedSources = new Set()
const rememberLoadedSource = src => {
  loadedSources.delete(src)
  loadedSources.add(src)
  if (loadedSources.size > 200) {
    loadedSources.delete(loadedSources.values().next().value)
  }
}

const getTargetImageWidth = (width, maxWidth) => {
  const parsedWidth = Number(width)
  const parsedMaxWidth = Number(maxWidth)

  if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
    return Number.isFinite(parsedMaxWidth) && parsedMaxWidth > 0
      ? Math.min(parsedWidth, parsedMaxWidth)
      : parsedWidth
  }

  return maxWidth
}

/**
 * 图片懒加载
 * @param {*} param0
 * @returns
 */
export default function LazyImage({
  priority,
  id,
  src,
  alt,
  fallbackSrc,
  placeholderSrc,
  className,
  width,
  height,
  title,
  onLoad,
  onClick,
  style,
  loading
}) {
  const maxWidth = siteConfig('IMAGE_COMPRESS_WIDTH')
  const targetImageWidth = getTargetImageWidth(width, maxWidth)
  const defaultPlaceholderSrc = siteConfig('IMG_LAZY_LOAD_PLACEHOLDER')
  const adjustedImageSrc = adjustImgSize(src, targetImageWidth)
  const imageRef = useRef(null)
  const onLoadRef = useRef(onLoad)
  const failedSources = useRef(new Set())
  useEffect(() => {
    onLoadRef.current = onLoad
  }, [onLoad])
  const [currentSrc, setCurrentSrc] = useState(
    (priority || loadedSources.has(adjustedImageSrc)) && src
      ? adjustedImageSrc
      : placeholderSrc || defaultPlaceholderSrc
  )
  const [imageLoaded, setImageLoaded] = useState(
    Boolean(src && (priority || loadedSources.has(adjustedImageSrc)))
  )

  const handleImageError = useCallback(
    failedSource => {
      if (!imageRef.current) return
      loadedSources.delete(adjustedImageSrc)
      const failed = failedSources.current
      // DOM .src is absolute even when fallbackSrc is relative. Compare normalized
      // URLs and attempt each candidate once so failures cannot form a loop.
      const failedUrl =
        typeof failedSource === 'string'
          ? new URL(failedSource, document.baseURI).href
          : imageRef.current.src
      // The displayed image and its preloader can report the same failure.
      if (failed.has(failedUrl)) return
      failed.add(failedUrl)
      for (const candidate of [
        fallbackSrc,
        placeholderSrc,
        defaultPlaceholderSrc
      ]) {
        if (!candidate) continue
        const url = new URL(candidate, document.baseURI).href
        if (failed.has(url)) continue
        setCurrentSrc(candidate)
        break
      }
      setImageLoaded(true)
    },
    [adjustedImageSrc, defaultPlaceholderSrc, fallbackSrc, placeholderSrc]
  )

  useEffect(() => {
    if (!adjustedImageSrc) return
    const imageElement = imageRef.current
    let active = true
    let img
    let observer
    failedSources.current = new Set()
    const handleImageLoaded = () => {
      if (!active) return
      rememberLoadedSource(adjustedImageSrc)
      setCurrentSrc(adjustedImageSrc)
      setImageLoaded(true)
      if (typeof onLoadRef.current === 'function') onLoadRef.current()
    }
    if (loadedSources.has(adjustedImageSrc)) {
      handleImageLoaded()
      return
    }
    setCurrentSrc(
      priority ? adjustedImageSrc : placeholderSrc || defaultPlaceholderSrc
    )
    setImageLoaded(Boolean(priority))
    const loadImage = () => {
      if (!active || img) return
      img = new Image()
      img.decoding = 'async'
      img.onload = handleImageLoaded
      img.onerror = () => {
        if (active) handleImageError(adjustedImageSrc)
      }
      // Install handlers before assigning src, including browser cache hits.
      img.src = adjustedImageSrc
    }

    if (priority || !window.IntersectionObserver) {
      loadImage()
    } else {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              loadImage()
              observer.unobserve(entry.target)
            }
          })
        },
        {
          rootMargin: siteConfig('LAZY_LOAD_THRESHOLD', '200px'),
          threshold: 0.1
        }
      )
      if (imageElement) observer.observe(imageElement)
    }

    return () => {
      active = false
      if (img) {
        img.onload = null
        img.onerror = null
      }
      observer?.disconnect()
    }
  }, [
    adjustedImageSrc,
    priority,
    defaultPlaceholderSrc,
    handleImageError,
    placeholderSrc
  ])

  // 动态添加width、height和className属性，仅在它们为有效值时添加
  const imgProps = {
    ref: imageRef,
    src: currentSrc,
    'data-src': src, // 存储原始图片地址
    alt: alt || 'Lazy loaded image',
    onError: handleImageError,
    className: `${className || ''}${imageLoaded ? '' : ' lazy-image-placeholder'}`,
    style: {
      aspectRatio: width && height ? `${width} / ${height}` : undefined,
      containIntrinsicSize: width || height ? undefined : '300px 200px',
      ...style
    },
    onClick,
    // 性能优化属性
    loading: priority ? 'eager' : loading || 'lazy',
    decoding: 'async',
    // 现代图片格式支持
    ...(siteConfig('WEBP_SUPPORT') && { 'data-webp': true }),
    ...(siteConfig('AVIF_SUPPORT') && { 'data-avif': true })
  }

  if (id) imgProps.id = id
  if (title) imgProps.title = title
  if (width) imgProps.width = width
  if (height) imgProps.height = height
  if (priority) imgProps.fetchpriority = 'high'

  if (!src) {
    return null
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={imgProps.alt} {...imgProps} />
      {/* 预加载 */}
      {priority && (
        <Head>
          <link
            rel='preload'
            as='image'
            href={adjustImgSize(src, targetImageWidth)}
            fetchpriority='high'
          />
        </Head>
      )}
    </>
  )
}

/**
 * 根据窗口尺寸决定压缩图片宽度
 * @param {*} src
 * @param {*} maxWidth
 * @returns
 */
export const adjustImgSize = (src, maxWidth) => {
  if (!src) {
    return null
  }
  const screenWidth =
    (typeof window !== 'undefined' && window?.screen?.width) || maxWidth
  const parsedMaxWidth = Number(maxWidth)
  const targetWidth =
    Number.isFinite(parsedMaxWidth) && parsedMaxWidth > 0
      ? Math.min(screenWidth, parsedMaxWidth)
      : screenWidth

  // 屏幕尺寸大于默认图片尺寸，没必要再压缩
  if (!targetWidth) {
    return src
  }

  const compressedSrc = compressImage(src, targetWidth)

  // 正则表达式，用于匹配 URL 中的 width 参数
  const widthRegex = /width=\d+/
  // 正则表达式，用于匹配 URL 中的 w 参数
  const wRegex = /w=\d+/

  // 使用正则表达式替换 width/w 参数
  return compressedSrc
    .replace(widthRegex, `width=${targetWidth}`)
    .replace(wRegex, `w=${targetWidth}`)
}
