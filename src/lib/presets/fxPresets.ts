import type { FxMode, FxState } from '../types'

// ---------------------------------------------------------------------------
// Default FX rack state + 8 one-tap FX modes.
// ---------------------------------------------------------------------------

export const DEFAULT_FX: FxState = {
  reverb: { enabled: true, wet: 0.25, decay: 2.2, roomSize: 0.4 },
  delay: { enabled: false, wet: 0.2, time: 0.28, feedback: 0.3 },
  chorus: { enabled: false, wet: 0.3, depth: 0.6, rate: 1.5 },
  filter: { enabled: false, cutoff: 12000, resonance: 0.8 },
  distortion: { enabled: false, drive: 0.2, wet: 0.4 },
  compressor: { enabled: true, threshold: -24, ratio: 3 },
}

/** Deep clone so each preset application is independent of the defaults. */
export function cloneFx(fx: FxState): FxState {
  return JSON.parse(JSON.stringify(fx)) as FxState
}

export const FX_MODES: FxMode[] = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'Dry signal, light glue compression.',
    accent: '#94a3b8',
    fx: {
      reverb: { enabled: false, wet: 0.1, decay: 1.5, roomSize: 0.3 },
      delay: { enabled: false, wet: 0.15, time: 0.25, feedback: 0.2 },
      chorus: { enabled: false, wet: 0.2, depth: 0.4, rate: 1.2 },
      filter: { enabled: false, cutoff: 16000, resonance: 0.5 },
      distortion: { enabled: false, drive: 0.1, wet: 0.3 },
      compressor: { enabled: true, threshold: -20, ratio: 2 },
    },
  },
  {
    id: 'space',
    name: 'Space',
    description: 'Lush reverb + delay for floating textures.',
    accent: '#60a5fa',
    fx: {
      reverb: { enabled: true, wet: 0.55, decay: 5.5, roomSize: 0.8 },
      delay: { enabled: true, wet: 0.35, time: 0.4, feedback: 0.45 },
      chorus: { enabled: true, wet: 0.3, depth: 0.5, rate: 0.8 },
      filter: { enabled: false, cutoff: 14000, resonance: 0.6 },
      distortion: { enabled: false, drive: 0.1, wet: 0.3 },
      compressor: { enabled: true, threshold: -22, ratio: 3 },
    },
  },
  {
    id: 'lofi',
    name: 'Lo-fi',
    description: 'Low-pass filter, soft drive, gentle wobble.',
    accent: '#a78bfa',
    fx: {
      reverb: { enabled: true, wet: 0.2, decay: 1.8, roomSize: 0.3 },
      delay: { enabled: false, wet: 0.2, time: 0.3, feedback: 0.25 },
      chorus: { enabled: true, wet: 0.4, depth: 0.8, rate: 0.6 },
      filter: { enabled: true, cutoff: 2600, resonance: 1.2 },
      distortion: { enabled: true, drive: 0.18, wet: 0.35 },
      compressor: { enabled: true, threshold: -26, ratio: 4 },
    },
  },
  {
    id: 'stadium',
    name: 'Stadium',
    description: 'Huge reverb and heavy compression.',
    accent: '#f97316',
    fx: {
      reverb: { enabled: true, wet: 0.65, decay: 7, roomSize: 0.95 },
      delay: { enabled: true, wet: 0.25, time: 0.5, feedback: 0.35 },
      chorus: { enabled: false, wet: 0.3, depth: 0.5, rate: 1 },
      filter: { enabled: false, cutoff: 15000, resonance: 0.5 },
      distortion: { enabled: false, drive: 0.1, wet: 0.3 },
      compressor: { enabled: true, threshold: -30, ratio: 6 },
    },
  },
  {
    id: 'dream',
    name: 'Dream',
    description: 'Soft chorus, wide reverb, slow delay.',
    accent: '#c084fc',
    fx: {
      reverb: { enabled: true, wet: 0.5, decay: 4.5, roomSize: 0.7 },
      delay: { enabled: true, wet: 0.3, time: 0.55, feedback: 0.4 },
      chorus: { enabled: true, wet: 0.5, depth: 0.7, rate: 1 },
      filter: { enabled: true, cutoff: 9000, resonance: 0.7 },
      distortion: { enabled: false, drive: 0.1, wet: 0.3 },
      compressor: { enabled: true, threshold: -24, ratio: 3 },
    },
  },
  {
    id: 'edm',
    name: 'EDM',
    description: 'Tight delay, resonant filter, punchy comp.',
    accent: '#22d3ee',
    fx: {
      reverb: { enabled: true, wet: 0.2, decay: 1.6, roomSize: 0.4 },
      delay: { enabled: true, wet: 0.4, time: 0.19, feedback: 0.55 },
      chorus: { enabled: true, wet: 0.25, depth: 0.5, rate: 2.4 },
      filter: { enabled: true, cutoff: 6000, resonance: 3.5 },
      distortion: { enabled: true, drive: 0.25, wet: 0.4 },
      compressor: { enabled: true, threshold: -28, ratio: 8 },
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Wide hall, slow swells, controlled lows.',
    accent: '#818cf8',
    fx: {
      reverb: { enabled: true, wet: 0.6, decay: 8, roomSize: 0.9 },
      delay: { enabled: true, wet: 0.2, time: 0.66, feedback: 0.3 },
      chorus: { enabled: true, wet: 0.35, depth: 0.6, rate: 0.5 },
      filter: { enabled: true, cutoff: 11000, resonance: 0.6 },
      distortion: { enabled: false, drive: 0.1, wet: 0.3 },
      compressor: { enabled: true, threshold: -26, ratio: 4 },
    },
  },
  {
    id: 'practice',
    name: 'Practice Mode',
    description: 'Fully dry & clear — best for learning.',
    accent: '#34d399',
    fx: {
      reverb: { enabled: false, wet: 0.05, decay: 1, roomSize: 0.2 },
      delay: { enabled: false, wet: 0.1, time: 0.25, feedback: 0.1 },
      chorus: { enabled: false, wet: 0.2, depth: 0.4, rate: 1 },
      filter: { enabled: false, cutoff: 18000, resonance: 0.5 },
      distortion: { enabled: false, drive: 0.05, wet: 0.2 },
      compressor: { enabled: false, threshold: -18, ratio: 2 },
    },
  },
]

export function getFxMode(id: string): FxMode | undefined {
  return FX_MODES.find((m) => m.id === id)
}
