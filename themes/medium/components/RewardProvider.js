import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { installRewardConsole } from '../lib/rewardConsole'
import RewardColorScheme from './RewardColorScheme'
import { REWARD_BOOT_ATTRIBUTE } from '../lib/rewardBoot'
import {
  EMPTY_REWARD,
  readReward,
  REWARD_KEY,
  rewardAfterVictory,
  writeReward
} from '../lib/rewardState'

const RewardContext = createContext({ active: false, unlocked: false })
const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
export const useReward = () => useContext(RewardContext)

export default function RewardProvider({ children }) {
  const [reward, setReward] = useState(EMPTY_REWARD)
  const [Appearance, setAppearance] = useState(null)
  const [Hero, setHero] = useState(null)
  const [opening, setOpening] = useState(null)
  const [restoring, setRestoring] = useState(true)
  const pendingOpening = useRef(null)
  const currentReward = useRef(EMPTY_REWARD)
  const mounted = useRef(false)
  const loading = useRef(null)
  const revision = useRef(0)
  const unlockCommand = useRef(null)
  const cancelOpening = useCallback(() => {
    pendingOpening.current?.resolve(false)
    pendingOpening.current = null
    if (mounted.current) setOpening(null)
  }, [])
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
  useBrowserLayoutEffect(() => {
    // Release the first-paint shell only after the theme, hero, styles and
    // light color scheme have committed together. Never replay the unlock.
    if (!restoring)
      document.documentElement.removeAttribute(REWARD_BOOT_ATTRIBUTE)
  }, [restoring])
  useEffect(() => {
    mounted.current = true
    const restore = async () => {
      cancelOpening()
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
        setRestoring(false)
        return
      }
      try {
        const module = await loadAppearance()
        if (saved.enabled) await module.prepareArtwork()
        if (mounted.current && request === revision.current) {
          // If the boot watchdog already restored the normal blog, do not
          // switch its appearance late while the visitor is reading it.
          const expired =
            document.documentElement.getAttribute(REWARD_BOOT_ATTRIBUTE) ===
            'expired'
          const restored = expired ? { ...saved, enabled: false } : saved
          currentReward.current = restored
          setReward(restored)
          setRestoring(false)
        }
      } catch {
        /* The normal blog remains usable if the optional chunk fails. */
        if (mounted.current && request === revision.current) {
          currentReward.current = { ...saved, enabled: false }
          setReward(currentReward.current)
          setRestoring(false)
        }
      }
    }
    void restore()
    const onStorage = event => {
      if (event.key === REWARD_KEY || event.key === null) void restore()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      mounted.current = false
      cancelOpening()
      revision.current++
      window.removeEventListener('storage', onStorage)
    }
  }, [loadAppearance, cancelOpening])
  const persist = value => {
    currentReward.current = value
    setReward(value)
    try {
      writeReward(window.localStorage, value)
    } catch {}
  }
  const prepareReveal = next => {
    cancelOpening()
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
      return new Promise(resolve => {
        pendingOpening.current = { request, next, isCurrent, resolve }
        // Keep the current page until the entrance animation fully covers it.
        setOpening('cover')
      })
    }
  }
  const commitCoveredTheme = () => {
    const pending = pendingOpening.current
    if (!pending) return
    pendingOpening.current = null
    if (
      !mounted.current ||
      pending.request !== revision.current ||
      !pending.isCurrent()
    ) {
      setOpening(null)
      pending.resolve(false)
      return
    }
    revision.current++
    persist(pending.next)
    // The reveal begins fully opaque, in the same commit as the new theme.
    setOpening('reveal')
    pending.resolve(true)
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
    if (!currentReward.current.unlocked) return
    if (currentReward.current.enabled || pendingOpening.current) {
      revision.current++
      cancelOpening()
      persist({ unlocked: true, enabled: false })
    } else {
      void unlockReward('won').catch(() => {})
    }
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
      <RewardColorScheme active={reward.enabled}>
        {children}
        {Appearance && reward.unlocked && (
          <Appearance
            active={reward.enabled}
            opening={opening}
            onCovered={commitCoveredTheme}
            onOpeningEnd={() => setOpening(null)}
            onToggle={toggleReward}
          />
        )}
      </RewardColorScheme>
    </RewardContext.Provider>
  )
}
