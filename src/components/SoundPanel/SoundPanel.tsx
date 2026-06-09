import { useStore } from '../../store'
import { SOUND_PRESETS } from '../../lib/presets/soundPresets'
import { Card } from '../ui/Card'
import { Knob } from '../ui/Knob'

export function SoundPanel() {
  const presetId = useStore((s) => s.presetId)
  const setPreset = useStore((s) => s.setPreset)
  const adsr = useStore((s) => s.adsr)
  const setAdsr = useStore((s) => s.setAdsr)
  const masterVolume = useStore((s) => s.masterVolume)
  const setMasterVolume = useStore((s) => s.setMasterVolume)

  const active = SOUND_PRESETS.find((p) => p.id === presetId) ?? SOUND_PRESETS[0]

  return (
    <Card
      title="Sound Engine"
      icon="♬"
      accent={active.accent}
      right={
        <Knob
          label="Master"
          value={masterVolume}
          min={0}
          max={1}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setMasterVolume}
          accent="#fbbf24"
        />
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SOUND_PRESETS.map((p) => {
          const sel = p.id === presetId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              title={p.description}
              className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition ${
                sel
                  ? 'border-transparent'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
              style={
                sel
                  ? {
                      background: `linear-gradient(135deg, ${p.accent}33, ${p.accent}0d)`,
                      boxShadow: `inset 0 0 0 1px ${p.accent}, 0 0 18px -6px ${p.accent}`,
                    }
                  : undefined
              }
            >
              <span
                className="mb-1.5 block h-1.5 w-1.5 rounded-full"
                style={{ background: p.accent, boxShadow: `0 0 8px ${p.accent}` }}
              />
              <span
                className={`block text-xs font-semibold leading-tight ${
                  sel ? 'text-white' : 'text-white/75'
                }`}
              >
                {p.name}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
            ADSR Envelope
          </span>
          <span className="text-[11px] text-white/40">{active.description}</span>
        </div>
        <div className="flex items-start justify-around gap-2">
          <Knob
            label="Attack"
            value={adsr.attack}
            min={0.001}
            max={3}
            log
            format={(v) => `${(v * 1000).toFixed(0)}ms`}
            onChange={(v) => setAdsr({ attack: v })}
            accent={active.accent}
          />
          <Knob
            label="Decay"
            value={adsr.decay}
            min={0.01}
            max={4}
            log
            format={(v) => `${v.toFixed(2)}s`}
            onChange={(v) => setAdsr({ decay: v })}
            accent={active.accent}
          />
          <Knob
            label="Sustain"
            value={adsr.sustain}
            min={0}
            max={1}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setAdsr({ sustain: v })}
            accent={active.accent}
          />
          <Knob
            label="Release"
            value={adsr.release}
            min={0.01}
            max={5}
            log
            format={(v) => `${v.toFixed(2)}s`}
            onChange={(v) => setAdsr({ release: v })}
            accent={active.accent}
          />
        </div>
      </div>
    </Card>
  )
}
