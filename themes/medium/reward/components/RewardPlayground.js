import { useEffect, useRef } from 'react'

const DESKTOP = '(min-width: 1200px) and (hover: hover) and (pointer: fine)'
const COLORS = ['#ffeb9e', '#f6a3d2', '#a7ece2', '#c9b0f5', '#ffffff']

// Small, event-driven effects. No canvas, animation loop or global pointer tracking.
export default function RewardPlayground() {
  const layer = useRef(null)
  const burst = useRef(null)
  const petting = useRef(false)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const groups = new Set()
    burst.current = (x, y, playful = false) => {
      if (reduced.matches || document.hidden || !layer.current) return
      if (groups.size >= 6) {
        const oldest = groups.values().next().value
        oldest.remove()
        groups.delete(oldest)
      }
      const group = document.createElement('span')
      group.className = 'ng-click-burst'
      group.style.left = `${x}px`
      group.style.top = `${y}px`
      layer.current.appendChild(group)
      groups.add(group)
      const count = playful ? 9 : 6
      const animations = []
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('i')
        particle.textContent = i % 3 === 0 ? '✦' : '·'
        particle.style.color = COLORS[i % COLORS.length]
        group.appendChild(particle)
        const angle = (i / count) * Math.PI * 2
        const distance = playful ? 50 : 30
        const animation = particle.animate(
          [
            { transform: 'translate(0, 0) scale(.5)', opacity: 1 },
            {
              transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(1)`,
              opacity: 0.9,
              offset: 0.55
            },
            {
              transform: `translate(${Math.cos(angle) * distance * 1.3}px, ${Math.sin(angle) * distance * 1.3 + 8}px) scale(.2)`,
              opacity: 0
            }
          ],
          {
            duration: playful ? 680 : 420,
            easing: 'cubic-bezier(.2,.7,.3,1)',
            fill: 'forwards'
          }
        )
        animations.push(animation.finished.catch(() => {}))
      }
      Promise.all(animations).then(() => {
        group.remove()
        groups.delete(group)
      })
    }
    const onClick = event => {
      if (event.button !== 0 || (!event.clientX && !event.clientY)) return
      if (
        event.target.closest?.(
          'input, textarea, select, [contenteditable], canvas, .medium-survivors, .medium-runner, .ng-context-menu, [data-ng-toy]'
        )
      )
        return
      if (document.getSelection()?.toString()) return
      burst.current?.(event.clientX, event.clientY)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      burst.current = null
      for (const group of groups) group.remove()
      groups.clear()
    }
  }, [])
  const play = event => {
    const toy = event.currentTarget
    const rect = toy.getBoundingClientRect()
    burst.current?.(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      true
    )
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const svg = toy.querySelector('svg')
      svg?.getAnimations().forEach(animation => animation.cancel())
      svg?.animate(
        [
          { transform: 'translateY(0) rotate(0) scale(1)' },
          { transform: 'translateY(-23px) rotate(-18deg) scale(1.15)' },
          { transform: 'translateY(0) rotate(12deg) scale(.92)' },
          { transform: 'translateY(0) rotate(0) scale(1)' }
        ],
        { duration: 550, easing: 'ease-out' }
      )
    }
  }
  const pet = async event => {
    const toy = event.currentTarget
    if (petting.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    petting.current = true
    toy.dataset.petting = 'true'
    const animations = [
      toy.querySelector('.ng-pet-body').animate(
        [
          { transform: 'translate(0, 0) rotate(0) scale(1)' },
          {
            transform: 'translate(4px, -4px) rotate(8deg) scale(.84, 1.08)',
            offset: 0.23
          },
          {
            transform: 'translate(-3px, -4px) rotate(-9deg) scale(.84, 1.08)',
            offset: 0.46
          },
          {
            transform: 'translate(2px, -4px) rotate(6deg) scale(.84, 1.08)',
            offset: 0.62
          },
          {
            transform: 'translate(0, 1px) rotate(0) scale(1.04, .94)',
            offset: 0.86
          },
          { transform: 'translate(0, 0) rotate(0) scale(1)' }
        ],
        { duration: 1800, easing: 'ease-in-out' }
      ),
      toy.querySelector('.ng-pet-face').animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          {
            transform: 'translate(10px, 8px) scale(.3)',
            opacity: 0,
            offset: 0.18
          },
          {
            transform: 'translate(10px, 8px) scale(.3)',
            opacity: 0,
            offset: 0.58
          },
          {
            transform: 'translate(-2px, 0) scale(1.05)',
            opacity: 1,
            offset: 0.88
          },
          { transform: 'translate(0, 0) scale(1)', opacity: 1 }
        ],
        { duration: 1800, easing: 'ease-in-out' }
      )
    ]
    await Promise.all(
      animations.map(animation => animation.finished.catch(() => {}))
    )
    delete toy.dataset.petting
    petting.current = false
  }
  return (
    <>
      <div ref={layer} className='ng-click-layer' aria-hidden='true' />
      <div className='ng-background-toys'>
        <button
          type='button'
          data-ng-toy
          className='ng-background-toy ng-toy-controller'
          aria-label='拨动漂浮的手柄'
          onClick={play}
        >
          <svg viewBox='0 0 100 72' aria-hidden='true'>
            <path
              d='M25 16h50c12 0 22 33 18 43-4 11-18 0-25-9H32c-7 9-21 20-25 9C3 49 13 16 25 16Z'
              fill='#ac8fd8'
              stroke='#fff9f7'
              strokeWidth='4'
            />
            <path d='M29 27v19m-10-10h20' stroke='#fff9f7' strokeWidth='6' />
            <circle cx='69' cy='29' r='5' fill='#fff0a0' />
            <circle cx='79' cy='40' r='5' fill='#ffb1d4' />
          </svg>
        </button>
        <button
          type='button'
          data-ng-toy
          className='ng-background-toy ng-toy-hedgehog'
          aria-label='逗逗背景里的小刺猬'
          onClick={pet}
        >
          <svg viewBox='0 0 120 100' aria-hidden='true'>
            <ellipse cx='60' cy='87' rx='43' ry='6' fill='#654d7929' />
            <g className='ng-pet-body' strokeLinejoin='round'>
              <path
                d='M18 70 14 60l7-3-4-10 10-2-2-10 11 1 1-10 10 4 6-10 8 7 10-7 5 9 12-2 1 10 11 3-3 9 10 7-6 7 5 9-7 6c-9 8-61 15-76 5Z'
                fill='#98715f'
                stroke='#fff8ed'
                strokeWidth='3'
              />
              <path
                d='m35 38 9 7-1-10m15 0 8 8 1-10m12 12 8 7-1-10m-29 14 10 7-1-11m20 18 8 2-3-8'
                fill='none'
                stroke='#c09b7c'
                strokeWidth='3'
                strokeLinecap='round'
              />
              <g className='ng-pet-face'>
                <path
                  d='M49 44c14 0 29 12 29 24 0 13-16 18-30 18-15 0-28-5-28-14 0-8 10-12 15-17 2-7 6-11 14-11Z'
                  fill='#ffeed4'
                  stroke='#715247'
                  strokeWidth='1.5'
                />
                <circle
                  cx='53'
                  cy='44'
                  r='8'
                  fill='#c3987e'
                  stroke='#715247'
                  strokeWidth='1.5'
                />
                <circle cx='53' cy='45' r='4' fill='#efd4bc' />
                <path
                  d='M33 62a4 4 0 0 0 8 0m13 0a4 4 0 0 0 8 0'
                  fill='#624c48'
                />
                <path
                  d='m31 60 11 2m11 0 11-2'
                  stroke='#624c48'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                />
                <ellipse
                  cx='46'
                  cy='74'
                  rx='12'
                  ry='9'
                  fill='#fff5e2'
                  stroke='#b59a80'
                  strokeWidth='1'
                />
                <ellipse cx='46' cy='78' rx='3.5' ry='2.5' fill='#62404b' />
                <ellipse
                  cx='34'
                  cy='85'
                  rx='8'
                  ry='4'
                  fill='#f7ddbf'
                  stroke='#715247'
                  strokeWidth='1.2'
                />
                <ellipse
                  cx='64'
                  cy='85'
                  rx='8'
                  ry='4'
                  fill='#f7ddbf'
                  stroke='#715247'
                  strokeWidth='1.2'
                />
              </g>
            </g>
          </svg>
          <span className='ng-pet-sigh' aria-hidden='true'>
            …
          </span>
        </button>
      </div>
      <style jsx global>{`
        .ng-click-layer {
          position: fixed;
          inset: 0;
          z-index: 80;
          overflow: hidden;
          pointer-events: none;
        }
        .ng-click-burst {
          position: absolute;
          width: 0;
          height: 0;
          pointer-events: none;
        }
        .ng-click-burst i {
          position: absolute;
          left: -6px;
          top: -10px;
          font: 700 19px sans-serif;
          text-shadow: 0 1px 2px #72529155;
        }
        .ng-background-toys {
          display: none;
        }
        .ng-background-toy {
          position: fixed;
          z-index: 12;
          width: 66px;
          height: 66px;
          padding: 0;
          background: none;
          border: 0;
          cursor: pointer;
          filter: drop-shadow(3px 5px 0 #73538c33);
          transition: filter 150ms;
        }
        .ng-background-toy svg {
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .ng-toy-controller {
          left: max(20px, calc((100vw - 1120px) / 4));
          top: 67%;
          transform: rotate(-13deg);
        }
        .ng-toy-hedgehog {
          width: 94px;
          height: 80px;
          right: max(26px, calc((100vw - 1120px) / 4 - 12px));
          top: 72%;
          filter: drop-shadow(0 3px 1px #fff4);
        }
        .ng-pet-body,
        .ng-pet-face {
          transform-box: fill-box;
          transform-origin: 50% 85%;
        }
        .ng-pet-sigh {
          position: absolute;
          top: 0;
          left: 8px;
          padding: 0 7px 2px;
          border-radius: 10px 10px 2px 10px;
          background: #fff8ea;
          color: #765967;
          font: 700 18px/1.1 monospace;
          opacity: 0;
          transform: translateY(4px);
          transition:
            opacity 180ms,
            transform 180ms;
          pointer-events: none;
        }
        .ng-toy-hedgehog:is(:hover, :focus-visible) .ng-pet-sigh {
          opacity: 1;
          transform: translateY(0);
        }
        .ng-toy-hedgehog[data-petting] .ng-pet-sigh {
          opacity: 0;
        }
        .ng-toy-hedgehog:hover {
          filter: drop-shadow(0 3px 4px #fff8);
        }
        .ng-background-toy:hover {
          filter: drop-shadow(0 0 10px #fff8);
        }
        .ng-background-toy:focus-visible {
          outline: 2px dashed #fff9c2;
          outline-offset: 5px;
          border-radius: 50%;
        }
        @media ${DESKTOP} {
          .ng-background-toys {
            display: block;
          }
        }
        body:has(#theme-medium.medium-full-width) .ng-background-toys,
        body:has(.medium-survivors) .ng-background-toys {
          display: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .ng-background-toy,
          .ng-pet-sigh {
            transition: none;
          }
          .ng-click-layer {
            display: none;
          }
        }
        @media print {
          .ng-background-toys,
          .ng-click-layer {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
