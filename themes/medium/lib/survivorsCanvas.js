import { orbitPositions } from './survivors'

// Original pixel drawing, using the avatar's cream face, dark ears and sleepy eyes.
export const HEDGEHOG = [
  '0000400400400000',
  '0044444444444000',
  '0441144444114400',
  '0441142244114400',
  '0442222222224400',
  '0422222222222400',
  '0422112221122400',
  '0422312231322400',
  '0422222222222400',
  '0042252332524000',
  '0042223113224000',
  '0004222222240000',
  '0000422222400000',
  '0004322222340000',
  '0000033003300000',
  '0000000000000000'
]
export const HEDGEHOG_COLORS = {
  1: '#403338',
  2: '#f4e9d6',
  3: '#bca697',
  4: '#856655',
  5: '#d6a49a'
}
const BLOB = [
  '0002222000',
  '0022222200',
  '0223222320',
  '0221221220',
  '0222222220',
  '0022222200',
  '0002202200'
]
const MOTH = [
  '200000002',
  '220000022',
  '222101222',
  '022111220',
  '002111200',
  '000010000'
]
const BOSS = [
  '0003003000',
  '0033333300',
  '0333333330',
  '3321331233',
  '3331331333',
  '0333333330',
  '0033333300',
  '0003003000'
]

function sprite(rows, colors) {
  const canvas = document.createElement('canvas')
  canvas.width = rows[0].length
  canvas.height = rows.length
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  rows.forEach((row, y) =>
    [...row].forEach((p, x) => {
      if (colors[p]) {
        ctx.fillStyle = colors[p]
        ctx.fillRect(x, y, 1, 1)
      }
    })
  )
  return canvas
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return null
  const sprites = {
    hero: sprite(HEDGEHOG, HEDGEHOG_COLORS),
    blob: sprite(BLOB, { 1: '#192a25', 2: '#82977a', 3: '#dbe6c3' }),
    moth: sprite(MOTH, { 1: '#efd6ba', 2: '#b58683' }),
    boss: sprite(BOSS, { 1: '#e9e6c9', 2: '#1b2421', 3: '#bd7966' })
  }
  let width = 900,
    height = 400,
    ratio = 1
  return {
    resize(w, h, quality) {
      width = w
      height = h
      ratio =
        quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
      ctx.imageSmoothingEnabled = false
    },
    draw(run, reducedMotion) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.fillStyle = '#172720'
      ctx.fillRect(0, 0, width, height)
      const p = run.player,
        ox = width / 2 - p.x,
        oy = height / 2 - p.y
      // World-anchored plants make movement clear while the player stays centered.
      const grid = run.quality === 'low' ? 96 : 64
      for (
        let x = Math.floor((p.x - width / 2) / grid) * grid;
        x < p.x + width / 2 + grid;
        x += grid
      ) {
        for (
          let y = Math.floor((p.y - height / 2) / grid) * grid;
          y < p.y + height / 2 + grid;
          y += grid
        ) {
          const n = Math.abs(Math.sin(x * 12.9 + y * 7.3))
          const sx = Math.round(x + ox + n * 20),
            sy = Math.round(y + oy + n * 18)
          ctx.fillStyle = n > 0.6 ? '#304237' : '#25372d'
          ctx.fillRect(sx, sy, 2, 5)
          ctx.fillRect(sx - 3, sy + 2, 3, 1)
          if (n > 0.9) {
            ctx.fillStyle = '#657561'
            ctx.fillRect(sx + 2, sy - 1, 2, 2)
          }
        }
      }
      ctx.strokeStyle = '#78988130'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(width / 2, height / 2 + 8, 27, 12, 0, 0, Math.PI * 2)
      ctx.stroke()
      for (const gem of run.gems) {
        const x = gem.x + ox,
          y = gem.y + oy
        if (x < -10 || x > width + 10 || y < -10 || y > height + 10) continue
        ctx.fillStyle = '#b6d5b0'
        ctx.beginPath()
        ctx.moveTo(x, y - 5)
        ctx.lineTo(x + 3, y)
        ctx.lineTo(x, y + 5)
        ctx.lineTo(x - 3, y)
        ctx.fill()
        ctx.fillStyle = '#e4efc9'
        ctx.fillRect(x - 1, y - 2, 1, 3)
      }
      for (const enemy of run.enemies) {
        const x = enemy.x + ox,
          y = enemy.y + oy
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue
        const size =
          enemy.kind === 'boss' ? 54 : enemy.kind === 'moth' ? 25 : 24
        const bob = reducedMotion
          ? 0
          : Math.sin(run.time * (enemy.kind === 'moth' ? 16 : 5) + enemy.id) * 2
        ctx.globalAlpha = enemy.flash > 0 ? 0.55 : 1
        ctx.drawImage(
          sprites[enemy.kind],
          Math.round(x - size / 2),
          Math.round(y - size / 2 + bob),
          size,
          size
        )
        ctx.globalAlpha = 1
        if (enemy.kind === 'boss') {
          ctx.fillStyle = '#433a32'
          ctx.fillRect(x - 28, y - 36, 56, 3)
          ctx.fillStyle = '#d6947a'
          ctx.fillRect(x - 28, y - 36, (56 * enemy.hp) / enemy.maxHp, 3)
        }
      }
      ctx.strokeStyle = '#f1d3a0'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (const shot of run.shots) {
        ctx.moveTo(shot.x + ox, shot.y + oy)
        ctx.lineTo(shot.x + ox - shot.vx * 0.024, shot.y + oy - shot.vy * 0.024)
      }
      ctx.stroke()
      for (const orb of orbitPositions(run)) {
        ctx.fillStyle = '#be9975'
        ctx.fillRect(orb.x + ox - 5, orb.y + oy - 6, 10, 12)
        ctx.fillStyle = '#e7c898'
        ctx.fillRect(orb.x + ox - 2, orb.y + oy - 4, 3, 7)
      }
      const bob = p.moving && !reducedMotion ? Math.sin(run.time * 22) * 1.5 : 0
      ctx.save()
      ctx.translate(width / 2, height / 2 + bob)
      ctx.scale(p.facing, 1)
      ctx.globalAlpha = p.invincible > 0 ? 0.65 : 1
      ctx.drawImage(sprites.hero, -20, -22, 40, 40)
      ctx.restore()
      if (run.quality !== 'low')
        for (const spark of run.sparks) {
          ctx.globalAlpha = spark.life / 0.35
          ctx.fillStyle = spark.color
          ctx.fillRect(spark.x + ox, spark.y + oy, 3, 3)
        }
      ctx.globalAlpha = 1
      // A restrained vignette; no screen shake or flashing during combat.
      ctx.fillStyle = '#101c2430'
      ctx.fillRect(0, 0, width, 8)
      ctx.fillRect(0, height - 8, width, 8)
    }
  }
}
