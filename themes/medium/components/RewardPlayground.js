import { useEffect, useRef } from 'react'

const DESKTOP = '(min-width: 1200px) and (hover: hover) and (pointer: fine)'
const COLORS = ['#ffeb9e', '#f6a3d2', '#a7ece2', '#c9b0f5', '#ffffff']

// Small, event-driven effects. No canvas, animation loop or global pointer tracking.
export default function RewardPlayground() {
  const layer = useRef(null)
  const burst = useRef(null)
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
          'input, textarea, select, [contenteditable], canvas, .medium-survivors, .ng-context-menu, [data-ng-toy]'
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
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      toy
        .querySelector('svg')
        ?.animate(
          [
            { transform: 'translateY(0) rotate(0) scale(1)' },
            { transform: 'translateY(-23px) rotate(-18deg) scale(1.15)' },
            { transform: 'translateY(0) rotate(12deg) scale(.92)' },
            { transform: 'translateY(0) rotate(0) scale(1)' }
          ],
          { duration: 550, easing: 'ease-out' }
        )
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
          onClick={play}
        >
          <svg viewBox='0 0 88 88' aria-hidden='true'>
            <path
              d='m12 39-5-12 15-1-2-14 15 7 9-14 9 14 15-7-2 14 15 1-5 12 7 9-10 7-1 12-14-1-14 13-14-13-14 1-1-12-10-7Z'
              fill='#886b72'
              stroke='#fff5ed'
              strokeWidth='3'
            />
            <ellipse cx='44' cy='49' rx='24' ry='26' fill='#fff0d7' />
            <circle cx='29' cy='28' r='6' fill='#685562' />
            <circle cx='59' cy='28' r='6' fill='#685562' />
            <path
              d='m29 43 8 2m14 0 8-2'
              stroke='#514353'
              strokeWidth='3'
              strokeLinecap='round'
            />
            <ellipse cx='44' cy='55' rx='5' ry='4' fill='#655165' />
            <path
              d='m39 64 5 3 5-3'
              fill='none'
              stroke='#896b72'
              strokeWidth='2'
            />
          </svg>
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
          right: max(42px, calc((100vw - 1120px) / 4));
          top: 72%;
          transform: rotate(9deg);
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
          .ng-background-toy {
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
