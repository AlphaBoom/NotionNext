import { memo, useEffect, useId, useRef, useState } from 'react'
import { HEDGEHOG, HEDGEHOG_COLORS } from '../lib/hedgehogSprite'
import {
  createWalk,
  moveWalk,
  PLAYER_LINE,
  stepWalk,
  swipeLane,
  WALK_SECONDS
} from '../lib/hedgehogWalk'
import { useVictoryReveal } from '../lib/useVictoryReveal'

const Sprite = memo(function Sprite({ id }) {
  return (
    <symbol id={id} viewBox='0 0 16 16'>
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
    </symbol>
  )
})

const snapshot = run => ({
  ...run,
  items: run.items.map(item => ({ ...item }))
})
const clock = seconds =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export default function SecretWalk({ onClose, onVictory, unlocked = false }) {
  const panel = useRef(null),
    board = useRef(null),
    actions = useRef(null),
    gesture = useRef(null)
  const close = useRef(onClose),
    challenge = useRef(unlocked)
  close.current = onClose
  challenge.current = unlocked
  const [hud, setHud] = useState(() =>
    createWalk(unlocked ? 'endless' : 'intro')
  )
  const reward = useVictoryReveal(hud.phase, onVictory, () => close.current())
  const spriteId = `walk-${useId().replace(/:/g, '')}`

  useEffect(() => {
    let run = createWalk(challenge.current ? 'endless' : 'intro')
    let frame = 0,
      previous = 0,
      lastPaint = 0
    const sync = () => setHud(snapshot(run))
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      gesture.current = null
    }
    const pause = () => {
      if (run.phase !== 'playing') return
      run.phase = 'paused'
      stop()
      sync()
    }
    const tick = now => {
      frame = 0
      if (run.phase !== 'playing') return
      // A small SVG scene at 30 fps; neither game runs on the homepage itself.
      if (!lastPaint || now - lastPaint >= 1000 / 30) {
        stepWalk(run, previous ? (now - previous) / 1000 : 1 / 30)
        previous = lastPaint = now
        sync()
      }
      if (run.phase === 'playing') frame = requestAnimationFrame(tick)
      else stop()
    }
    const start = () => {
      if (document.hidden || !['ready', 'paused'].includes(run.phase)) return
      run.phase = 'playing'
      previous = lastPaint = 0
      sync()
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const move = lane => {
      moveWalk(run, lane)
      sync()
    }
    const onVisibility = () => {
      if (document.hidden) pause()
    }
    const onEscape = event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (!event.repeat) close.current()
    }
    const onKey = event => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) {
        event.preventDefault()
        move(run.lane + (['ArrowLeft', 'a'].includes(event.key) ? -1 : 1))
      } else if (event.key.toLowerCase() === 'p' && !event.repeat) {
        event.preventDefault()
        if (run.phase === 'playing') pause()
        else start()
      }
    }
    actions.current = {
      start,
      pause,
      move,
      restart: () => {
        stop()
        run = createWalk(challenge.current ? 'endless' : 'intro')
        start()
      }
    }
    const root = panel.current
    root.addEventListener('keydown', onKey)
    window.addEventListener('keydown', onEscape, true)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].intersectionRatio < 0.6) pause()
      },
      { threshold: [0, 0.6] }
    )
    observer.observe(board.current)
    sync()
    return () => {
      stop()
      actions.current = null
      observer.disconnect()
      root.removeEventListener('keydown', onKey)
      window.removeEventListener('keydown', onEscape, true)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  function pointerDown(event) {
    if (
      hud.phase !== 'playing' ||
      event.isPrimary === false ||
      event.button !== 0 ||
      event.target.closest('button')
    )
      return
    const rect = event.currentTarget.getBoundingClientRect()
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lane: hud.lane,
      rect
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function pointerMove(event) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= 22) {
      if (event.cancelable) event.preventDefault()
      actions.current?.move(swipeLane(start.lane, dx, start.rect.width))
    }
  }
  function pointerUp(event) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 16) {
      actions.current?.move(
        Math.floor((event.clientX - start.rect.left) / (start.rect.width / 3))
      )
    }
    gesture.current = null
  }

  const playing = hud.phase === 'playing'
  return (
    <div
      ref={panel}
      className='medium-walk'
      data-phase={hud.phase}
      data-mode={hud.mode}
    >
      <div className='walk-heading'>
        <h2>
          棘径 <span>HEDGEHOG WALK</span>
        </h2>
        <small>
          {hud.mode === 'intro' ? 'ONE LITTLE WALK' : 'ENDLESS WALK'}
        </small>
      </div>
      <div
        ref={board}
        className='walk-board'
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          gesture.current = null
        }}
      >
        <svg
          className='walk-scene'
          viewBox='0 0 300 360'
          preserveAspectRatio='none'
          role='img'
          aria-label={`刺猬在${['左', '中', '右'][hud.lane]}边小路，前方有石头和松果`}
        >
          <defs>
            <Sprite id={spriteId} />
          </defs>
          <rect width='300' height='360' fill='#172e2a' />
          {[0, 1, 2].map(lane => (
            <g key={lane}>
              <rect
                x={lane * 100 + 5}
                y='0'
                width='90'
                height='360'
                rx='40'
                fill={lane === hud.lane ? '#3b5040' : '#293e35'}
              />
              {[0, 1, 2, 3, 4, 5].map(i => (
                <path
                  key={i}
                  d={`M ${lane * 100 + 44} ${((i * 72 + hud.time * 35) % 410) - 30} l 6 -5 l 6 5`}
                  fill='none'
                  stroke='#d1d4a92b'
                  strokeWidth='2'
                />
              ))}
            </g>
          ))}
          {[20, 125, 240].map((y, i) => (
            <g key={y} stroke='#719276' strokeWidth='2' opacity='.55'>
              <path
                d={`M 3 ${y} l 6 -7 m -3 3 l -5 -5 M 297 ${y + 30} l -6 -7 m 3 3 l 5 -5`}
              />
            </g>
          ))}
          {hud.items.map(item => (
            <g
              key={item.id}
              transform={`translate(${50 + item.lane * 100} ${item.y * 360})`}
            >
              {item.kind === 'rock' ? (
                <>
                  <ellipse cy='12' rx='22' ry='5' fill='#10231f88' />
                  <path
                    d='M-21 8 -17 -8 -6 -17 13 -12 22 8 12 15 -13 14Z'
                    fill='#81908b'
                    stroke='#b1bdb1'
                    strokeWidth='2'
                  />
                  <path
                    d='M-17-8 -3-3 13-12 M-3-3 -7 10'
                    fill='none'
                    stroke='#a8b5a4'
                    strokeWidth='2'
                  />
                </>
              ) : (
                <>
                  <ellipse
                    rx='13'
                    ry='17'
                    fill='#e8bf80'
                    stroke='#835739'
                    strokeWidth='3'
                  />
                  <path
                    d='M-8-7 0-2 8-7 M-10 0 0 6 10 0 M-8 8 0 13 8 8 M0-15 2-21'
                    fill='none'
                    stroke='#9b6944'
                    strokeWidth='2'
                  />
                </>
              )}
            </g>
          ))}
          <g
            className='walk-player'
            style={{
              transform: `translate(${50 + hud.lane * 100}px, ${PLAYER_LINE * 360}px)`
            }}
            opacity={hud.invincible > 0 ? 0.65 : 1}
          >
            <ellipse cy='23' rx='26' ry='7' fill='#0b201d99' />
            <use
              href={`#${spriteId}`}
              x='-27'
              y='-27'
              width='54'
              height='54'
              style={{ imageRendering: 'pixelated' }}
            />
          </g>
          <path d='M32 340H268' stroke='#dacb9777' strokeDasharray='4 9' />
        </svg>
        <div className='walk-hud' aria-label='散步状态'>
          <div>
            <strong aria-label={`生命 ${hud.hp}/3`}>♥ {hud.hp}</strong>
            <small>松果 {hud.cones}</small>
          </div>
          <div className='walk-time'>
            {clock(hud.time)}
            {hud.mode === 'intro' && <small> / 01:00</small>}
          </div>
          <button
            type='button'
            aria-label='暂停散步'
            disabled={!playing}
            onClick={() => actions.current?.pause()}
          >
            Ⅱ
          </button>
          <button
            type='button'
            aria-label='退出散步，返回个人信息'
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {hud.mode === 'intro' && (
          <progress
            className='walk-progress'
            max={WALK_SECONDS}
            value={hud.time}
            aria-label='一分钟散步进度'
          />
        )}
        {!playing && (
          <div className='walk-overlay'>
            {hud.phase === 'ready' && (
              <>
                <span className='walk-eyebrow'>A LITTLE DETOUR</span>
                <h3>
                  {hud.mode === 'intro'
                    ? '一起散步一分钟。'
                    : '这次，能走多远？'}
                </h3>
                <p>
                  点按小路，或左右滑动换道。
                  <br />
                  避开石头，收集松果。每 6 颗恢复一格生命。
                </p>
                <button
                  className='walk-primary'
                  onClick={() => actions.current?.start()}
                >
                  出发 ↗
                </button>
              </>
            )}
            {hud.phase === 'paused' && (
              <>
                <span className='walk-eyebrow'>TAKE A BREATH</span>
                <h3>在这里歇一会儿。</h3>
                <p>准备好了，再继续走。</p>
                <button
                  className='walk-primary'
                  onClick={() => actions.current?.start()}
                >
                  继续散步 ↗
                </button>
              </>
            )}
            {hud.phase === 'lost' && (
              <>
                <span className='walk-eyebrow'>A GOOD LITTLE WALK</span>
                <h3>今天就走到这里。</h3>
                <p>
                  走了 {clock(hud.time)} · 收集 {hud.cones} 颗松果
                </p>
                <button
                  className='walk-primary'
                  onClick={() => actions.current?.restart()}
                >
                  再走一次 ↗
                </button>
              </>
            )}
            {hud.phase === 'won' && (
              <div role='status' aria-live='polite'>
                <span className='walk-eyebrow'>SECRET FOUND</span>
                <h3>走到了。还有个惊喜！</h3>
                <p>隐藏主题已解锁。</p>
                {reward.stage === 'countdown' && (
                  <>
                    <b className='walk-countdown'>{reward.seconds}</b>
                    <p>即将开启我的另一面</p>
                  </>
                )}
                {reward.stage === 'loading' && <p>正在打开另一面…</p>}
                {reward.stage === 'error' && (
                  <>
                    <p>主题暂时没加载好，解锁记录已保留。</p>
                    <button className='walk-primary' onClick={reward.retry}>
                      再试一次
                    </button>
                  </>
                )}
                {reward.stage === 'saved' && <p>以后也能在页脚切换主题。</p>}
              </div>
            )}
            <button className='walk-return' onClick={onClose}>
              返回博客
            </button>
          </div>
        )}
      </div>
      <div className='walk-controls' aria-label='选择小路'>
        {['左边', '中间', '右边'].map((label, lane) => (
          <button
            key={label}
            type='button'
            aria-label={`走${label}的小路`}
            aria-pressed={hud.lane === lane}
            disabled={!playing}
            onClick={() => actions.current?.move(lane)}
          >
            {['←', '●', '→'][lane]} <span>{label}</span>
          </button>
        ))}
      </div>
      <p className='walk-hint'>
        {hud.mode === 'intro'
          ? '小路由你选，慢慢来。'
          : `无尽散步 · ${hud.score} 分 · 速度会逐渐加快。`}
      </p>
      <style jsx>{`
        .medium-walk {
          width: 100%;
          max-width: 480px;
          margin: auto;
          padding: 12px;
          color: #e9efd4;
          background: #172e2a;
          border: 1px solid #84987b;
          border-radius: 18px;
          font-family: 'Noto Sans SC', sans-serif;
        }
        .walk-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 2px 12px;
        }
        .walk-heading h2 {
          font-size: 20px;
          font-weight: 700;
        }
        .walk-heading h2 span {
          display: block;
          color: #b7ccad;
          font: 8px monospace;
          letter-spacing: 0.1em;
        }
        .walk-heading > small {
          font: 8px monospace;
          color: #ceb883;
        }
        .walk-board {
          position: relative;
          overflow: hidden;
          height: clamp(280px, 53svh, 430px);
          border: 1px solid #91a18355;
          border-radius: 12px;
          touch-action: pan-y;
          user-select: none;
        }
        .walk-scene {
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .walk-player {
          transition: transform 80ms ease-out;
        }
        .walk-hud {
          position: absolute;
          inset: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 53px;
          padding: 3px 5px 3px 10px;
          background: #102720ed;
          border-bottom: 1px solid #c8d4a944;
        }
        .walk-hud > div:first-child {
          min-width: 58px;
        }
        .walk-hud strong {
          color: #f5c49f;
          font: 700 14px monospace;
        }
        .walk-hud small {
          display: block;
          font-size: 9px;
          color: #c1d2ad;
        }
        .walk-time {
          flex: 1;
          white-space: nowrap;
          font: 700 15px monospace;
        }
        .walk-time small {
          display: inline;
          font: 9px monospace;
        }
        .walk-hud button {
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          color: #e9efd4;
          border: 1px solid #c3d0a655;
          border-radius: 9px;
          font-size: 22px;
          background: #294237;
        }
        .walk-hud button:disabled {
          opacity: 0.35;
        }
        .walk-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          border: 0;
          appearance: none;
          background: #1d332e;
          color: #e8c283;
        }
        .walk-progress::-webkit-progress-bar {
          background: #1d332e;
        }
        .walk-progress::-webkit-progress-value {
          background: #e8c283;
        }
        .walk-progress::-moz-progress-bar {
          background: #e8c283;
        }
        .walk-overlay {
          position: absolute;
          inset: 54px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 16px;
          text-align: center;
          background: #152d26ed;
          overflow-y: auto;
        }
        .walk-eyebrow {
          font: 9px monospace;
          color: #dac493;
          letter-spacing: 0.14em;
        }
        .walk-overlay h3 {
          font-size: clamp(18px, 5vw, 24px);
          font-weight: 700;
          margin: 10px 0;
          color: #f4ecd1;
        }
        .walk-overlay p {
          margin: 0 0 12px;
          font-size: 11px;
          line-height: 1.9;
          color: #c8d6b9;
        }
        .walk-primary {
          min-height: 46px;
          padding: 10px 24px;
          border-radius: 9px;
          color: #263b2f;
          background: #ecd5a2;
          font-size: 14px;
          font-weight: 700;
        }
        .walk-return {
          min-height: 44px;
          padding: 10px 22px;
          color: #c8d6b9;
          font-size: 12px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .walk-countdown {
          display: block;
          font: 700 38px monospace;
          color: #ecd5a2;
        }
        .walk-controls {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 10px;
        }
        .walk-controls button {
          min-height: 48px;
          border: 1px solid #8a9a7666;
          border-radius: 10px;
          font-size: 20px;
          color: #dbe5c4;
          background: #263f34;
          touch-action: manipulation;
        }
        .walk-controls button[aria-pressed='true'] {
          background: #d8c99b;
          color: #213b2e;
        }
        .walk-controls span {
          font-size: 11px;
        }
        .walk-controls button:disabled {
          opacity: 0.4;
        }
        .walk-hint {
          margin: 9px 0 0;
          text-align: center;
          font-size: 10px;
          color: #aec29f;
        }
        :global(#theme-medium) .medium-walk button:focus-visible {
          outline: 2px solid #f5dba1;
          outline-offset: -4px;
          border-radius: 9px;
        }
        :global(#theme-medium) .walk-primary:hover {
          color: #263b2f;
        }
        :global(#theme-medium) .walk-return:hover {
          color: #f5dba1;
        }
        :global(#theme-medium) .walk-controls button:hover,
        :global(#theme-medium) .walk-hud button:hover {
          color: #e9efd4;
        }
        :global(#theme-medium)
          .walk-controls
          button[aria-pressed='true']:hover {
          color: #213b2e;
        }
        @media (prefers-reduced-motion: reduce) {
          .walk-player {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}
