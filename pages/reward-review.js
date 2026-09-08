// Temporary review fixture, removed after visual verification.
import { useState } from 'react'
import Home, { getStaticProps as getHomeProps } from './index'
import { useReward } from '@/themes/medium/components/RewardProvider'

export default function RewardReview(props) {
  const { unlockReward } = useReward()
  const [error, setError] = useState('')
  return (
    <>
      <button
        style={{
          position: 'fixed',
          top: 4,
          left: 4,
          zIndex: 90,
          background: 'white',
          color: 'black',
          padding: 8
        }}
        onClick={() => unlockReward('won').catch(e => setError(e.message))}
      >
        验证通关奖励
      </button>
      {error && <p role='alert'>{error}</p>}
      <Home {...props} />
    </>
  )
}
export async function getServerSideProps(context) {
  if (process.env.VERCEL_ENV !== 'preview') return { notFound: true }
  const { props } = await getHomeProps(context)
  return { props }
}
