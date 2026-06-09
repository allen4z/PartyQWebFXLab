// ---------------------------------------------------------------------------
// Shared domain types for PartyKeys Web FX Lab
// ---------------------------------------------------------------------------

/** A MIDI input or output device, normalized from the Web MIDI API. */
export interface MidiDevice {
  id: string
  name: string
  manufacturer: string
  /** True if the device name matches the PartyKeys hardware. */
  isPartyKeys: boolean
}

export type MidiConnectionStatus =
  | 'unsupported' // Web MIDI API not available in this browser
  | 'idle' // supported, not yet requested
  | 'requesting' // permission prompt in flight
  | 'denied' // user denied access
  | 'ready' // access granted

/** A note currently held down, keyed by MIDI note number. */
export interface ActiveNote {
  note: number
  velocity: number // 0..1
  /** 'midi' = from hardware, 'pointer' = mouse/touch preview. */
  source: 'midi' | 'pointer'
}

// ---------------------------------------------------------------------------
// Sound engine
// ---------------------------------------------------------------------------

export type SynthKind = 'poly' | 'fm' | 'am' | 'mono'

export interface Adsr {
  attack: number
  decay: number
  sustain: number
  release: number
}

/** A selectable instrument preset. */
export interface SoundPreset {
  id: string
  name: string
  description: string
  kind: SynthKind
  /** Oscillator type passed to the Tone.js synth. */
  oscillator: string
  envelope: Adsr
  /** Optional FM/AM modulation params. */
  modulation?: {
    harmonicity?: number
    modulationIndex?: number
    modulationType?: string
  }
  /** Detune spread for "fat" oscillators (cents). */
  spread?: number
  /** Master gain trim for this preset (linear, ~0..1.4). */
  gain?: number
  /** Accent color used in the UI for this preset. */
  accent: string
}

// ---------------------------------------------------------------------------
// DSP FX rack
// ---------------------------------------------------------------------------

export interface ReverbParams {
  enabled: boolean
  wet: number // 0..1
  decay: number // seconds
  roomSize: number // 0..1 -> pre-delay
}
export interface DelayParams {
  enabled: boolean
  wet: number
  time: number // seconds
  feedback: number // 0..0.95
}
export interface ChorusParams {
  enabled: boolean
  wet: number
  depth: number // 0..1
  rate: number // Hz
}
export interface FilterParams {
  enabled: boolean
  cutoff: number // Hz
  resonance: number // Q
}
export interface DistortionParams {
  enabled: boolean
  drive: number // 0..1
  wet: number
}
export interface CompressorParams {
  enabled: boolean
  threshold: number // dB
  ratio: number // 1..20
}

export interface FxState {
  reverb: ReverbParams
  delay: DelayParams
  chorus: ChorusParams
  filter: FilterParams
  distortion: DistortionParams
  compressor: CompressorParams
}

export type FxParamPath =
  | `reverb.${keyof ReverbParams}`
  | `delay.${keyof DelayParams}`
  | `chorus.${keyof ChorusParams}`
  | `filter.${keyof FilterParams}`
  | `distortion.${keyof DistortionParams}`
  | `compressor.${keyof CompressorParams}`

export interface FxMode {
  id: string
  name: string
  description: string
  /** Partial overrides merged over the current FX state. */
  fx: FxState
  accent: string
}

// ---------------------------------------------------------------------------
// LED control
// ---------------------------------------------------------------------------

export type LedMode =
  | 'note' // light the pressed key
  | 'scale' // light notes of the selected scale
  | 'chord' // light chord tones
  | 'reactive' // brightness/color follows FX state
  | 'trail' // fading light trails

export type LedColorMode = 'blue' | 'purple' | 'orange' | 'gradient' | 'rainbow'

/** An RGB triple, each channel 0..255. */
export interface Rgb {
  r: number
  g: number
  b: number
}

export interface LedState {
  enabled: boolean
  mode: LedMode
  color: LedColorMode
  brightness: number // 0..1
}

// ---------------------------------------------------------------------------
// Music theory
// ---------------------------------------------------------------------------

export interface ScaleDef {
  id: string
  name: string
  intervals: number[] // semitone offsets from root
}

export interface ChordResult {
  name: string
  /** Pitch-class set used to detect, sorted. */
  notes: number[]
}
