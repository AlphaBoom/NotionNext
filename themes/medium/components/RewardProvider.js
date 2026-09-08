import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { installRewardConsole } from '../lib/rewardConsole'
import {
  EMPTY_REWARD,
  readReward,
  REWARD_KEY,
  rewardAfterVictory,
  writeReward
} from '../lib/rewardState'

const RewardContext = createContext({ active: false, unlocked: false })
export const useReward = () => useContext(RewardContext)

export default function RewardProvider({ children }) {
  const [reward, setReward] = useState(EMPTY_REWARD)
  const [Appearance, setAppearance] = useState(null)
  const [Hero, setHero] = useState(null)
  const [opening, setOpening] = useState(false)
  const currentReward = useRef(EMPTY_REWARD)
  const mounted = useRef(false)
  const loading = useRef(null)
  const revision = useRef(0)
  const unlockCommand = useRef(null)
  const loadAppearance = useCallback(async () => {
    if (!loading.current)
      loading.current = import('./NewGameTheme').catch(error => {
        loading.current = null
        throw error
      })
    const module = await loading.current
    if (mounted.current) {
      setAppearance(() => module.default)
      setHero(() => module.NewGameHero)
    }
    return module
  }, [])
  useEffect(() => {
    mounted.current = true
    const restore = async () => {
      const request = ++revision.current
      // Accessing localStorage itself can throw in privacy-restricted contexts.
      let saved = EMPTY_REWARD
      try {
        saved = readReward(window.localStorage)
      } catch {}
      currentReward.current = saved
      setReward(current => ({ ...current, unlocked: saved.unlocked }))
      if (!saved.unlocked) {
        setReward(EMPTY_REWARD)
        return
      }
      try {
        const module = await loadAppearance()
        if (saved.enabled) await module.prepareArtwork()
        if (mounted.current && request === revision.current) setReward(saved)
      } catch {
        /* The normal blog remains usable if the optional chunk fails. */
      }
    }
    void restore()
    const onStorage = event => {
      if (event.key === REWARD_KEY || event.key === null) void restore()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      mounted.current = false
      revision.current++
      window.removeEventListener('storage', onStorage)
    }
  }, [loadAppearance])
  useEffect(() => {
    if (!opening) return
    const timer = setTimeout(() => setOpening(false), 1800)
    return () => clearTimeout(timer)
  }, [opening])
  const persist = value => {
    currentReward.current = value
    setReward(value)
    try {
      writeReward(window.localStorage, value)
    } catch {}
  }
  const prepareReveal = next => {
    const request = ++revision.current
    persist({ ...next, enabled: currentReward.current.enabled })
    // Warm the optional assets while congratulations/countdown are visible.
    void loadAppearance()
      .then(module => module.prepareArtwork())
      .catch(() => {})
    return async (isCurrent = () => true) => {
      const module = await loadAppearance()
      await module.prepareArtwork()
      if (!mounted.current || request !== revision.current || !isCurrent())
        return false
      revision.current++
      persist(next)
      setOpening(true)
      return true
    }
  }
  const claimReward = phase => {
    const next = rewardAfterVictory(phase, currentReward.current)
    return next ? prepareReveal(next) : null
  }
  // Explicit console requests may reopen an existing unlock; game wins may not.
  const unlockReward = async phase => {
    if (phase !== 'won') return false
    return prepareReveal({ unlocked: true, enabled: true })()
  }
  useEffect(() => {
    unlockCommand.current = () => unlockReward('won')
  })
  useEffect(
    () => installRewardConsole(window, () => unlockCommand.current()),
    []
  )
  const toggleReward = () => {
    if (!reward.unlocked) return
    revision.current++
    persist({ unlocked: true, enabled: !reward.enabled })
    setOpening(!reward.enabled)
  }
  return (
    <RewardContext.Provider
      value={{
        active: reward.enabled,
        unlocked: reward.unlocked,
        unlockReward,
        claimReward,
        Hero
      }}
    >
      {children}
      {Appearance && reward.unlocked && (
        <Appearance
          active={reward.enabled}
          opening={opening}
          onToggle={toggleReward}
        />
      )}
    </RewardContext.Provider>
  )
}
