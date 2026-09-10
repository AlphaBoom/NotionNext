import { memo, useEffect, useId, useRef, useState } from 'react'
import { HEDGEHOG, HEDGEHOG_COLORS } from '../lib/hedgehogSprite'
import {
  createRunner,
  gateLabel,
  moveRunner,
  PLAYER_LINE,
  stepRunner,
  swipeLane,
  RUN_SECONDS
} from '../lib/hedgehogRunner'
import {
  RUNNER_UPGRADES,
  RUNNER_EVOLUTIONS,
  RUNNER_BUILD_SLOTS,
  runnerSlots,
  runnerChoiceLevel,
  canRerollRunner,
  chooseRunnerUpgrade,
  rerollRunner
} from '../lib/runnerUpgrades'
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
  upgrades: { ...run.upgrades },
  slots: runnerSlots(run),
  choiceLevel: runnerChoiceLevel(run),
  canReroll: canRerollRunner(run),
  warnings: run.warnings.map(warning => ({ ...warning })),
  items: run.items.map(item => ({ ...item })),
  shots: run.shots.map(shot => ({ ...shot })),
  effects: run.effects.map(effect => ({ ...effect }))
})
const clock = seconds =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export default function SecretRunner({ onClose, onVictory, unlocked = false }) {
  const panel = useRef(null),
    board = useRef(null),
    actions = useRef(null),
    build = useRef(null),
    gesture = useRef(null)
  const close = useRef(onClose),
    challenge = useRef(unlocked)
  close.current = onClose
  challenge.current = unlocked
  const [hud, setHud] = useState(() =>
    createRunner(unlocked ? 'endless' : 'intro')
  )
  const [choiceReady, setChoiceReady] = useState(false)
  useEffect(() => {
    setChoiceReady(false)
    if (hud.phase !== 'upgrade') return
    const timer = setTimeout(() => setChoiceReady(true), 300)
    return () => clearTimeout(timer)
  }, [hud.phase, hud.pendingUpgrades, hud.choices])
  useEffect(() => {
    if (choiceReady)
      panel.current
        ?.querySelector('.runner-choice')
        ?.focus({ preventScroll: true })
  }, [choiceReady])
  const reward = useVictoryReveal(hud.phase, onVictory, () => close.current())
  const spriteId = `runner-${useId().replace(/:/g, '')}`

  useEffect(() => {
    let run = createRunner(challenge.current ? 'endless' : 'intro')
    let frame = 0,
      previous = 0,
      lastPaint = 0,
      inView = true,
      activeWindow = true,
      lastDecision = -Infinity,
      decisionAfter = 0,
      choiceSignature = ''
    const sync = () => {
      const signature =
        run.phase === 'upgrade'
          ? `${run.pendingUpgrades}:${run.choices.map(u => u.id).join(',')}`
          : ''
      if (signature && signature !== choiceSignature)
        decisionAfter = performance.now() + 300
      choiceSignature = signature
      setHud(snapshot(run))
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      gesture.current = null
    }
    const pause = () => {
      gesture.current = null
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
        stepRunner(run, previous ? (now - previous) / 1000 : 1 / 30)
        previous = lastPaint = now
        sync()
      }
      if (run.phase === 'playing') frame = requestAnimationFrame(tick)
      else stop()
    }
    const start = () => {
      if (
        document.hidden ||
        !inView ||
        !['ready', 'paused'].includes(run.phase)
      )
        return
      activeWindow = true
      if (build.current) build.current.open = false
      run.phase = 'playing'
      previous = lastPaint = 0
      sync()
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const move = lane => {
      moveRunner(run, lane)
      sync()
    }
    const choose = id => {
      if (
        document.hidden ||
        performance.now() < decisionAfter ||
        performance.now() - lastDecision < 300
      )
        return
      if (!chooseRunnerUpgrade(run, id)) return
      lastDecision = performance.now()
      gesture.current = null
      if (run.phase === 'playing') {
        if (!inView || !activeWindow || build.current?.open)
          run.phase = 'paused'
        else {
          previous = lastPaint = 0
          frame = requestAnimationFrame(tick)
        }
      }
      sync()
    }
    const reroll = () => {
      if (
        document.hidden ||
        performance.now() < decisionAfter ||
        performance.now() - lastDecision < 300
      )
        return
      if (!rerollRunner(run)) return
      lastDecision = performance.now()
      sync()
    }
    const onBlur = () => {
      activeWindow = false
      pause()
    }
    const onFocus = () => {
      activeWindow = true
    }
    const onVisibility = () => {
      if (document.hidden) {
        activeWindow = false
        pause()
      }
    }
    const onEscape = event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (!event.repeat) close.current()
    }
    const onKey = event => {
      if (run.phase === 'upgrade') {
        if (
          event.repeat &&
          ['Enter', ' ', '1', '2', '3', 'r', 'R'].includes(event.key)
        ) {
          event.preventDefault()
          return
        }
        if (['1', '2', '3'].includes(event.key)) {
          event.preventDefault()
          choose(run.choices[Number(event.key) - 1]?.id)
        } else if (event.key.toLowerCase() === 'r') {
          event.preventDefault()
          reroll()
        }
        return
      }
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
      choose,
      reroll,
      restart: () => {
        stop()
        run = createRunner(challenge.current ? 'endless' : 'intro')
        lastDecision = -Infinity
        sync()
        start()
      }
    }
    const root = panel.current
    root.addEventListener('keydown', onKey)
    window.addEventListener('keydown', onEscape, true)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new IntersectionObserver(
      entries => {
        inView = entries[0].intersectionRatio >= 0.6
        if (!inView) pause()
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
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
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
      axis: null,
      rect
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function pointerMove(event) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y
    if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 12) {
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (start.axis === 'y') return
    if (start.axis === 'x' && Math.abs(dx) >= 22) {
      if (event.cancelable) event.preventDefault()
      actions.current?.move(swipeLane(start.lane, dx, start.rect.width))
    }
  }
  function pointerUp(event) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    if (
      !start.axis &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) < 16
    ) {
      actions.current?.move(
        Math.floor((event.clientX - start.rect.left) / (start.rect.width / 2))
      )
    }
    gesture.current = null
  }

  function cancelGesture(event) {
    if (gesture.current?.id === event.pointerId) gesture.current = null
  }

  const playing = hud.phase === 'playing'
  const upgrade = hud.phase === 'upgrade'
  const enemyName = type =>
    ({ armored: '重甲', charger: '冲锋', elite: '精英', boss: '首领' })[type]
  const number = value =>
    value >= 1000000
      ? `${(value / 1000000).toFixed(1)}m`
      : value >= 10000
        ? `${(value / 1000).toFixed(1)}k`
        : String(Math.ceil(value))
  return (
    <div
      ref={panel}
      className='medium-runner'
      data-phase={hud.phase}
      data-mode={hud.mode}
    >
      <div className='runner-heading'>
        <h2>
          棘走 <span>QUILL RUSH</span>
        </h2>
        <small>
          {hud.mode === 'intro' ? `${RUN_SECONDS} SECOND RUN` : 'ENDLESS RUSH'}
        </small>
      </div>
      <div className='runner-hud' aria-label='跑道战斗状态'>
        <div>
          <strong aria-label={`生命 ${hud.hp}/${hud.maxHp}`}>
            ♥ {hud.hp}
            {hud.shield && <span aria-label='护盾就绪'> ⬡</span>}
          </strong>
          <small>击退 {hud.kills}</small>
        </div>
        <div className='runner-time'>
          {clock(hud.time)}
          {hud.mode === 'intro' && <small> / {clock(RUN_SECONDS)}</small>}
        </div>
        <button
          type='button'
          aria-label='暂停游戏'
          disabled={!playing}
          onClick={() => actions.current?.pause()}
        >
          Ⅱ
        </button>
        <button
          type='button'
          aria-label='退出游戏，返回个人信息'
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className='runner-power' aria-label={`当前火力 ${hud.power}`}>
        <span>
          火力 <b>{hud.power}</b>
        </span>
        <small>
          {hud.mode === 'endless'
            ? `第 ${hud.wave} 波 · ${hud.score} 分`
            : '自动射击'}
        </small>
      </div>

      {hud.mode === 'endless' && (
        <div className='runner-level'>
          <b>LV.{hud.level}</b>
          <progress
            max={hud.nextXp}
            value={hud.xp}
            aria-label={`等级 ${hud.level} 经验`}
          />
          <span>
            {Math.floor(hud.xp)} / {hud.nextXp}
          </span>
        </div>
      )}
      <div
        ref={board}
        className='runner-board'
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
      >
        <svg
          className='runner-scene'
          viewBox='0 0 300 360'
          preserveAspectRatio='none'
          role='img'
          aria-label={`刺猬在${['左', '右'][hud.lane]}跑道，火力 ${hud.power}，自动射击前方怪物`}
        >
          <defs>
            <Sprite id={spriteId} />
          </defs>
          <rect width='300' height='360' fill='#17342f' />
          {[0, 1].map(lane => (
            <g key={lane}>
              <rect
                x={lane * 150 + 5}
                y='0'
                width='140'
                height='360'
                fill={lane === hud.lane ? '#284b40' : '#203e37'}
              />
              {[0, 1, 2, 3, 4, 5].map(i => (
                <path
                  key={i}
                  d={`M ${lane * 150 + 68} ${((i * 72 + hud.time * 60) % 410) - 30} l 7 -7 l 7 7`}
                  fill='none'
                  stroke='#cfdfa431'
                  strokeWidth='2'
                />
              ))}
            </g>
          ))}
          <path d='M150 0V360' stroke='#d8e9ad44' strokeDasharray='10 14' />
          {hud.warnings.map(warning => (
            <g key={warning.id}>
              <rect
                x={warning.lane * 150 + 5}
                width='140'
                height='360'
                fill={warning.fired ? '#ffb36b99' : '#dd456b33'}
                stroke='#ffb6a0'
                strokeWidth='3'
                strokeDasharray='8 5'
              />
              <text
                x={75 + warning.lane * 150}
                y='244'
                textAnchor='middle'
                fill='#ffe0b5'
                fontSize='17'
                fontWeight='800'
              >
                {warning.fired
                  ? '轰！'
                  : `快换道 ${Math.max(0, warning.life).toFixed(1)}`}
              </text>
            </g>
          ))}
          {hud.shots.map(shot => (
            <g
              key={shot.id}
              transform={`translate(${75 + shot.lane * 150} ${shot.y * 360})`}
            >
              {(shot.power < 4
                ? [0]
                : shot.power < 16
                  ? [-5, 5]
                  : [-9, 0, 9]
              ).map(x => (
                <path
                  key={x}
                  d={`M${x} 9v-15`}
                  stroke={shot.critical ? '#f9b0ff' : '#ffe6a5'}
                  strokeWidth='3'
                  strokeLinecap='round'
                />
              ))}
            </g>
          ))}
          {hud.items.map(item => (
            <g
              key={item.id}
              transform={`translate(${75 + item.lane * 150} ${item.y * 360})`}
            >
              {item.kind === 'gate' ? (
                <g>
                  <rect
                    x='-65'
                    y='-27'
                    width='130'
                    height='54'
                    rx='7'
                    fill={
                      item.value < 0
                        ? '#802f50ee'
                        : item.operation === 'multiply'
                          ? '#5d459aee'
                          : '#236e64ee'
                    }
                    stroke={
                      item.value < 0
                        ? '#ffa5b9'
                        : item.operation === 'multiply'
                          ? '#d3b2ff'
                          : '#9bf2d5'
                    }
                    strokeWidth='2'
                  />
                  <path
                    d='M-62 34V-34 M62 34V-34'
                    stroke='#e8ffe4'
                    strokeWidth='4'
                  />
                  <text
                    y='9'
                    textAnchor='middle'
                    fill='#fff9e2'
                    fontSize='28'
                    fontWeight='800'
                    fontFamily='monospace'
                  >
                    {gateLabel(item)}
                  </text>
                </g>
              ) : (
                <g transform={item.type === 'boss' ? 'scale(1.25)' : undefined}>
                  {enemyName(item.type) && (
                    <text
                      y='-46'
                      textAnchor='middle'
                      fill={item.type === 'boss' ? '#ffd89d' : '#f8cedc'}
                      fontSize='13'
                      fontWeight='700'
                    >
                      {enemyName(item.type)}
                    </text>
                  )}
                  {item.charge === 'warning' && (
                    <g>
                      <path
                        d='M-30 32V115 M30 32V115'
                        stroke='#ffc184'
                        strokeWidth='3'
                        strokeDasharray='7 5'
                      />
                      <text
                        y='66'
                        textAnchor='middle'
                        fill='#ffe0b5'
                        fontSize='14'
                      >
                        即将冲锋
                      </text>
                    </g>
                  )}
                  {item.slow > 0 && (
                    <circle
                      r='35'
                      fill='none'
                      stroke='#8de4fa'
                      strokeWidth='2'
                    />
                  )}
                  <ellipse cy='27' rx='29' ry='6' fill='#061d2566' />
                  <path
                    d={
                      item.heavy
                        ? 'M-28 19 -32-7 -22-10 -26-26 -10-20 0-29 10-20 26-26 22-10 32-7 28 19 17 27 -17 27Z'
                        : 'M-22 18 -25-9 -14-14 -17-23 -3-16 9-23 13-13 25-7 22 18 12 23 -13 23Z'
                    }
                    fill={
                      item.hit > 0
                        ? '#fff4d4'
                        : item.type === 'boss'
                          ? '#94542f'
                          : item.heavy
                            ? '#874165'
                            : '#666092'
                    }
                    stroke='#e8a5b7'
                    strokeWidth='2'
                  />
                  <path
                    d='M-13-6 -5-3 M5-3 13-6'
                    stroke='#fff0be'
                    strokeWidth='4'
                  />
                  <text
                    y='17'
                    textAnchor='middle'
                    fill={item.hit > 0 ? '#392a50' : '#fff9e2'}
                    fontSize='14'
                    fontWeight='800'
                    fontFamily='monospace'
                  >
                    {number(item.hp)}
                  </text>
                  <rect
                    x='-26'
                    y='-39'
                    width='52'
                    height='4'
                    rx='2'
                    fill='#161d2c'
                  />
                  <rect
                    x='-26'
                    y='-39'
                    width={(52 * item.hp) / item.maxHp}
                    height='4'
                    rx='2'
                    fill='#f0a4b8'
                  />
                </g>
              )}
            </g>
          ))}
          <g
            className='runner-player'
            style={{
              transform: `translate(${75 + hud.lane * 150}px, ${PLAYER_LINE * 360}px)`
            }}
            opacity={hud.invincible > 0 ? 0.55 : 1}
          >
            {hud.shield && (
              <circle r='32' fill='none' stroke='#a2e9ef' strokeWidth='3' />
            )}
            <ellipse
              cy='21'
              rx='30'
              ry='10'
              fill='#b8f1b325'
              stroke='#b4e6bb66'
            />
            <use
              href={`#${spriteId}`}
              x='-25'
              y='-25'
              width='50'
              height='50'
              style={{ imageRendering: 'pixelated' }}
            />
            <rect
              x='-27'
              y='27'
              width='54'
              height='20'
              rx='10'
              fill='#e9d5a4'
            />
            <text
              y='41'
              textAnchor='middle'
              fill='#203c31'
              fontSize='13'
              fontWeight='800'
              fontFamily='monospace'
            >
              {hud.power}
            </text>
          </g>
          {hud.effects.map(effect => (
            <g
              key={effect.id}
              transform={`translate(${75 + effect.lane * 150} ${(effect.y - (0.8 - effect.life) * 0.1) * 360})`}
              opacity={Math.min(1, effect.life * 2.5)}
            >
              <circle
                r={8 + (0.8 - effect.life) * 38}
                fill='none'
                stroke={effect.kind === 'loss' ? '#ff99ad' : '#d1edac'}
                strokeWidth='2'
                opacity='.5'
              />
              <text
                textAnchor='middle'
                fill={effect.kind === 'loss' ? '#ffb5c7' : '#fff2b4'}
                stroke='#17342f'
                strokeWidth='3'
                paintOrder='stroke'
                fontSize={effect.kind === 'kill' ? 14 : 17}
                fontFamily='monospace'
                fontWeight='800'
              >
                {effect.label}
              </text>
            </g>
          ))}
        </svg>
        {hud.mode === 'intro' && (
          <progress
            className='runner-progress'
            max={RUN_SECONDS}
            value={hud.time}
            aria-label={`${RUN_SECONDS} 秒闯关进度`}
          />
        )}
        {!playing && (
          <div
            className={`runner-overlay${upgrade ? ' runner-upgrade-overlay' : ''}`}
          >
            {upgrade && (
              <>
                <div
                  className='runner-choice-heading'
                  role='status'
                  aria-live='polite'
                >
                  <span className='runner-eyebrow'>
                    LEVEL {hud.choiceLevel}
                  </span>
                  <h3>选一个，继续变强。</h3>
                  <p>
                    {hud.pendingUpgrades > 1
                      ? `还有 ${hud.pendingUpgrades} 次选择 · 战斗已暂停`
                      : '战斗已暂停 · 选好再出发'}
                  </p>
                </div>
                <div className='runner-choices' aria-label='选择强化'>
                  {hud.choices.map(choice => (
                    <button
                      key={`${hud.pendingUpgrades}-${choice.id}`}
                      type='button'
                      className={`runner-choice${choice.evolution ? ' runner-evolution' : ''}`}
                      disabled={!choiceReady}
                      onClick={() => actions.current?.choose(choice.id)}
                    >
                      <span className='runner-choice-mark' aria-hidden='true'>
                        {choice.mark}
                      </span>
                      <span>
                        <strong>{choice.name}</strong>
                        <small>{choice.detail}</small>
                      </span>
                      <em>
                        {choice.supply
                          ? '补给'
                          : choice.evolution
                            ? '进化'
                            : `${(hud.upgrades[choice.id] || 0) + 1}/${choice.max}`}
                      </em>
                    </button>
                  ))}
                </div>
                <button
                  type='button'
                  className='runner-reroll'
                  disabled={!choiceReady || !hud.canReroll}
                  onClick={() => actions.current?.reroll()}
                >
                  重抽 · 剩余 {hud.rerolls} 次
                </button>
              </>
            )}
            {hud.phase === 'ready' && (
              <>
                <span className='runner-eyebrow'>PICK A GATE. POWER UP.</span>
                <h3>
                  {hud.mode === 'intro'
                    ? '选扇门，火力翻倍。'
                    : '这次，冲多远？'}
                </h3>
                <p>
                  点按跑道，或左右滑动换道。
                  <br />
                  穿过 +2、×2 门强化飞刺，自动射击怪物。
                  <br />
                  {hud.mode === 'intro'
                    ? '躲开没打倒的怪物，别被撞到。'
                    : '击退升级三选一，组合能力迎战首领。'}
                </p>
                <button
                  className='runner-primary'
                  onClick={() => actions.current?.start()}
                >
                  开跑 ↗
                </button>
              </>
            )}
            {hud.phase === 'paused' && (
              <>
                <span className='runner-eyebrow'>TAKE A BREATH</span>
                <h3>休息一下，再开火。</h3>
                <p>准备好了，再继续前进。</p>
                <button
                  className='runner-primary'
                  onClick={() => actions.current?.start()}
                >
                  继续开跑 ↗
                </button>
              </>
            )}
            {hud.phase === 'lost' && (
              <>
                <span className='runner-eyebrow'>RUN COMPLETE</span>
                <h3>
                  {hud.mode === 'endless'
                    ? '本次远行，抵达这里。'
                    : '差一点，再来。'}
                </h3>
                <p>
                  坚持 {clock(hud.time)} · 击退 {hud.kills} 只怪物
                </p>
                {hud.mode === 'endless' && (
                  <div className='runner-results' aria-label='本局成绩'>
                    <div>
                      <b>{hud.score}</b>
                      <span>得分</span>
                    </div>
                    <div>
                      <b>{hud.level}</b>
                      <span>等级</span>
                    </div>
                    <div>
                      <b>{hud.bosses}</b>
                      <span>击退首领</span>
                    </div>
                  </div>
                )}
                <button
                  className='runner-primary'
                  onClick={() => actions.current?.restart()}
                >
                  再跑一次 ↗
                </button>
              </>
            )}
            {hud.phase === 'won' && (
              <div role='status' aria-live='polite'>
                <span className='runner-eyebrow'>SECRET FOUND</span>
                <h3>冲过去了。还有个惊喜！</h3>
                <p>隐藏主题已解锁。</p>
                {reward.stage === 'countdown' && (
                  <>
                    <b className='runner-countdown'>{reward.seconds}</b>
                    <p>即将开启我的另一面</p>
                  </>
                )}
                {reward.stage === 'loading' && <p>正在打开另一面…</p>}
                {reward.stage === 'error' && (
                  <>
                    <p>主题暂时没加载好，解锁记录已保留。</p>
                    <button className='runner-primary' onClick={reward.retry}>
                      再试一次
                    </button>
                  </>
                )}
                {reward.stage === 'saved' && (
                  <p>以后也能点左下角「主题」切换。</p>
                )}
              </div>
            )}
            <button className='runner-return' onClick={onClose}>
              返回博客
            </button>
          </div>
        )}
      </div>
      <div className='runner-controls' aria-label='选择跑道'>
        {['左边', '右边'].map((label, lane) => (
          <button
            key={label}
            type='button'
            aria-label={`移到${label}跑道`}
            aria-pressed={hud.lane === lane}
            disabled={!playing}
            onClick={() => actions.current?.move(lane)}
          >
            {['←', '→'][lane]} <span>{label}</span>
          </button>
        ))}
      </div>
      {hud.mode === 'endless' && (
        <details
          ref={build}
          className='runner-build'
          onToggle={event => {
            if (event.currentTarget.open) actions.current?.pause()
          }}
        >
          <summary>
            本局构筑{' '}
            <span>
              {hud.slots || 0}/{RUNNER_BUILD_SLOTS} · 查看能力与进化
            </span>
          </summary>
          <div className='runner-build-content'>
            {!Object.keys(hud.upgrades).length && (
              <p>击退敌人、穿过数字门获取经验，升级时选择能力。</p>
            )}
            {RUNNER_UPGRADES.filter(u => hud.upgrades[u.id]).map(u => (
              <p key={u.id}>
                <b>
                  {u.mark} {u.name} {u.supply ? '' : `Lv.${hud.upgrades[u.id]}`}
                </b>
                <span>{u.detail}</span>
              </p>
            ))}
            <h4>组合进化 · LV.10 起</h4>
            {RUNNER_EVOLUTIONS.map(u => (
              <p key={u.id}>
                <b>
                  {u.name}
                  {hud.upgrades[u.id] ? ' · 已进化' : ''}
                </b>
                <span>
                  {Object.entries(u.requires)
                    .map(
                      ([id, rank]) =>
                        `${RUNNER_UPGRADES.find(item => item.id === id).name} ${hud.upgrades[id] || 0}/${rank}`
                    )
                    .join(' ＋ ')}
                </span>
              </p>
            ))}
            <p>
              LV.3 专精 · LV.5 元素 · LV.8 协同
              <br />
              进化和补给不占槽位。首领奖励回血与重抽。
            </p>
          </div>
        </details>
      )}
      <p className='runner-hint'>
        {hud.mode === 'intro'
          ? '左右选门 · 飞刺自动发射'
          : '击退升级 · 六槽构筑 · 红色预警及时换道'}
      </p>
      <style jsx>{`
        .medium-runner {
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
        .runner-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 2px 12px;
        }
        .runner-heading h2 {
          font-size: 20px;
          font-weight: 700;
        }
        .runner-heading h2 span {
          display: block;
          color: #b7ccad;
          font: 12px monospace;
          letter-spacing: 0.1em;
        }
        .runner-heading > small {
          font: 12px monospace;
          color: #ceb883;
        }
        .runner-board {
          position: relative;
          overflow: hidden;
          height: clamp(280px, 48svh, 440px);
          border: 1px solid #91a18355;
          border-radius: 12px;
          touch-action: pan-y;
          user-select: none;
        }
        .runner-scene {
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .runner-player {
          transition: transform 80ms ease-out;
        }
        .runner-hud {
          position: relative;
          border-radius: 10px 10px 0 0;
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 53px;
          padding: 3px 5px 3px 10px;
          background: #102720ed;
          border-bottom: 1px solid #c8d4a944;
        }
        .runner-hud > div:first-child {
          min-width: 58px;
        }
        .runner-hud strong {
          color: #f5c49f;
          font: 700 14px monospace;
        }
        .runner-hud small {
          display: block;
          font-size: 12px;
          color: #c1d2ad;
        }
        .runner-time {
          flex: 1;
          white-space: nowrap;
          font: 700 15px monospace;
        }
        .runner-time small {
          display: inline;
          font: 12px monospace;
        }
        .runner-hud button {
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          color: #e9efd4;
          border: 1px solid #c3d0a655;
          border-radius: 9px;
          font-size: 22px;
          background: #294237;
        }
        .runner-hud button:disabled {
          opacity: 0.35;
        }
        .runner-power {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 12px;
          background: #102720ed;
          border-bottom: 1px solid #c8d4a933;
          font: 11px monospace;
          color: #c5d7af;
          pointer-events: none;
        }
        .runner-power b {
          color: #ffe2a0;
          font-size: 16px;
        }
        .runner-power small {
          font-size: 12px;
        }
        .runner-progress {
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
        .runner-progress::-webkit-progress-bar {
          background: #1d332e;
        }
        .runner-progress::-webkit-progress-value {
          background: #e8c283;
        }
        .runner-progress::-moz-progress-bar {
          background: #e8c283;
        }
        .runner-overlay {
          position: absolute;
          inset: 0;
          touch-action: pan-y;
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 16px;
          text-align: center;
          background: #152d26ed;
          overflow-y: auto;
        }
        .runner-overlay > * {
          flex-shrink: 0;
        }
        .runner-overlay::before,
        .runner-overlay::after {
          content: '';
          margin-block: auto;
        }
        .runner-eyebrow {
          font: 12px monospace;
          color: #dac493;
          letter-spacing: 0.14em;
        }
        .runner-overlay h3 {
          font-size: clamp(18px, 5vw, 24px);
          font-weight: 700;
          margin: 10px 0;
          color: #f4ecd1;
        }
        .runner-overlay p {
          margin: 0 0 12px;
          font-size: 14px;
          line-height: 1.9;
          color: #c8d6b9;
        }
        .runner-primary {
          min-height: 46px;
          padding: 10px 24px;
          border-radius: 9px;
          color: #263b2f;
          background: #ecd5a2;
          font-size: 14px;
          font-weight: 700;
        }
        .runner-return {
          min-height: 44px;
          padding: 10px 22px;
          color: #c8d6b9;
          font-size: 12px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .runner-countdown {
          display: block;
          font: 700 38px monospace;
          color: #ecd5a2;
        }
        .runner-controls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 10px;
        }
        .runner-controls button {
          min-height: 48px;
          border: 1px solid #8a9a7666;
          border-radius: 10px;
          font-size: 20px;
          color: #dbe5c4;
          background: #263f34;
          touch-action: manipulation;
        }
        .runner-controls button[aria-pressed='true'] {
          background: #d8c99b;
          color: #213b2e;
        }
        .runner-controls span {
          font-size: 14px;
        }
        .runner-controls button:disabled {
          opacity: 0.4;
        }
        .runner-hint {
          margin: 9px 0 0;
          text-align: center;
          font-size: 12px;
          color: #aec29f;
        }
        :global(#theme-medium) .medium-runner button:focus-visible {
          outline: 2px solid #f5dba1;
          outline-offset: -4px;
          border-radius: 9px;
        }
        :global(#theme-medium) .runner-primary:hover {
          color: #263b2f;
        }
        :global(#theme-medium) .runner-return:hover {
          color: #f5dba1;
        }
        :global(#theme-medium) .runner-controls button:hover,
        :global(#theme-medium) .runner-hud button:hover {
          color: #e9efd4;
        }
        :global(#theme-medium)
          .runner-controls
          button[aria-pressed='true']:hover {
          color: #213b2e;
        }

        .runner-level {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 9px 3px;
          font: 12px monospace;
          color: #cedbc3;
        }
        .runner-level b {
          color: #f6d598;
          font-size: 14px;
        }
        .runner-level progress {
          flex: 1;
          min-width: 20px;
          width: 0;
          height: 6px;
          border: 0;
          appearance: none;
        }
        .runner-level progress::-webkit-progress-bar {
          background: #344d3e;
          border-radius: 5px;
        }
        .runner-level progress::-webkit-progress-value {
          background: #d9b6f6;
          border-radius: 5px;
        }
        .runner-level progress::-moz-progress-bar {
          background: #d9b6f6;
        }
        .runner-upgrade-overlay {
          padding: 12px;
          background: #142b27f7;
        }
        .runner-upgrade-overlay::before,
        .runner-upgrade-overlay::after {
          display: none;
        }
        .runner-choice-heading {
          width: 100%;
          text-align: left;
        }
        .runner-choice-heading h3 {
          font-size: 18px;
          margin: 4px 0;
        }
        .runner-choice-heading p {
          font-size: 12px;
          margin-bottom: 10px;
        }
        .runner-choices {
          display: grid;
          width: 100%;
          gap: 8px;
        }
        .runner-choice {
          display: flex;
          gap: 9px;
          align-items: center;
          min-height: 76px;
          width: 100%;
          padding: 10px;
          border: 1px solid #8ca28b;
          border-radius: 10px;
          color: #f3edd7;
          background: #28443b;
          text-align: left;
          touch-action: manipulation;
        }
        .runner-choice-mark {
          flex: 0 0 25px;
          font-size: 24px;
          color: #ead09a;
          text-align: center;
        }
        .runner-choice > span:nth-child(2) {
          flex: 1;
          min-width: 0;
        }
        .runner-choice strong {
          display: block;
          font-size: 15px;
          line-height: 1.4;
        }
        .runner-choice small {
          display: block;
          margin-top: 3px;
          font-size: 13px;
          color: #d1ddcc;
          line-height: 1.5;
        }
        .runner-choice em {
          flex: 0 0 auto;
          color: #e6cda6;
          font: 12px monospace;
        }
        .runner-evolution {
          border-color: #dfb9ff;
          background: #403656;
        }
        .runner-choice:disabled {
          opacity: 0.65;
        }
        .runner-reroll {
          margin-top: 8px;
          min-height: 44px;
          width: 100%;
          border: 1px solid #7f9681;
          border-radius: 9px;
          color: #e8d5ae;
          font-size: 14px;
        }
        .runner-reroll:disabled {
          opacity: 0.4;
        }
        .runner-build {
          margin-top: 10px;
          border: 1px solid #7d947b66;
          border-radius: 10px;
          background: #1e372e;
        }
        .runner-build summary {
          min-height: 44px;
          padding: 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .runner-build summary span {
          font-size: 12px;
          color: #c1cfb3;
          margin-left: 6px;
        }
        .runner-build-content {
          padding: 0 12px 10px;
        }
        .runner-build-content p {
          font-size: 14px;
          line-height: 1.6;
          margin: 10px 0;
        }
        .runner-build-content b,
        .runner-build-content span {
          display: block;
        }
        .runner-build-content span {
          color: #c1cfb3;
          font-size: 13px;
        }
        .runner-build-content h4 {
          border-top: 1px solid #7d947b66;
          padding-top: 12px;
          margin-top: 14px;
          color: #dfb9ff;
          font-size: 14px;
        }
        .runner-results {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          width: 100%;
          margin-bottom: 18px;
        }
        .runner-results b,
        .runner-results span {
          display: block;
        }
        .runner-results b {
          font: 700 22px monospace;
          color: #f1d5a0;
        }
        .runner-results span {
          font-size: 12px;
          margin-top: 6px;
          color: #c8d6b9;
        }
        .medium-runner button:focus-visible,
        .runner-build summary:focus-visible {
          outline: 2px solid #f5dba1;
          outline-offset: -3px;
        }
        .medium-runner button {
          -webkit-tap-highlight-color: transparent;
        }
        @media (max-width: 360px) {
          .medium-runner {
            padding: 8px;
          }
          .runner-heading > small {
            font-size: 10px;
          }
          .runner-time {
            font-size: 13px;
          }
          .runner-hud {
            padding-left: 6px;
          }
          .runner-choice-mark {
            display: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .runner-player {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}
