import { useStore } from '../../store'
import { FX_MODES } from '../../lib/presets/fxPresets'
import type { FxState } from '../../lib/types'
import { Card } from '../ui/Card'
import { Knob } from '../ui/Knob'
import { Toggle } from '../ui/Toggle'

interface KnobSpec {
  param: string
  label: string
  min: number
  max: number
  log?: boolean
  format: (v: number) => string
}

interface FxStripDef {
  key: keyof FxState
  name: string
  accent: string
  knobs: KnobSpec[]
}

const STRIPS: FxStripDef[] = [
  {
    key: 'reverb',
    name: 'Reverb',
    accent: '#60a5fa',
    knobs: [
      { param: 'wet', label: 'Wet', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
      { param: 'decay', label: 'Decay', min: 0.1, max: 10, log: true, format: (v) => `${v.toFixed(1)}s` },
      { param: 'roomSize', label: 'Room', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
    ],
  },
  {
    key: 'delay',
    name: 'Delay',
    accent: '#a855f7',
    knobs: [
      { param: 'wet', label: 'Wet', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
      { param: 'time', label: 'Time', min: 0.02, max: 1, format: (v) => `${(v * 1000).toFixed(0)}ms` },
      { param: 'feedback', label: 'Fdbk', min: 0, max: 0.95, format: (v) => `${Math.round(v * 100)}%` },
    ],
  },
  {
    key: 'chorus',
    name: 'Chorus',
    accent: '#22d3ee',
    knobs: [
      { param: 'wet', label: 'Wet', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
      { param: 'depth', label: 'Depth', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
      { param: 'rate', label: 'Rate', min: 0.1, max: 8, log: true, format: (v) => `${v.toFixed(1)}Hz` },
    ],
  },
  {
    key: 'filter',
    name: 'Filter',
    accent: '#fbbf24',
    knobs: [
      { param: 'cutoff', label: 'Cutoff', min: 80, max: 18000, log: true, format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`) },
      { param: 'resonance', label: 'Reso', min: 0.1, max: 12, format: (v) => v.toFixed(1) },
    ],
  },
  {
    key: 'distortion',
    name: 'Distortion',
    accent: '#f97316',
    knobs: [
      { param: 'drive', label: 'Drive', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
      { param: 'wet', label: 'Wet', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
    ],
  },
  {
    key: 'compressor',
    name: 'Compressor',
    accent: '#34d399',
    knobs: [
      { param: 'threshold', label: 'Thresh', min: -60, max: 0, format: (v) => `${v.toFixed(0)}dB` },
      { param: 'ratio', label: 'Ratio', min: 1, max: 20, format: (v) => `${v.toFixed(0)}:1` },
    ],
  },
]

export function FxRack() {
  const fx = useStore((s) => s.fx)
  const fxModeId = useStore((s) => s.fxModeId)
  const setFxMode = useStore((s) => s.setFxMode)
  const setFxParam = useStore((s) => s.setFxParam)
  const toggleFx = useStore((s) => s.toggleFx)

  return (
    <Card title="DSP FX Rack" icon="∿" accent="#f97316">
      {/* FX mode presets */}
      <div className="mb-4">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
          FX Modes
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FX_MODES.map((m) => {
            const sel = m.id === fxModeId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setFxMode(m.id)}
                title={m.description}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                  sel ? 'border-transparent text-white' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
                style={sel ? { background: m.accent, boxShadow: `0 0 14px -3px ${m.accent}` } : undefined}
              >
                {m.name}
              </button>
            )
          })}
          {fxModeId === 'custom' && (
            <span className="rounded-lg border border-dashed border-white/20 px-2.5 py-1 text-[11px] text-white/50">
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Effect strips */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {STRIPS.map((strip) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const state = fx[strip.key] as any
          const on = state.enabled as boolean
          return (
            <div
              key={strip.key}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 transition"
              style={on ? { boxShadow: `inset 0 0 0 1px ${strip.accent}55` } : undefined}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className="text-xs font-semibold"
                  style={{ color: on ? strip.accent : 'rgba(255,255,255,0.5)' }}
                >
                  {strip.name}
                </span>
                <Toggle checked={on} onChange={() => toggleFx(strip.key)} accent={strip.accent} label={strip.name} />
              </div>
              <div className={`flex justify-around ${on ? '' : 'opacity-40'}`}>
                {strip.knobs.map((kn) => (
                  <Knob
                    key={kn.param}
                    label={kn.label}
                    value={state[kn.param]}
                    min={kn.min}
                    max={kn.max}
                    log={kn.log}
                    format={kn.format}
                    onChange={(v) => setFxParam(strip.key, kn.param, v)}
                    accent={strip.accent}
                    disabled={!on}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
