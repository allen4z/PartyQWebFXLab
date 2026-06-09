import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface ParticlesHandle {
  /** Emit a burst at horizontal fraction x (0..1) with an accent color. */
  burst: (xFraction: number, color: string, intensity?: number) => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

/** Lightweight canvas particle layer rendered above the keybed. */
export const Particles = forwardRef<ParticlesHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const raf = useRef<number>(0)
  const size = useRef({ w: 0, h: 0, dpr: 1 })

  useImperativeHandle(ref, () => ({
    burst: (xFraction, color, intensity = 1) => {
      const { w, h } = size.current
      const cx = xFraction * w
      const count = Math.round(10 + intensity * 16)
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1
        const speed = 1.5 + Math.random() * 4 * intensity
        particles.current.push({
          x: cx + (Math.random() - 0.5) * 14,
          y: h - 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 0,
          maxLife: 40 + Math.random() * 40,
          size: 1 + Math.random() * 2.6,
          color,
        })
      }
      if (particles.current.length > 600) {
        particles.current.splice(0, particles.current.length - 600)
      }
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      size.current = { w: rect.width, h: rect.height, dpr }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const tick = () => {
      const { w, h } = size.current
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const arr = particles.current
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i]
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.06 // gravity
        p.vx *= 0.99
        const t = p.life / p.maxLife
        if (t >= 1) {
          arr.splice(i, 1)
          continue
        }
        const alpha = (1 - t) * 0.9
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
})

Particles.displayName = 'Particles'
