import { useStore } from '../../store'
import type { LedColorMode, LedMode } from '../../lib/types'
import {
  PARTYKEYS_HIGH,
  PARTYKEYS_LOW,
  pitchClassName,
  scalePitchClasses,
} from '../../lib/music'
import { colorForKey, rgbToCss } from '../../lib/led/colors'
import { LED_PROTOCOL } from '../../lib/led/sendLedMessage'
import { Card } from '../ui/Card'
import { Toggle } from '../ui/Toggle'
import { Segmented } from '../ui/Segmented'
import { Knob } from '../ui/Knob'

const MODES: { value: LedMode; label: string; hint: string }[] = [
  { value: 'note', label: 'Note Light', hint: 'Light the pressed key' },
  { value: 'scale', label: 'Scale Guide', hint: 'Light notes in the selected scale' },
  { value: 'chord', label: 'Chord Guide', hint: 'Light all held chord tones' },
  { value: 'reactive', label: 'FX Reactive', hint: 'Brightness follows reverb / delay' },
  { value: 'trail', label: 'Trail', hint: 'Pressed notes leave fading trails' },
]

const COLORS: { value: LedColorMode; label: string }[] = [
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'rainbow', label: 'Rainbow' },
]

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALE_OPTS = [
  { id: 'major', name: 'Major' },
  { id: 'minor', name: 'Minor' },
  { id: 'dorian', name: 'Dorian' },
  { id: 'mixolydian', name: 'Mixolydian' },
  { id: 'pentaMajor', name: 'Maj Penta' },
  { id: 'pentaMinor', name: 'Min Penta' },
  { id: 'blues', name: 'Blues' },
  { id: 'harmonicMinor', name: 'Harm Minor' },
  { id: 'chromatic', name: 'Chromatic' },
]

/** Renders the 36-cell LED strip exactly as the hardware would show it. */
function LedStrip() {
  const ledMode = useStore((s) => s.ledMode)
  const ledColor = useStore((s) => s.ledColor)
  const ledBrightness = useStore((s) => s.ledBrightness)
  const scaleRoot = useStore((s) => s.scaleRoot)
  const scaleId = useStore((s) => s.scaleId)
  const activeNotes = useStore((s) => s.activeNotes)
  const fx = useStore((s) => s.fx)

  const scalePcs = scalePitchClasses(scaleRoot, scaleId)
  const reactive =
    ledBrightness *
    Math.min(1, 0.35 + (fx.reverb.enabled ? fx.reverb.wet * 0.5 : 0) + (fx.delay.enabled ? fx.delay.wet * 0.4 : 0))

  const cells = []
  for (let midi = PARTYKEYS_LOW; midi <= PARTYKEYS_HIGH; midi++) {
    const pc = ((midi % 12) + 12) % 12
    const held = midi in activeNotes
    let intensity = 0
    if (ledMode === 'scale') {
      if (scalePcs.has(pc)) intensity = pc === scaleRoot ? ledBrightness : ledBrightness * 0.45
      if (held) intensity = Math.min(1, ledBrightness + 0.3)
    } else if (ledMode === 'chord') {
      const heldPcs = new Set(Object.keys(activeNotes).map((n) => ((Number(n) % 12) + 12) % 12))
      if (heldPcs.has(pc)) intensity = ledBrightness
    } else if (ledMode === 'reactive') {
      if (held) intensity = reactive
    } else {
      // note / trail
      if (held) intensity = ledBrightness
    }
    const rgb = colorForKey(ledColor, midi)
    cells.push(
      <div
        key={midi}
        className="flex-1 rounded-sm transition-all duration-150"
        style={{
          height: 18,
          background: intensity > 0 ? rgbToCss(rgb, 0.25 + intensity * 0.75) : 'rgba(255,255,255,0.05)',
          boxShadow: intensity > 0 ? `0 0 10px -1px ${rgbToCss(rgb, intensity)}` : 'none',
        }}
      />,
    )
  }
  return <div className="flex gap-[2px] rounded-lg bg-black/40 p-2">{cells}</div>
}

export function LedPanel() {
  const ledEnabled = useStore((s) => s.ledEnabled)
  const toggleLed = useStore((s) => s.toggleLed)
  const ledMode = useStore((s) => s.ledMode)
  const setLedMode = useStore((s) => s.setLedMode)
  const ledColor = useStore((s) => s.ledColor)
  const setLedColor = useStore((s) => s.setLedColor)
  const ledBrightness = useStore((s) => s.ledBrightness)
  const setLedBrightness = useStore((s) => s.setLedBrightness)
  const scaleRoot = useStore((s) => s.scaleRoot)
  const scaleId = useStore((s) => s.scaleId)
  const setScale = useStore((s) => s.setScale)

  const activeHint = MODES.find((m) => m.value === ledMode)?.hint ?? ''
  const showScale = ledMode === 'scale'

  return (
    <Card
      title="LED Light Control"
      icon="✦"
      accent="#22d3ee"
      right={<Toggle checked={ledEnabled} onChange={toggleLed} accent="#22d3ee" label="LED enabled" />}
    >
      <div className={ledEnabled ? '' : 'pointer-events-none opacity-50'}>
        {/* Live preview */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Live LED Preview
            </span>
            <span className="font-mono text-[10px] text-white/35">protocol {LED_PROTOCOL}</span>
          </div>
          <LedStrip />
        </div>

        {/* Modes */}
        <div className="mb-4 space-y-2">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Mode
          </span>
          <Segmented
            options={MODES.map((m) => ({ value: m.value, label: m.label }))}
            value={ledMode}
            onChange={setLedMode}
            accent="#22d3ee"
            size="sm"
          />
          <p className="text-[11px] text-white/40">{activeHint}</p>
        </div>

        {/* Color + brightness */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Color Palette
            </span>
            <Segmented options={COLORS} value={ledColor} onChange={setLedColor} accent="#a855f7" size="sm" />
          </div>
          <Knob
            label="Bright"
            value={ledBrightness}
            min={0}
            max={1}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={setLedBrightness}
            accent="#22d3ee"
          />
        </div>

        {/* Scale picker (for Scale Guide) */}
        {showScale && (
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Scale
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ROOTS.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setScale(i, scaleId)}
                  className={`h-7 w-7 rounded-md text-[11px] font-semibold transition ${
                    i === scaleRoot
                      ? 'bg-brand-purple text-white shadow-glow-purple'
                      : 'border border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <select
              value={scaleId}
              onChange={(e) => setScale(scaleRoot, e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-ink-700/80 px-3 py-2 text-sm text-white/85 outline-none focus:border-brand-violet/60"
            >
              {SCALE_OPTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {pitchClassName(scaleRoot)} {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/40">
          LED output uses <span className="font-mono text-white/60">sendLedMessage()</span> →
          SysEx on the selected MIDI output. Swap the protocol in{' '}
          <span className="font-mono text-white/60">lib/led/sendLedMessage.ts</span> when the
          exact PartyKeys spec is confirmed.
        </p>
      </div>
    </Card>
  )
}
