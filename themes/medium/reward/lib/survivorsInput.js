const MOVEMENT = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight'
])

// The embedded game owns movement keys in every phase while it has focus.
// In particular, held keys must not start scrolling when an upgrade interrupts play.
export function handleMovementKey(event, phase, { move, select }) {
  if (!MOVEMENT.has(event.code)) return false
  event.preventDefault()
  if (phase === 'playing') move(event.code)
  else if (phase === 'upgrade' && !event.repeat)
    select(
      ['KeyW', 'KeyA', 'ArrowUp', 'ArrowLeft'].includes(event.code) ? -1 : 1
    )
  return true
}
