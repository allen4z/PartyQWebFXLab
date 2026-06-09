import { create } from 'zustand'
import type {
  ActiveNote,
  Adsr,
  ChordResult,
  FxState,
  LedColorMode,
  LedMode,
  MidiConnectionStatus,
  MidiDevice,
} from './lib/types'
import { audioEngine } from './lib/audio/AudioEngine'
import { midiEngine } from './lib/midi/MidiEngine'
import {
  allLedsOff,
  initLed,
  ledKeyOff,
  sendLedMessage,
} from './lib/led/sendLedMessage'
import { colorForKey } from './lib/led/colors'
import {
  detectChord,
  keyIndexToMidi,
  PARTYQ_HIGH,
  PARTYQ_LOW,
  scalePitchClasses,
} from './lib/music'
import { DEFAULT_PRESET_ID, getPreset } from './lib/presets/soundPresets'
import { cloneFx, DEFAULT_FX, getFxMode } from './lib/presets/fxPresets'
import { interpretPrompt, type PromptResult } from './lib/presets/aiKeywords'

// ---------------------------------------------------------------------------
// Central app store. Holds UI state and orchestrates the audio / MIDI / LED
// engines (which are imperative singletons). Components subscribe to slices.
// ---------------------------------------------------------------------------

interface AppState {
  // audio
  audioStarted: boolean
  masterVolume: number

  // midi
  midiStatus: MidiConnectionStatus
  inputs: MidiDevice[]
  outputs: MidiDevice[]
  selectedInputId: string | null
  selectedOutputId: string | null

  // performance
  activeNotes: Record<number, ActiveNote>
  lastNote: { note: number; velocity: number } | null
  chord: ChordResult | null

  // sound
  presetId: string
  adsr: Adsr

  // fx
  fx: FxState
  fxModeId: string

  // led
  ledEnabled: boolean
  ledMode: LedMode
  ledColor: LedColorMode
  ledBrightness: number
  scaleRoot: number // pitch class 0..11
  scaleId: string

  // ai
  lastPrompt: string
  lastPromptResult: PromptResult | null

  // actions
  startAudio: () => Promise<void>
  setMasterVolume: (v: number) => void
  connectMidi: () => Promise<void>
  selectInput: (id: string | null) => void
  selectOutput: (id: string | null) => void
  setPreset: (id: string) => void
  setAdsr: (patch: Partial<Adsr>) => void
  setFxMode: (id: string) => void
  setFxParam: (effect: keyof FxState, param: string, value: number) => void
  toggleFx: (effect: keyof FxState) => void
  toggleLed: () => void
  setLedMode: (m: LedMode) => void
  setLedColor: (c: LedColorMode) => void
  setLedBrightness: (b: number) => void
  setScale: (root: number, id: string) => void
  noteOn: (note: number, velocity: number, source: 'midi' | 'pointer') => void
  noteOff: (note: number) => void
  applyPrompt: (prompt: string) => void
  syncMidiState: () => void
}

export const useStore = create<AppState>((set, get) => {
  // ---- internal helpers (not part of public state) ----

  const output = () => midiEngine.getSelectedOutput()

  /** Light scale tones (dim) across the whole keybed for Scale Guide mode. */
  const renderScaleLeds = () => {
    const { ledEnabled, ledMode, scaleRoot, scaleId, ledColor, ledBrightness } = get()
    const out = output()
    if (!ledEnabled) return
    if (ledMode !== 'scale') return
    allLedsOff(out)
    const pcs = scalePitchClasses(scaleRoot, scaleId)
    for (let midi = PARTYQ_LOW; midi <= PARTYQ_HIGH; midi++) {
      if (pcs.has(((midi % 12) + 12) % 12)) {
        const isRoot = ((midi % 12) + 12) % 12 === scaleRoot
        sendLedMessage(out, midi, colorForKey(ledColor, midi), ledBrightness * (isRoot ? 1 : 0.45))
      }
    }
  }

  /** Reactive brightness derived from the wet FX (reverb + delay + filter). */
  const reactiveBrightness = () => {
    const { fx, ledBrightness } = get()
    const rev = fx.reverb.enabled ? fx.reverb.wet : 0
    const del = fx.delay.enabled ? fx.delay.wet : 0
    const energy = Math.min(1, 0.35 + rev * 0.5 + del * 0.4)
    return ledBrightness * energy
  }

  /** Light a single pressed key according to the current LED mode. */
  const ledNoteOn = (note: number) => {
    const { ledEnabled, ledMode, ledColor, ledBrightness } = get()
    if (!ledEnabled) return
    const out = output()
    const rgb = colorForKey(ledColor, note)
    switch (ledMode) {
      case 'note':
        sendLedMessage(out, note, rgb, ledBrightness)
        break
      case 'trail':
        // fading trail: auto-off after a short duration handled by sendLedMessage
        sendLedMessage(out, note, rgb, ledBrightness, 800)
        break
      case 'reactive':
        sendLedMessage(out, note, rgb, reactiveBrightness())
        break
      case 'chord':
        // chord tones are repainted from the full active set below
        break
      case 'scale':
        // brighten the pressed key on top of the static scale
        sendLedMessage(out, note, rgb, Math.min(1, ledBrightness + 0.3))
        break
    }
  }

  const ledNoteOff = (note: number) => {
    const { ledEnabled, ledMode } = get()
    if (!ledEnabled) return
    const out = output()
    if (ledMode === 'trail') return // fades on its own
    if (ledMode === 'scale') {
      // restore the dim scale color if this note is in scale, else off
      const { scaleRoot, scaleId, ledColor, ledBrightness } = get()
      const inScale = scalePitchClasses(scaleRoot, scaleId).has(((note % 12) + 12) % 12)
      if (inScale) {
        const isRoot = ((note % 12) + 12) % 12 === scaleRoot
        sendLedMessage(out, note, colorForKey(ledColor, note), ledBrightness * (isRoot ? 1 : 0.45))
      } else {
        ledKeyOff(out, note)
      }
      return
    }
    ledKeyOff(out, note)
  }

  /** Repaint chord-tone LEDs from the full active-note set. */
  const renderChordLeds = () => {
    const { ledEnabled, ledMode, ledColor, ledBrightness, activeNotes } = get()
    if (!ledEnabled || ledMode !== 'chord') return
    const out = output()
    allLedsOff(out)
    const notes = Object.keys(activeNotes).map(Number)
    const pcs = new Set(notes.map((n) => ((n % 12) + 12) % 12))
    for (let midi = PARTYQ_LOW; midi <= PARTYQ_HIGH; midi++) {
      if (pcs.has(((midi % 12) + 12) % 12)) {
        sendLedMessage(out, midi, colorForKey(ledColor, midi), ledBrightness)
      }
    }
  }

  return {
    audioStarted: false,
    masterVolume: 0.85,

    midiStatus: midiEngine.status,
    inputs: [],
    outputs: [],
    selectedInputId: null,
    selectedOutputId: null,

    activeNotes: {},
    lastNote: null,
    chord: null,

    presetId: DEFAULT_PRESET_ID,
    adsr: { ...getPreset(DEFAULT_PRESET_ID).envelope },

    fx: cloneFx(DEFAULT_FX),
    fxModeId: 'clean',

    ledEnabled: true,
    ledMode: 'note',
    ledColor: 'gradient',
    ledBrightness: 0.85,
    scaleRoot: 0,
    scaleId: 'major',

    lastPrompt: '',
    lastPromptResult: null,

    // ---- actions ----

    startAudio: async () => {
      if (get().audioStarted) return
      await audioEngine.start()
      const preset = getPreset(get().presetId)
      audioEngine.setPreset(preset, get().adsr)
      audioEngine.updateFx(get().fx)
      audioEngine.setMasterVolume(get().masterVolume)
      set({ audioStarted: true })
    },

    setMasterVolume: (v) => {
      audioEngine.setMasterVolume(v)
      set({ masterVolume: v })
    },

    connectMidi: async () => {
      midiEngine.setCallbacks({
        onNoteOn: (note, velocity) => get().noteOn(note, velocity, 'midi'),
        onNoteOff: (note) => get().noteOff(note),
        onStateChange: () => get().syncMidiState(),
      })
      await midiEngine.connect()
      get().syncMidiState()
      // Initialize LEDs on the freshly selected output.
      initLed(output())
      renderScaleLeds()
    },

    syncMidiState: () => {
      set({
        midiStatus: midiEngine.status,
        inputs: [...midiEngine.inputs],
        outputs: [...midiEngine.outputs],
        selectedInputId: midiEngine.selectedInputId,
        selectedOutputId: midiEngine.selectedOutputId,
      })
    },

    selectInput: (id) => {
      midiEngine.selectInput(id)
      get().syncMidiState()
    },

    selectOutput: (id) => {
      midiEngine.selectOutput(id)
      get().syncMidiState()
      initLed(output())
      renderScaleLeds()
    },

    setPreset: (id) => {
      const preset = getPreset(id)
      const adsr = { ...preset.envelope }
      audioEngine.setPreset(preset, adsr)
      set({ presetId: id, adsr })
    },

    setAdsr: (patch) => {
      const adsr = { ...get().adsr, ...patch }
      audioEngine.setAdsr(adsr)
      set({ adsr })
    },

    setFxMode: (id) => {
      const mode = getFxMode(id)
      if (!mode) return
      const fx = cloneFx(mode.fx)
      audioEngine.updateFx(fx)
      set({ fx, fxModeId: id })
      if (get().ledMode === 'reactive') {
        // no global repaint needed; reactive updates on next note
      }
    },

    setFxParam: (effect, param, value) => {
      const fx = cloneFx(get().fx)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(fx[effect] as any)[param] = value
      audioEngine.updateFx(fx)
      set({ fx, fxModeId: 'custom' })
    },

    toggleFx: (effect) => {
      const fx = cloneFx(get().fx)
      fx[effect].enabled = !fx[effect].enabled
      audioEngine.updateFx(fx)
      set({ fx, fxModeId: 'custom' })
    },

    toggleLed: () => {
      const next = !get().ledEnabled
      set({ ledEnabled: next })
      if (!next) allLedsOff(output())
      else {
        initLed(output())
        renderScaleLeds()
      }
    },

    setLedMode: (m) => {
      allLedsOff(output())
      set({ ledMode: m })
      renderScaleLeds()
      renderChordLeds()
    },

    setLedColor: (c) => {
      set({ ledColor: c })
      renderScaleLeds()
      renderChordLeds()
    },

    setLedBrightness: (b) => {
      set({ ledBrightness: b })
      renderScaleLeds()
    },

    setScale: (root, id) => {
      set({ scaleRoot: root, scaleId: id })
      renderScaleLeds()
    },

    noteOn: (note, velocity, source) => {
      const active: Record<number, ActiveNote> = {
        ...get().activeNotes,
        [note]: { note, velocity, source },
      }
      const notes = Object.keys(active).map(Number)
      const chord = detectChord(notes)
      set({ activeNotes: active, lastNote: { note, velocity }, chord })

      if (get().audioStarted) audioEngine.triggerAttack(note, velocity)

      ledNoteOn(note)
      if (get().ledMode === 'chord') renderChordLeds()
    },

    noteOff: (note) => {
      const active = { ...get().activeNotes }
      delete active[note]
      const notes = Object.keys(active).map(Number)
      const chord = detectChord(notes)
      set({ activeNotes: active, chord })

      if (get().audioStarted) audioEngine.triggerRelease(note)

      ledNoteOff(note)
      if (get().ledMode === 'chord') renderChordLeds()
    },

    applyPrompt: (prompt) => {
      const result = interpretPrompt(prompt)
      const preset = getPreset(result.presetId)
      const adsr = { ...preset.envelope }
      if (get().audioStarted) {
        audioEngine.setPreset(preset, adsr)
        audioEngine.updateFx(result.fx)
      }
      set({
        presetId: result.presetId,
        adsr,
        fx: result.fx,
        fxModeId: result.fxModeId,
        lastPrompt: prompt,
        lastPromptResult: result,
      })
    },
  }
})

// Convenience hook for the on-screen + hardware "this note is lit" check.
export function noteIsActive(note: number): boolean {
  return note in useStore.getState().activeNotes
}

// Re-export so UI can build the scale-tone overlay without importing music.ts.
export { keyIndexToMidi }
