// ---------------------------------------------------------------------------
// Music theory helpers: note names, scales, chord detection.
// PartyKeys 36-key range = MIDI 48..83 (C3..B5).
// ---------------------------------------------------------------------------

import type { ChordResult, ScaleDef } from './types'

export const PARTYKEYS_LOW = 48 // C3
export const PARTYKEYS_HIGH = 83 // B5
export const PARTYKEYS_KEY_COUNT = PARTYKEYS_HIGH - PARTYKEYS_LOW + 1 // 36

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** True for the 5 sharps in an octave. */
export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12)
}

/** "C", "F#", ... (pitch class only). */
export function pitchClassName(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12]
}

/** Octave number using the convention MIDI 60 = C4. */
export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1
}

/** "C4", "F#3", ... */
export function noteName(midi: number): string {
  return `${pitchClassName(midi)}${octaveOf(midi)}`
}

/** Map a PartyKeys key index (0..35) to a MIDI note. */
export function keyIndexToMidi(index: number): number {
  return PARTYKEYS_LOW + index
}

/** Map a MIDI note to a PartyKeys key index, or -1 if out of range. */
export function midiToKeyIndex(midi: number): number {
  if (midi < PARTYKEYS_LOW || midi > PARTYKEYS_HIGH) return -1
  return midi - PARTYKEYS_LOW
}

export const SCALES: ScaleDef[] = [
  { id: 'major', name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dorian', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'mixolydian', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'pentaMajor', name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  { id: 'pentaMinor', name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  { id: 'harmonicMinor', name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'chromatic', name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]

/** Pitch classes (0..11) belonging to a scale built on a root pitch class. */
export function scalePitchClasses(rootPc: number, scaleId: string): Set<number> {
  const scale = SCALES.find((s) => s.id === scaleId) ?? SCALES[0]
  return new Set(scale.intervals.map((i) => (rootPc + i) % 12))
}

// ---------------------------------------------------------------------------
// Chord detection
// ---------------------------------------------------------------------------

// Interval signatures (from root, normalized to one octave) -> chord quality.
const CHORD_SHAPES: { intervals: number[]; suffix: string }[] = [
  { intervals: [0, 4, 7], suffix: '' }, // major
  { intervals: [0, 3, 7], suffix: 'm' }, // minor
  { intervals: [0, 4, 7, 10], suffix: '7' },
  { intervals: [0, 4, 7, 11], suffix: 'maj7' },
  { intervals: [0, 3, 7, 10], suffix: 'm7' },
  { intervals: [0, 3, 6], suffix: 'dim' },
  { intervals: [0, 4, 8], suffix: 'aug' },
  { intervals: [0, 5, 7], suffix: 'sus4' },
  { intervals: [0, 2, 7], suffix: 'sus2' },
  { intervals: [0, 3, 6, 9], suffix: 'dim7' },
  { intervals: [0, 4, 7, 9], suffix: '6' },
]

function rotate(arr: number[], n: number): number[] {
  return arr.map((_, i) => arr[(i + n) % arr.length])
}

/**
 * Detect a chord from a set of held MIDI notes. Tries every note as a potential
 * root so inversions are still recognized. Returns null for <3 distinct classes.
 */
export function detectChord(midiNotes: number[]): ChordResult | null {
  const pcs = Array.from(new Set(midiNotes.map((n) => ((n % 12) + 12) % 12))).sort(
    (a, b) => a - b,
  )
  if (pcs.length < 3) return null

  for (let i = 0; i < pcs.length; i++) {
    const root = pcs[i]
    const rotated = rotate(pcs, i)
    const intervals = rotated.map((pc) => ((pc - root) % 12 + 12) % 12).sort((a, b) => a - b)

    for (const shape of CHORD_SHAPES) {
      if (
        shape.intervals.length === intervals.length &&
        shape.intervals.every((v, idx) => v === intervals[idx])
      ) {
        return { name: `${NOTE_NAMES[root]}${shape.suffix}`, notes: pcs }
      }
    }
  }
  return null
}

/** Chord tones (pitch classes) for the chord-guide LED mode. */
export function chordTonePitchClasses(midiNotes: number[]): Set<number> {
  return new Set(midiNotes.map((n) => ((n % 12) + 12) % 12))
}
