import { useCallback, useRef } from 'react'

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  /** Display formatter, e.g. (v) => `${v.toFixed(2)}s`. */
  format?: (v: number) => string
  onChange: (v: number) => void
  accent?: string
  /** Logarithmic mapping for wide ranges like filter cutoff. */
  log?: boolean
  disabled?: boolean
}

const SWEEP = 270 // degrees of travel
const START = -135

/** Draggable rotary knob (vertical drag). Pointer + keyboard accessible. */
export function Knob({
  label,
  value,
  min,
  max,
  format,
  onChange,
  accent = '#8b5cf6',
  log = false,
  disabled = false,
}: KnobProps) {
  const dragging = useRef<{ startY: number; startNorm: number } | null>(null)

  const toNorm = useCallback(
    (v: number) => {
      if (log) {
        const lmin = Math.log(min)
        const lmax = Math.log(max)
        return (Math.log(Math.max(min, v)) - lmin) / (lmax - lmin)
      }
      return (v - min) / (max - min)
    },
    [min, max, log],
  )

  const fromNorm = useCallback(
    (n: number) => {
      const c = Math.max(0, Math.min(1, n))
      if (log) {
        const lmin = Math.log(min)
        const lmax = Math.log(max)
        return Math.exp(lmin + c * (lmax - lmin))
      }
      return min + c * (max - min)
    },
    [min, max, log],
  )

  const norm = toNorm(value)
  const angle = START + norm * SWEEP

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragging.current = { startY: e.clientY, startNorm: norm }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || disabled) return
    const dy = dragging.current.startY - e.clientY
    const next = dragging.current.startNorm + dy / 160 // 160px = full sweep
    onChange(fromNorm(next))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = null
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    const step = (max - min) / 50
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      onChange(Math.min(max, value + step))
      e.preventDefault()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      onChange(Math.max(min, value - step))
      e.preventDefault()
    }
  }

  return (
    <div className={`flex select-none flex-col items-center gap-1.5 ${disabled ? 'opacity-40' : ''}`}>
      <div
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(value * 100) / 100}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        className="relative h-12 w-12 cursor-ns-resize rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-white/40"
        style={{
          background: 'radial-gradient(circle at 50% 35%, #2a2a44, #121222)',
          boxShadow: `inset 0 2px 6px rgba(0,0,0,0.6), 0 0 12px -4px ${accent}`,
        }}
      >
        {/* progress arc */}
        <svg className="absolute inset-0" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
            strokeDasharray={`${(SWEEP / 360) * 2 * Math.PI * 20} ${2 * Math.PI * 20}`}
            transform="rotate(135 24 24)"
            strokeLinecap="round"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeDasharray={`${norm * (SWEEP / 360) * 2 * Math.PI * 20} ${2 * Math.PI * 20}`}
            transform="rotate(135 24 24)"
            strokeLinecap="round"
          />
        </svg>
        {/* indicator */}
        <span
          className="absolute left-1/2 top-1/2 h-4 w-[2px] origin-bottom rounded-full"
          style={{
            background: accent,
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            transformOrigin: '50% 100%',
            boxShadow: `0 0 6px ${accent}`,
          }}
        />
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </span>
      <span className="font-mono text-[11px] text-white/75">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  )
}
