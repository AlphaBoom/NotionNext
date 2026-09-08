import { useEffect, useRef, useState } from 'react'
import {
  createRun,
  LAST_FLOOR,
  move,
  SIZE,
  UPGRADES,
  upgrade
} from '../lib/dungeon'

const ART = {
  player: [
    '00111100',
    '01122110',
    '01222210',
    '01133110',
    '00111100',
    '01111110',
    '01111110',
    '00100100'
  ],
  slime: [
    '00000000',
    '00111100',
    '01111110',
    '11211211',
    '11311311',
    '11111111',
    '01111110',
    '01000010'
  ],
  warden: [
    '01011010',
    '01111110',
    '11211211',
    '11311311',
    '01111110',
    '11111111',
    '10111101',
    '00100100'
  ],
  potion: [
    '00011000',
    '00122100',
    '00011000',
    '00122100',
    '01111110',
    '01211110',
    '01111110',
    '00111100'
  ],
  exit: [
    '01111110',
    '01222210',
    '01233210',
    '01233210',
    '01233210',
    '01233210',
    '01233210',
    '11111111'
  ]
}
function Sprite({ kind }) {
  return (
    <svg
      className={`dungeon-sprite sprite-${kind}`}
      viewBox='0 0 8 8'
      aria-hidden='true'
      shapeRendering='crispEdges'
    >
      {ART[kind].flatMap((row, y) =>
        [...row].map(
          (pixel, x) =>
            pixel !== '0' && (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width='1'
                height='1'
                className={`pixel-${pixel}`}
              />
            )
        )
      )}
    </svg>
  )
}

export default function SecretDungeon({ onClose }) {
  const [run, setRun] = useState(createRun)
  const board = useRef(null)
  useEffect(() => {
    board.current?.focus({ preventScroll: true })
  }, [])
  function step(dx, dy) {
    setRun(current => move(current, dx, dy))
  }
  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    const keys = {
      ArrowUp: [0, -1],
      w: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
      ' ': [0, 0]
    }
    const action = keys[event.key] || keys[event.key.toLowerCase()]
    // Space must still activate focused controls (upgrades, replay and close).
    if (!action || (event.key === ' ' && event.target.tagName === 'BUTTON'))
      return
    event.preventDefault()
    if (!event.repeat) step(...action)
  }
  function restart() {
    setRun(createRun())
    board.current?.focus()
  }
  const ended = run.phase === 'won' || run.phase === 'lost'

  return (
    <div className='medium-dungeon'>
      <div className='dungeon-panel' onKeyDown={onKeyDown}>
        <div className='dungeon-heading'>
          <div>
            <p className='dungeon-eyebrow'>A SECRET BETWEEN PAGES</p>
            <h2>纸间迷宫</h2>
          </div>
        </div>
        <p className='dungeon-description'>三层随机地牢，一次小小的冒险。</p>
        <div className='dungeon-stats'>
          <span>
            深度{' '}
            <b>
              {run.floor} / {LAST_FLOOR}
            </b>
          </span>
          <span className='dungeon-health'>
            生命{' '}
            <b>
              {run.player.hp} / {run.player.maxHp}
            </b>
          </span>
          <span>
            攻击 <b>{run.player.attack}</b>
          </span>
          {run.player.shield > 0 && (
            <span>
              护盾 <b>{run.player.shield}</b>
            </span>
          )}
        </div>
        <div className='dungeon-map-wrap'>
          <div
            ref={board}
            tabIndex={0}
            className='dungeon-map'
            role='group'
            aria-label='地牢地图，使用方向键或 WASD 移动'
          >
            {run.tiles.flatMap((row, y) =>
              row.map((tile, x) => {
                const playerHere = run.player.x === x && run.player.y === y
                const enemy = run.enemies.find(e => e.x === x && e.y === y)
                const potion = run.supplies.find(p => p.x === x && p.y === y)
                const exit = run.exit.x === x && run.exit.y === y
                const kind = playerHere
                  ? 'player'
                  : enemy?.kind || (potion ? 'potion' : exit ? 'exit' : null)
                const adjacent =
                  Math.abs(run.player.x - x) + Math.abs(run.player.y - y) === 1
                const label = playerHere
                  ? '你'
                  : enemy
                    ? `${enemy.kind === 'warden' ? '看守者' : '守卫'}，生命 ${enemy.hp}`
                    : potion
                      ? '药水，恢复 3 点生命'
                      : exit
                        ? run.enemies.length
                          ? '封闭的出口'
                          : '出口'
                        : '地板'
                if (tile === '#')
                  return (
                    <span
                      key={`${x}-${y}`}
                      className='dungeon-tile tile-wall'
                      aria-hidden='true'
                    />
                  )
                return (
                  <button
                    key={`${x}-${y}`}
                    type='button'
                    tabIndex={-1}
                    data-x={x}
                    data-y={y}
                    className={`dungeon-tile tile-floor ${adjacent ? 'tile-adjacent' : ''} ${playerHere ? 'tile-player' : ''} ${exit && !run.enemies.length ? 'tile-open' : ''}`}
                    aria-label={`${label}，第 ${y} 行第 ${x} 列`}
                    onClick={() => {
                      if (adjacent) step(x - run.player.x, y - run.player.y)
                      board.current?.focus()
                    }}
                  >
                    {kind && <Sprite kind={kind} />}
                    {enemy && (
                      <span className='dungeon-enemy-health' aria-hidden='true'>
                        {'·'.repeat(enemy.hp)}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
          {run.phase === 'upgrade' && (
            <div className='dungeon-choice'>
              <p className='dungeon-eyebrow'>A MOMENT TO BREATHE</p>
              <h3>带走一份馈赠</h3>
              <p>进入下一层时恢复 2 点生命。</p>
              {UPGRADES.map(item => (
                <button
                  type='button'
                  key={item.id}
                  onClick={() => {
                    setRun(current => upgrade(current, item.id))
                    board.current?.focus()
                  }}
                >
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                  <span aria-hidden='true'>↗</span>
                </button>
              ))}
            </div>
          )}
          {ended && (
            <div className='dungeon-ending'>
              <span className='dungeon-ending-symbol' aria-hidden='true'>
                {run.phase === 'won' ? '✧' : '☾'}
              </span>
              <h3>
                {run.phase === 'won' ? '翻到有光的一页' : '冒险暂告一段落'}
              </h3>
              <p>
                深入 {run.floor} 层 · 击败 {run.kills} 个守卫 · {run.turns} 回合
              </p>
              <button type='button' onClick={restart}>
                再翻开一本 ↗
              </button>
            </div>
          )}
        </div>
        <p className='dungeon-message' role='status'>
          {run.message}
        </p>
        <div className='dungeon-bottom'>
          <div className='dungeon-help'>
            <p>方向键 / WASD 移动</p>
            <p>走向敌人攻击 · 空格等待</p>
            <p>清空守卫后，走入金色出口</p>
          </div>
          <div className='dungeon-pad' aria-label='移动控制'>
            {[
              [0, -1, '↑', '向上'],
              [-1, 0, '←', '向左'],
              [0, 0, '·', '等待一回合'],
              [1, 0, '→', '向右'],
              [0, 1, '↓', '向下']
            ].map(([dx, dy, text, name]) => (
              <button
                key={name}
                type='button'
                style={{ gridColumn: dx + 2, gridRow: dy + 2 }}
                aria-label={name}
                disabled={run.phase !== 'playing'}
                onClick={() => step(dx, dy)}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        .medium-dungeon {
          position: relative;
          color: var(--ink);
          font-family: 'Noto Sans SC', sans-serif;
        }
        .medium-dungeon * {
          box-sizing: border-box;
        }
        .dungeon-panel {
          display: grid;
          grid-template-columns: minmax(200px, 1fr) minmax(260px, 360px);
          grid-template-rows: auto auto auto auto 1fr;
          gap: 12px 40px;
          align-items: start;
          padding: 18px 0 28px;
        }
        .dungeon-heading {
          grid-column: 1;
          grid-row: 1;
        }
        .dungeon-description {
          grid-column: 1;
          grid-row: 2;
        }
        .dungeon-stats {
          grid-column: 1;
          grid-row: 3;
        }
        .dungeon-message {
          grid-column: 1;
          grid-row: 4;
        }
        .dungeon-bottom {
          grid-column: 1;
          grid-row: 5;
        }
        .dungeon-map-wrap {
          grid-column: 2;
          grid-row: 1 / 6;
        }
        .dungeon-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dungeon-eyebrow {
          color: var(--muted);
          font-size: 9px;
          letter-spacing: 0.2em;
          margin: 0 0 6px;
        }
        .dungeon-heading h2 {
          font-family: 'Noto Serif SC', serif;
          font-size: 26px;
          font-weight: 500;
          margin: 0;
        }
        .dungeon-description {
          font-size: 11px;
          color: var(--muted);
          margin: 8px 0 18px;
        }
        .medium-dungeon button {
          font: inherit;
          cursor: pointer;
          touch-action: manipulation;
        }
        .medium-dungeon button:disabled {
          cursor: default;
          opacity: 0.45;
        }
        .medium-dungeon :is(button, [tabindex]):focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .dungeon-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          color: var(--muted);
          font-size: 10px;
          margin-bottom: 12px;
          font-variant-numeric: tabular-nums;
        }
        .dungeon-stats b {
          color: var(--ink);
          font-weight: 500;
          margin-left: 3px;
        }
        .dungeon-health b {
          color: var(--accent);
        }
        .dungeon-map-wrap {
          position: relative;
        }
        .dungeon-map {
          display: grid;
          grid-template-columns: repeat(${SIZE}, minmax(0, 1fr));
          gap: 2px;
          padding: 5px;
          border: 1px solid #445344;
          background: #121e18;
          border-radius: 5px;
        }
        .dungeon-tile {
          position: relative;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          min-width: 0;
          padding: 4px;
          border: 0;
          border-radius: 2px;
        }
        .tile-wall {
          background: #334136;
          box-shadow:
            inset 0 2px #435147,
            inset 0 -3px #24332a;
        }
        .tile-floor {
          background: #1d2c23;
        }
        .tile-floor:nth-child(even) {
          background: #223027;
        }
        .tile-adjacent {
          box-shadow: inset 0 0 0 1px #61775465;
        }
        .tile-adjacent:hover {
          background: #3a4d35;
        }
        .tile-player {
          background: #35472f !important;
        }
        .tile-open {
          background: #62522c !important;
          box-shadow: inset 0 0 0 1px #c5b570;
        }
        .dungeon-sprite {
          width: 100%;
          height: 100%;
          max-width: 30px;
          max-height: 30px;
        }
        .dungeon-sprite .pixel-1 {
          fill: #a8ce82;
        }
        .dungeon-sprite .pixel-2 {
          fill: #efdcac;
        }
        .dungeon-sprite .pixel-3 {
          fill: #243327;
        }
        .sprite-slime .pixel-1 {
          fill: #b09ec3;
        }
        .sprite-warden .pixel-1 {
          fill: #cf937b;
        }
        .sprite-potion .pixel-1 {
          fill: #83b9a7;
        }
        .sprite-exit .pixel-1 {
          fill: #b7a46b;
        }
        .sprite-exit .pixel-2 {
          fill: #e1cd8d;
        }
        .dungeon-enemy-health {
          position: absolute;
          bottom: -6px;
          left: 0;
          right: 0;
          color: #e7c6ed;
          font-size: 19px;
          line-height: 16px;
          letter-spacing: 1px;
          pointer-events: none;
        }
        .dungeon-message {
          min-height: 30px;
          margin: 12px 0 6px;
          font-size: 11px;
          line-height: 1.6;
          color: var(--accent);
        }
        .dungeon-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .dungeon-help {
          color: var(--muted);
          font-size: 10px;
          line-height: 1.8;
        }
        .dungeon-help p {
          margin: 0;
        }
        .dungeon-pad {
          display: grid;
          grid-template: repeat(3, 30px) / repeat(3, 32px);
          gap: 3px;
        }
        .dungeon-pad button {
          padding: 0;
          border: 1px solid var(--line);
          border-radius: 5px;
          background: var(--wash);
          color: var(--accent);
        }
        .dungeon-choice,
        .dungeon-ending {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 24px;
          background: #16241af5;
          color: #e3e8d8;
          border: 1px solid #657557;
          border-radius: 5px;
        }
        .dungeon-choice h3,
        .dungeon-ending h3 {
          font-family: 'Noto Serif SC', serif;
          font-size: 22px;
          font-weight: 500;
          margin: 0 0 8px;
        }
        .dungeon-choice > p:not(.dungeon-eyebrow),
        .dungeon-ending p {
          font-size: 10px;
          color: #a9b99c;
          margin: 0 0 18px;
        }
        .dungeon-choice button {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #4f6244;
          background: #263925;
          color: #dce6c3;
          padding: 12px;
          margin-top: 8px;
          border-radius: 6px;
          text-align: left;
        }
        .dungeon-choice button:hover,
        .dungeon-ending button:hover {
          background: #3c5131;
        }
        .dungeon-choice button strong {
          font-size: 13px;
          white-space: nowrap;
        }
        .dungeon-choice button span {
          font-size: 10px;
        }
        .dungeon-choice button span:last-child {
          margin-left: auto;
        }
        .dungeon-ending {
          align-items: center;
          text-align: center;
        }
        .dungeon-ending-symbol {
          font-size: 42px;
          color: #dccb8d;
          margin-bottom: 14px;
        }
        .dungeon-ending button {
          padding: 10px 18px;
          border: 1px solid #71825e;
          border-radius: 6px;
          background: #30412a;
          color: #dce6c3;
          font-size: 12px;
        }
        @media (max-width: 640px) {
          .dungeon-panel {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 14px 0 24px;
          }
          .dungeon-map-wrap {
            width: 100%;
            max-width: 360px;
            align-self: center;
          }
          .dungeon-bottom {
            width: 100%;
          }
          .dungeon-description {
            margin: 0 0 8px;
          }
          .dungeon-stats {
            margin: 0 0 8px;
          }
          .dungeon-message {
            margin: 6px 0 0;
            min-height: 20px;
          }

          .dungeon-stats {
            gap: 10px;
          }
          .dungeon-choice,
          .dungeon-ending {
            padding: 14px;
          }
          .dungeon-choice button {
            padding: 8px;
          }
          .dungeon-choice h3,
          .dungeon-ending h3 {
            font-size: 19px;
          }
        }
      `}</style>
    </div>
  )
}
