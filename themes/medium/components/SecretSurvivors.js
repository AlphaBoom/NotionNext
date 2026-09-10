import { useEffect, useRef, useState } from 'react'
import SurvivorsLeaderboard from './SurvivorsLeaderboard'
import {
  beginLeaderboardRun,
  LEADERBOARD_ENABLED
} from '../lib/survivorsLeaderboard'
import { useVictoryReveal } from '../lib/useVictoryReveal'
import { handleMovementKey } from '../lib/survivorsInput'
import {
  assessPerformance,
  chooseUpgrade,
  createRun,
  RUN_SECONDS,
  stepRun
} from '../lib/survivors'
import {
  createRenderer,
  HEDGEHOG,
  HEDGEHOG_COLORS
} from '../lib/survivorsCanvas'

function snapshot(run) {
  return {
    phase: run.phase,
    mode: run.mode,
    wave: run.wave,
    bosses: run.bosses,
    time: Math.floor(run.time),
    hp: run.player.hp,
    maxHp: run.player.maxHp,
    xp: run.xp,
    nextXp: run.nextXp,
    level: run.level,
    kills: run.kills,
    choices: run.choices,
    boss: run.enemies.some(e => e.kind === 'boss' && e.hp > 0)
  }
}

export default function SecretSurvivors({
  onClose,
  onVictory,
  unlocked = false
}) {
  const panel = useRef(null),
    canvas = useRef(null),
    actions = useRef(null)
  const close = useRef(onClose)
  const challenge = useRef(unlocked)
  const leaderboardRun = useRef(null)
  const rankingDialog = useRef(null)
  const [rankingEntry, setRankingEntry] = useState(null)
  const [rankingOpen, setRankingOpen] = useState(false)
  challenge.current = unlocked
  const [hud, setHud] = useState(() =>
    snapshot(createRun(undefined, unlocked ? 'endless' : 'intro'))
  )
  const reward = useVictoryReveal(hud.phase, onVictory, () => close.current())
  useEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    const onEscape = event => {
      if (event.key !== 'Escape' && event.code !== 'Escape') return
      // The native dialog handles Escape first; closing it must keep the game.
      if (rankingDialog.current?.open) return
      event.preventDefault()
      if (!event.repeat) close.current()
    }
    // Escape belongs to the open game, even after focus leaves the arena.
    // This also works when canvas initialization fails before its listeners exist.
    window.addEventListener('keydown', onEscape, true)
    return () => window.removeEventListener('keydown', onEscape, true)
  }, [])
  useEffect(() => {
    const element = canvas.current
    const renderer = createRenderer(element)
    if (!renderer) {
      setHud(h => ({ ...h, phase: 'unavailable' }))
      return
    }
    let run = createRun(undefined, challenge.current ? 'endless' : 'intro'),
      frame = 0,
      previous = 0,
      lastHud = 0,
      width = 900,
      height = 400
    let samples = [],
      intervals = [],
      slowWindows = 0,
      totalFrames = 0
    const keys = new Set()
    const taps = new Set()
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      if (
        run.phase === 'lost' &&
        leaderboardRun.current &&
        !leaderboardRun.current.result
      ) {
        leaderboardRun.current.result = {
          durationMs: Math.floor(run.time * 1000),
          kills: run.kills,
          bosses: run.bosses,
          level: run.level
        }
        setRankingEntry(leaderboardRun.current)
      }
      setHud(snapshot(run))
      element.dataset.playerPosition = `${Math.round(run.player.x)},${Math.round(run.player.y)}`
      element.dataset.enemies = String(run.enemies.length)
      element.dataset.quality = run.quality
      element.dataset.frames = String(totalFrames)
    }
    const draw = () => renderer.draw(run, motion.matches)
    const resize = () => {
      const rect = element.getBoundingClientRect()
      width = rect.width
      height = rect.height
      renderer.resize(width, height, run.quality)
      draw()
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      keys.clear()
      taps.clear()
    }
    function tick(now) {
      frame = 0
      if (run.phase !== 'playing') return
      const elapsed = previous ? (now - previous) / 1000 : 1 / 60
      if (previous) intervals.push(now - previous)
      previous = now
      const start = performance.now()
      const pressed = code => keys.has(code) || taps.has(code)
      stepRun(
        run,
        {
          x:
            Number(pressed('KeyD') || pressed('ArrowRight')) -
            Number(pressed('KeyA') || pressed('ArrowLeft')),
          y:
            Number(pressed('KeyS') || pressed('ArrowDown')) -
            Number(pressed('KeyW') || pressed('ArrowUp'))
        },
        elapsed,
        width,
        height
      )
      taps.clear()
      draw()
      samples.push(performance.now() - start)
      totalFrames++
      if (samples.length >= 120) {
        const verdict = assessPerformance(samples, run.quality, slowWindows)
        slowWindows = verdict.slowWindows
        element.dataset.frameWorkP95 = verdict.p95.toFixed(2)
        const sorted = intervals.sort((a, b) => a - b)
        element.dataset.frameIntervalP95 = (
          sorted[Math.floor(sorted.length * 0.95)] || 0
        ).toFixed(2)
        if (run.quality !== verdict.quality) {
          run.quality = verdict.quality
          run.sparks = []
          resize()
        }
        if (verdict.stop && run.phase === 'playing') {
          run.phase = 'unavailable'
          stop()
        }
        samples = []
        intervals = []
      }
      if (now - lastHud > 100 || run.phase !== 'playing') {
        sync()
        lastHud = now
      }
      if (run.phase === 'playing') frame = requestAnimationFrame(tick)
      else stop()
    }
    const start = () => {
      if (document.hidden) return
      if (
        run.phase === 'ready' &&
        run.mode === 'endless' &&
        LEADERBOARD_ENABLED
      ) {
        leaderboardRun.current = beginLeaderboardRun()
        setRankingEntry(leaderboardRun.current)
      }
      run.phase = 'playing'
      previous = 0
      keys.clear()
      sync()
      element.focus({ preventScroll: true })
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const pause = () => {
      keys.clear()
      if (run.phase !== 'playing') return
      run.phase = 'paused'
      stop()
      sync()
      draw()
    }
    const onKeyDown = event => {
      if (rankingDialog.current?.open) return
      if (event.target.closest?.('input, textarea, [contenteditable="true"]'))
        return
      if (event.code === 'KeyP' && !event.repeat) {
        event.preventDefault()
        if (run.phase === 'playing') pause()
        else if (run.phase === 'paused') start()
        return
      }
      if (
        handleMovementKey(event, run.phase, {
          move: code => {
            keys.add(code)
            taps.add(code)
          },
          select: direction => {
            const choices = Array.from(
              panel.current.querySelectorAll('.survivors-choices button')
            )
            if (!choices.length) return
            const current = choices.indexOf(document.activeElement)
            const next =
              current < 0
                ? 0
                : (current + direction + choices.length) % choices.length
            choices[next].focus({ preventScroll: true })
          }
        })
      )
        return
      if (run.phase === 'upgrade' && /^Digit[123]$/.test(event.code)) {
        event.preventDefault()
        const choice = run.choices[Number(event.code.slice(-1)) - 1]
        if (choice && chooseUpgrade(run, choice.id)) start()
      }
    }
    const onKeyUp = event => keys.delete(event.code)
    const onVisibility = () => {
      if (document.hidden) pause()
    }
    actions.current = {
      start,
      pause,
      restart: () => {
        stop()
        run = createRun(undefined, challenge.current ? 'endless' : 'intro')
        samples = []
        intervals = []
        slowWindows = 0
        start()
      },
      upgrade: id => {
        if (chooseUpgrade(run, id)) start()
      }
    }
    const root = panel.current
    root.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const visibility = new IntersectionObserver(
      entries => {
        if (entries[0].intersectionRatio < 0.45) pause()
      },
      { threshold: [0, 0.45] }
    )
    visibility.observe(element)
    resize()
    sync()
    return () => {
      stop()
      actions.current = null
      observer.disconnect()
      visibility.disconnect()
      root.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  useEffect(() => {
    if (hud.phase !== 'playing')
      panel.current
        ?.querySelector('.survivors-overlay button')
        ?.focus({ preventScroll: true })
  }, [hud.phase])
  useEffect(() => {
    const dialog = rankingDialog.current
    if (!dialog) return
    if (rankingOpen && !dialog.open) {
      dialog.showModal()
      dialog.querySelector('input:not(:disabled)')?.focus()
    } else if (!rankingOpen && dialog.open) {
      dialog.close()
    }
  }, [rankingOpen])
  const openRankings = () => {
    actions.current?.pause()
    setRankingOpen(true)
  }
  const time = `${String(Math.floor(hud.time / 60)).padStart(2, '0')}:${String(hud.time % 60).padStart(2, '0')}`
  return (
    <div
      ref={panel}
      className='medium-survivors'
      data-phase={hud.phase}
      data-mode={hud.mode}
    >
      <div className='survivors-heading'>
        <div>
          <span className='survivors-kicker'>
            {hud.mode === 'endless'
              ? `ENDLESS / WAVE ${hud.wave}`
              : 'FIRST NIGHT / 60 SECONDS'}
          </span>
          <h2>
            棘夜 <span>QUILL SURVIVORS</span>
          </h2>
        </div>
        {LEADERBOARD_ENABLED && (
          <button
            type='button'
            className='survivors-ranking-button'
            aria-haspopup='dialog'
            onClick={openRankings}
          >
            排行榜 <small>TOP 20</small>
          </button>
        )}
      </div>
      {LEADERBOARD_ENABLED && hud.phase === 'ready' && (
        <p className='survivors-ranking-note'>
          {hud.mode === 'endless'
            ? '本局参与无限挑战，结束后可填写昵称上传成绩。'
            : '通关后解锁无限挑战排行榜。首次一分钟关卡不计排名。'}
        </p>
      )}
      <div className='survivors-arena'>
        <canvas
          ref={canvas}
          tabIndex={0}
          aria-label='刺猬生存战场，用 WASD 或方向键移动，自动攻击，P 暂停，Esc 返回博客'
        />
        <div className='survivors-hud' aria-label='游戏状态'>
          <div
            className='survivors-stat survivors-health'
            aria-label={`生命 ${hud.hp}/${hud.maxHp}`}
          >
            <span>
              ♥ {hud.hp}
              <small> / {hud.maxHp}</small>
            </span>
            <div className='survivors-health-track' aria-hidden='true'>
              <span style={{ width: `${(100 * hud.hp) / hud.maxHp}%` }} />
            </div>
          </div>
          <div
            className='survivors-stat survivors-clock'
            aria-label={`已生存 ${hud.time} 秒，${hud.mode === 'endless' ? '无限挑战' : '目标 60 秒'}`}
          >
            {time}
            <small>
              {hud.mode === 'endless' ? ` / ∞ · 第 ${hud.wave} 波` : ' / 01:00'}
            </small>
          </div>
          <div className='survivors-stat survivors-combat'>
            <span>
              击退 <b>{hud.kills}</b>
            </span>
            <button
              type='button'
              disabled={hud.phase !== 'playing'}
              onClick={() => actions.current?.pause()}
              aria-label='暂停游戏'
            >
              Ⅱ
            </button>
            <button
              type='button'
              className='survivors-exit'
              onClick={onClose}
              aria-label='退出游戏，返回个人信息'
            >
              退出 <span aria-hidden='true'>×</span>
            </button>
          </div>
        </div>
        <div className='survivors-xp-hud'>
          <span>LV.{String(hud.level).padStart(2, '0')}</span>
          <div
            className='survivors-xp'
            role='progressbar'
            aria-label='升级经验'
            aria-valuenow={Math.min(hud.xp, hud.nextXp)}
            aria-valuemax={hud.nextXp}
            aria-valuemin={0}
          >
            <span
              style={{
                width: `${Math.min(100, (hud.xp / hud.nextXp) * 100)}%`
              }}
            />
          </div>
          <small>
            {hud.xp} / {hud.nextXp}
          </small>
        </div>
        {hud.boss && hud.phase === 'playing' && (
          <span className='survivors-boss-warning'>夜巡者出现了</span>
        )}
        {hud.phase !== 'playing' && (
          <div className='survivors-overlay'>
            {hud.phase === 'ready' && (
              <>
                <svg
                  className='survivors-hero'
                  viewBox='0 0 16 16'
                  aria-label='奶白脸、棕色刺背的像素刺猬'
                  role='img'
                  shapeRendering='crispEdges'
                >
                  {HEDGEHOG.flatMap((row, y) =>
                    [...row].map((pixel, x) =>
                      HEDGEHOG_COLORS[pixel] ? (
                        <rect
                          key={`${x}-${y}`}
                          x={x}
                          y={y}
                          width='1'
                          height='1'
                          fill={HEDGEHOG_COLORS[pixel]}
                        />
                      ) : null
                    )
                  )}
                </svg>
                <p className='survivors-overlay-kicker'>
                  A SMALL HEDGEHOG. A LONG NIGHT.
                </p>
                <h3>
                  {hud.mode === 'endless'
                    ? '这次，看看能走多远。'
                    : '陪小刺猬散步一分钟。'}
                </h3>
                <p>
                  {hud.mode === 'endless'
                    ? '没有终点。每 30 秒更危险，每分钟迎战夜巡者。'
                    : '移动躲开敌人，飞刺会自动攻击。拾起微光，选择新能力。'}
                </p>
                <button
                  type='button'
                  className='survivors-primary'
                  onClick={() => actions.current?.start()}
                >
                  出发 <span>↗</span>
                </button>
              </>
            )}
            {hud.phase === 'upgrade' && (
              <>
                <p className='survivors-overlay-kicker'>
                  LEVEL {hud.level} / MAKE IT YOURS
                </p>
                <h3>长出一点新本事</h3>
                <p>方向键 / WASD 选择，Enter 确认；也可按 1 / 2 / 3。</p>
                <div className='survivors-choices'>
                  {hud.choices.map((choice, i) => (
                    <button
                      type='button'
                      key={choice.id}
                      onClick={() => actions.current?.upgrade(choice.id)}
                    >
                      <span className='survivors-choice-mark'>
                        {choice.mark}
                      </span>
                      <strong>{choice.name}</strong>
                      <span>{choice.detail}</span>
                      <small>0{i + 1}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            {hud.phase === 'paused' && (
              <>
                <p className='survivors-overlay-kicker'>TAKE A BREATH</p>
                <h3>夜色替你等一会儿</h3>
                <p>准备好，再继续。</p>
                <button
                  type='button'
                  className='survivors-primary'
                  onClick={() => actions.current?.start()}
                >
                  继续夜行 →
                </button>
              </>
            )}
            {hud.phase === 'won' && (
              <>
                <p className='survivors-overlay-kicker'>
                  SECRET CHAPTER UNLOCKED
                </p>
                <h3>恭喜通关！你发现了隐藏主题。</h3>
                <p>一分钟的散步，通往另一个世界。</p>
                {LEADERBOARD_ENABLED && (
                  <p>无限挑战排行榜已解锁，再次点击头像即可挑战。</p>
                )}
                <div
                  className='survivors-countdown'
                  role='status'
                  aria-live='polite'
                >
                  {reward.stage === 'countdown' ? (
                    <>
                      <strong>{reward.seconds}</strong>
                      <span>秒后开启隐藏主题</span>
                    </>
                  ) : reward.stage === 'loading' ? (
                    '正在展开另一个世界…'
                  ) : reward.stage === 'error' ? (
                    '奖励已保存，主题暂时没能打开。'
                  ) : (
                    '奖励已保存，可通过主题菜单再次开启。'
                  )}
                </div>
                {reward.stage === 'error' && (
                  <button
                    type='button'
                    className='survivors-primary'
                    onClick={reward.retry}
                  >
                    重试开启主题 ↗
                  </button>
                )}
                {reward.stage === 'saved' && (
                  <button
                    type='button'
                    className='survivors-primary'
                    onClick={onClose}
                  >
                    返回博客 →
                  </button>
                )}
              </>
            )}
            {hud.phase === 'lost' && (
              <>
                <p className='survivors-overlay-kicker'>
                  ANOTHER NIGHT, ANOTHER TRY
                </p>
                <h3>先回窝，暖一暖。</h3>
                <p>
                  生存 {time}
                  {hud.mode === 'endless'
                    ? ` · 第 ${hud.wave} 波 · 首领 ${hud.bosses}`
                    : ` / ${RUN_SECONDS} 秒`}{' '}
                  · 击退 {hud.kills} · LV.
                  {hud.level}
                </p>
                <div className='survivors-end-actions'>
                  {LEADERBOARD_ENABLED && hud.mode === 'endless' && (
                    <button
                      type='button'
                      className='survivors-primary'
                      aria-haspopup='dialog'
                      onClick={openRankings}
                    >
                      上传成绩 / 查看排名 ↗
                    </button>
                  )}
                  <button
                    type='button'
                    className='survivors-primary'
                    onClick={() => actions.current?.restart()}
                  >
                    再出发一次 ↗
                  </button>
                  <button
                    type='button'
                    className='survivors-primary survivors-secondary'
                    onClick={onClose}
                  >
                    返回博客
                  </button>
                </div>
              </>
            )}
            {hud.phase === 'unavailable' && (
              <>
                <h3>今晚先歇一歇</h3>
                <p>当前设备运行不够流畅，回到文章里逛逛吧。</p>
                <button
                  type='button'
                  className='survivors-primary'
                  onClick={onClose}
                >
                  返回博客 →
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className='survivors-footer'>
        <span>
          <kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> 移动 · 自动攻击
        </span>
        <span>
          拾取微光升级 · <kbd>1 2 3</kbd> 选择强化 · <kbd>P</kbd> 暂停 ·{' '}
          <kbd>ESC</kbd> 返回
        </span>
      </div>
      {LEADERBOARD_ENABLED && (
        <dialog
          ref={rankingDialog}
          className='survivors-ranking-dialog'
          aria-labelledby='survivors-ranking-title'
          onCancel={event => {
            event.preventDefault()
            setRankingOpen(false)
          }}
          onClose={() => setRankingOpen(false)}
        >
          <div className='survivors-ranking-heading'>
            <h3 id='survivors-ranking-title'>无限挑战排行榜</h3>
            <button
              type='button'
              className='survivors-ranking-button'
              onClick={() => setRankingOpen(false)}
              aria-label='关闭排行榜'
            >
              关闭 ×
            </button>
          </div>
          <p className='survivors-ranking-note'>
            {hud.mode !== 'endless'
              ? '通关首次一分钟关卡后，再次点击头像即可参加无限挑战。'
              : hud.phase === 'lost'
                ? `本局生存 ${time} · 击退 ${hud.kills} · 首领 ${hud.bosses}。填写昵称后手动上传。`
                : '按生存时间排名，每个浏览器保留最佳成绩。挑战结束后可上传。'}
          </p>
          <SurvivorsLeaderboard
            entry={rankingEntry}
            finished={hud.mode === 'endless' && hud.phase === 'lost'}
            active={rankingOpen}
          />
        </dialog>
      )}
      <style jsx>{`
        .survivors-countdown {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          min-height: 78px;
          margin: 14px 0;
          color: #f1d3a0;
        }
        .survivors-countdown strong {
          font: 700 58px/1 monospace;
        }
        .medium-survivors {
          margin: 15px 0 24px;
          color: var(--ink);
        }
        .survivors-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 0 14px;
        }
        .survivors-kicker {
          color: var(--muted);
          font: 9px monospace;
          letter-spacing: 0.18em;
        }
        .survivors-ranking-button {
          flex-shrink: 0;
          padding: 9px 13px;
          border: 1px solid var(--border, #cad0c8);
          border-radius: 5px;
          background: transparent;
          color: var(--ink);
          font-size: 13px;
          cursor: pointer;
        }
        .survivors-ranking-button small {
          margin-left: 8px;
          color: var(--muted);
          font: 10px monospace;
        }
        .survivors-ranking-button:hover,
        .survivors-ranking-button:focus-visible {
          background: rgba(135, 167, 119, 0.16);
          outline: 1px solid currentColor;
          outline-offset: 3px;
        }
        .survivors-ranking-note {
          margin: 0 0 14px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }
        .survivors-ranking-dialog {
          width: min(640px, calc(100vw - 32px));
          max-height: calc(100dvh - 48px);
          margin: auto;
          padding: 24px;
          border: 1px solid var(--border, #cad0c8);
          border-radius: 10px;
          background: var(--paper, #f7f8f4);
          color: var(--ink);
          box-shadow: 0 20px 70px #0004;
          overflow: auto;
        }
        .survivors-ranking-dialog::backdrop {
          background: #102019aa;
        }
        .survivors-ranking-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        .survivors-ranking-heading h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }
        .survivors-heading h2 {
          font:
            500 23px 'Noto Serif SC',
            serif;
          margin-top: 3px;
        }
        .survivors-heading h2 span {
          margin-left: 10px;
          color: var(--muted);
          font: 9px monospace;
          letter-spacing: 0.13em;
        }
        .survivors-hud {
          position: absolute;
          z-index: 3;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          pointer-events: none;
          color: #e8ebd8;
          font: 12px monospace;
          font-variant-numeric: tabular-nums;
        }
        .survivors-stat {
          padding: 8px 11px;
          background: #102019e8;
          border: 1px solid #72866a66;
        }
        .survivors-hud small {
          color: #a0b198;
          font-size: 10px;
        }
        .survivors-health {
          color: #e3b899;
          min-width: 92px;
        }
        .survivors-health-track {
          height: 3px;
          margin-top: 6px;
          background: #435140;
        }
        .survivors-health-track span {
          display: block;
          height: 100%;
          background: #d8a78b;
          transition: width 120ms;
        }
        .survivors-clock {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 19px;
          letter-spacing: 0.04em;
        }
        .survivors-combat {
          display: flex;
          gap: 15px;
          align-items: center;
          padding: 4px 5px 4px 11px;
        }
        .survivors-combat b {
          font-weight: 400;
          color: #e4d594;
        }
        .survivors-hud button {
          pointer-events: auto;
          width: 30px;
          height: 30px;
          color: #e8ebd8;
          border: 1px solid #72866a88;
          cursor: pointer;
        }
        .survivors-hud .survivors-exit {
          width: auto;
          min-width: 58px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .survivors-hud button:not(:disabled):is(:hover, :focus-visible) {
          background: #435140;
          outline: 1px solid #d9d8b3;
          outline-offset: 2px;
        }
        .survivors-end-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .survivors-end-actions .survivors-secondary {
          justify-content: center;
          background: transparent;
        }
        .survivors-hud button:disabled {
          opacity: 0.3;
          cursor: default;
        }
        .survivors-xp-hud {
          position: absolute;
          z-index: 3;
          bottom: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px;
          background: #102019d9;
          color: #c9d8ad;
          pointer-events: none;
          font: 10px monospace;
        }
        .survivors-xp-hud small {
          color: #a0b198;
          min-width: 42px;
          text-align: right;
        }
        .survivors-xp {
          flex: 1;
          height: 5px;
          background: #344537;
        }
        .survivors-xp span {
          display: block;
          height: 100%;
          background: #b3cf88;
          transition: width 150ms linear;
        }
        .survivors-arena {
          position: relative;
          background: #172720;
          overflow: hidden;
        }
        canvas {
          display: block;
          width: 100%;
          height: clamp(390px, 48vh, 480px);
          outline: none;
          image-rendering: pixelated;
        }
        canvas:focus-visible {
          box-shadow: inset 0 0 0 1px #bed4b0;
        }
        .survivors-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 2;
          padding: 70px 22px 48px;
          background: #172720ed;
          color: #e7e8d5;
          text-align: center;
        }
        .survivors-hero {
          width: 72px;
          height: 72px;
          margin-bottom: 8px;
        }
        .survivors-overlay-kicker {
          font: 9px monospace !important;
          letter-spacing: 0.2em;
          color: #91a58d !important;
          margin: 0 0 12px !important;
        }
        .survivors-overlay h3 {
          font:
            500 26px 'Noto Serif SC',
            serif;
          letter-spacing: 0.04em;
        }
        .survivors-overlay p {
          font-size: 12px;
          color: #a1b1a1;
          margin: 12px 0 0;
        }
        .survivors-primary {
          display: flex;
          justify-content: space-between;
          gap: 38px;
          min-width: 150px;
          padding: 11px 20px;
          margin-top: 24px;
          border: 1px solid #9aac8f;
          color: #e7e8d5;
          font-size: 12px;
          cursor: pointer;
          background: #293e30;
        }
        .survivors-primary:hover,
        .survivors-primary:focus-visible {
          background: #40583f;
          outline: 1px solid #d7dfb9;
          outline-offset: 4px;
        }
        .survivors-choices {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          width: min(660px, 100%);
          gap: 12px;
          margin-top: 22px;
        }
        .survivors-choices button {
          position: relative;
          padding: 16px;
          background: #21372b;
          border: 1px solid #516b51;
          text-align: left;
          cursor: pointer;
          transition: transform 100ms;
        }
        .survivors-choices button:hover,
        .survivors-choices button:focus-visible {
          transform: translateY(-4px);
          background: #304834;
          outline: 1px solid #c8d4af;
        }
        .survivors-choice-mark {
          display: block;
          color: #c8d4af;
          font-size: 24px;
          margin-bottom: 12px;
        }
        .survivors-choices strong {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .survivors-choices button > span:not(.survivors-choice-mark) {
          display: block;
          color: #a1b1a1;
          font-size: 11px;
          line-height: 1.8;
        }
        .survivors-choices small {
          position: absolute;
          right: 12px;
          top: 12px;
          color: #80947a;
          font: 10px monospace;
        }
        .survivors-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted);
          font-size: 10px;
          padding-top: 12px;
        }
        kbd {
          font: 10px monospace;
        }
        .survivors-boss-warning {
          position: absolute;
          left: 50%;
          top: 66px;
          transform: translateX(-50%);
          color: #ecc4a6;
          font-size: 11px;
          letter-spacing: 0.2em;
          pointer-events: none;
        }
        @media (max-width: 950px) {
          .survivors-hud {
            gap: 10px;
          }
          .survivors-heading h2 span {
            display: none;
          }
          .survivors-footer {
            flex-wrap: wrap;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
