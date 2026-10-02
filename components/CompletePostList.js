import { useEffect, useState } from 'react'

// Legacy themes paginate a complete array locally. Fetch that array only when
// one of them is selected at runtime from a site with paged scroll props.
export default function CompletePostList({
  Layout,
  Loading,
  listProps,
  endpoint
}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setError(false)
      try {
        const response = await fetch(endpoint, { signal: controller.signal })
        if (!response.ok) throw new Error('Post list request failed')
        const result = await response.json()
        if (
          !Array.isArray(result.posts) ||
          result.postCount !== result.posts.length ||
          result.hasMore !== false
        )
          throw new Error('Incomplete post list response')
        if (!controller.signal.aborted) setData(result)
      } catch (err) {
        if (!controller.signal.aborted) setError(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [endpoint, attempt])

  if (error) {
    return (
      <div className='py-8 text-center dark:text-gray-200'>
        <p role='alert'>加载失败，请重试。</p>
        <button
          type='button'
          className='mt-2 min-h-[44px] px-6 underline'
          onClick={() => setAttempt(value => value + 1)}
        >
          重试
        </button>
      </div>
    )
  }
  if (!data) {
    return (
      <div aria-busy='true'>
        <Loading />
      </div>
    )
  }
  return (
    <Layout
      {...listProps}
      posts={data.posts}
      postCount={data.postCount}
      postListPaged={false}
    />
  )
}
