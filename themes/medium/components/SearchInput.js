import { useRouter } from 'next/router'
import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react'

export default function SearchInput({
  currentSearch = '',
  cRef,
  className = '',
  onStatusChange
}) {
  const router = useRouter()
  const input = useRef(null)
  const composing = useRef(false)
  const request = useRef(0)
  const pending = useRef('')
  const [value, setValue] = useState(currentSearch)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const id = useId()
  useImperativeHandle(cRef, () => ({ focus: () => input.current?.focus() }))
  useEffect(() => {
    setValue(currentSearch)
  }, [currentSearch])
  useEffect(
    () => () => {
      request.current++
    },
    []
  )

  const search = async event => {
    event.preventDefault()
    if (composing.current) return
    const keyword = value.trim()
    if (!keyword) {
      setError('请输入关键词后再搜索。')
      input.current?.focus()
      return
    }
    if (pending.current === keyword) return
    const revision = ++request.current
    pending.current = keyword
    setValue(keyword)
    setLoading(keyword)
    setError('')
    onStatusChange?.({ pending: true, keyword })
    try {
      await router.push(`/search/${encodeURIComponent(keyword)}`)
    } catch (failure) {
      if (revision === request.current && !failure?.cancelled)
        setError('搜索暂时未能完成，请重新搜索。')
    } finally {
      if (revision === request.current) {
        pending.current = ''
        setLoading('')
        onStatusChange?.({ pending: false, keyword })
      }
    }
  }
  const clear = () => {
    setValue('')
    setError('')
    input.current?.focus()
  }
  return (
    <form
      role='search'
      aria-label='搜索文章'
      onSubmit={search}
      className={`medium-search-form ${className}`}
    >
      <label className='sr-only' htmlFor={id}>
        搜索关键词
      </label>
      <div
        className='medium-search-field'
        data-invalid={error ? 'true' : undefined}
      >
        <svg
          className='medium-search-icon'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.7'
          aria-hidden='true'
        >
          <circle cx='10.5' cy='10.5' r='6.5' />
          <path d='m16 16 5 5' />
        </svg>
        <input
          id={id}
          ref={input}
          type='search'
          value={value}
          placeholder='输入关键词，按 Enter 搜索'
          autoComplete='off'
          enterKeyHint='search'
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={event => {
            setValue(event.target.value)
            setError('')
          }}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={() => {
            composing.current = false
          }}
          onKeyDown={event => {
            if (
              event.key === 'Enter' &&
              (composing.current ||
                event.nativeEvent.isComposing ||
                event.keyCode === 229)
            )
              event.preventDefault()
            if (event.key === 'Escape' && !composing.current) {
              event.preventDefault()
              clear()
            }
          }}
        />
        {value && (
          <button
            type='button'
            className='medium-search-clear'
            onClick={clear}
            aria-label='清空搜索关键词'
          >
            ×
          </button>
        )}
        <button
          type='submit'
          className='medium-search-submit'
          disabled={Boolean(loading && loading === value.trim())}
        >
          {loading ? '搜索中…' : '搜索'}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className='medium-search-error' role='alert'>
          {error}
        </p>
      )}
    </form>
  )
}
