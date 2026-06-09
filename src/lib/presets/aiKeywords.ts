import type { FxState } from '../types'
import { cloneFx, DEFAULT_FX, getFxMode } from './fxPresets'
import { getPreset } from './soundPresets'

// ---------------------------------------------------------------------------
// Local "AI" sound designer. Maps natural-language keywords in a prompt to a
// preset + FX mode + parameter nudges. No external API — fully offline.
//
// To upgrade to a real model later, replace `interpretPrompt` with a call to a
// serverless proxy (keep API keys server-side) that returns the same shape.
// ---------------------------------------------------------------------------

export interface PromptResult {
  presetId: string
  fxModeId: string
  /** FX state after applying the chosen mode + nudges. */
  fx: FxState
  /** Human-readable explanation of what was matched. */
  matched: string[]
}

interface Rule {
  /** Keywords (lowercase) that activate this rule. */
  keywords: string[]
  presetId?: string
  fxModeId?: string
  /** Mutates the working FX state for finer nudges. */
  tweak?: (fx: FxState) => void
  label: string
}

const RULES: Rule[] = [
  {
    keywords: ['dreamy', 'dream', 'ethereal', 'glass hall', 'floaty'],
    presetId: 'soft-pad',
    fxModeId: 'dream',
    tweak: (fx) => {
      fx.reverb.enabled = true
      fx.reverb.wet = Math.max(fx.reverb.wet, 0.55)
      fx.delay.enabled = true
      fx.delay.wet = Math.max(fx.delay.wet, 0.3)
    },
    label: 'dreamy → Soft Pad + big reverb + delay',
  },
  {
    keywords: ['lofi', 'lo-fi', 'dusty', 'vintage', 'tape', 'cassette'],
    presetId: 'lofi-keys',
    fxModeId: 'lofi',
    tweak: (fx) => {
      fx.filter.enabled = true
      fx.filter.cutoff = Math.min(fx.filter.cutoff, 2600)
      fx.distortion.enabled = true
    },
    label: 'lofi → Lo-fi Keys + low-pass filter + light distortion',
  },
  {
    keywords: ['stadium', 'arena', 'huge', 'massive', 'epic'],
    presetId: 'dream-piano',
    fxModeId: 'stadium',
    tweak: (fx) => {
      fx.reverb.enabled = true
      fx.reverb.wet = Math.max(fx.reverb.wet, 0.65)
      fx.compressor.enabled = true
    },
    label: 'stadium → Dream Piano + huge reverb + compression',
  },
  {
    keywords: ['edm', 'club', 'dance', 'festival', 'drop'],
    presetId: 'bass-pulse',
    fxModeId: 'edm',
    tweak: (fx) => {
      fx.delay.enabled = true
      fx.filter.enabled = true
      fx.filter.resonance = Math.max(fx.filter.resonance, 3.5)
    },
    label: 'edm → Bass Pulse + delay + filter modulation',
  },
  {
    keywords: ['lead', 'solo', 'analog'],
    presetId: 'analog-lead',
    fxModeId: 'edm',
    label: 'lead → Analog Lead + EDM rack',
  },
  {
    keywords: ['piano', 'keys', 'grand'],
    presetId: 'dream-piano',
    label: 'piano → Dream Piano',
  },
  {
    keywords: ['bell', 'glass', 'crystal', 'shimmer'],
    presetId: 'pluck-bell',
    fxModeId: 'space',
    label: 'bell → Pluck Bell + Space rack',
  },
  {
    keywords: ['choir', 'vocal', 'voices', 'angelic'],
    presetId: 'cyber-choir',
    fxModeId: 'cinematic',
    label: 'choir → Cyber Choir + Cinematic hall',
  },
  {
    keywords: ['organ', 'church', 'gospel'],
    presetId: 'warm-organ',
    fxModeId: 'space',
    label: 'organ → Warm Organ + Space',
  },
  {
    keywords: ['marimba', 'mallet', 'wood', 'percussive'],
    presetId: 'future-marimba',
    label: 'marimba → Future Marimba',
  },
  {
    keywords: ['brass', 'horn', 'bold', 'powerful'],
    presetId: 'synth-brass',
    label: 'brass → Synth Brass',
  },
  {
    keywords: ['arp', 'arpeggio', 'space', 'cosmic', 'galaxy'],
    presetId: 'space-arp',
    fxModeId: 'space',
    label: 'space → Space Arp + Space rack',
  },
  {
    keywords: ['bass', 'sub', 'low'],
    presetId: 'bass-pulse',
    label: 'bass → Bass Pulse',
  },
  {
    keywords: ['cinematic', 'film', 'score', 'soundtrack'],
    presetId: 'soft-pad',
    fxModeId: 'cinematic',
    label: 'cinematic → Soft Pad + Cinematic hall',
  },
  {
    keywords: ['practice', 'learn', 'clean', 'dry'],
    presetId: 'neon-ep',
    fxModeId: 'practice',
    label: 'practice → Neon EP + dry Practice rack',
  },
  // Modifier-only rules (no preset change), applied after the main match.
  {
    keywords: ['reverb', 'hall', 'cathedral', 'roomy', 'spacious'],
    tweak: (fx) => {
      fx.reverb.enabled = true
      fx.reverb.wet = Math.max(fx.reverb.wet, 0.5)
      fx.reverb.decay = Math.max(fx.reverb.decay, 4)
    },
    label: '+ more reverb',
  },
  {
    keywords: ['delay', 'echo'],
    tweak: (fx) => {
      fx.delay.enabled = true
      fx.delay.wet = Math.max(fx.delay.wet, 0.35)
    },
    label: '+ delay',
  },
  {
    keywords: ['warm', 'soft', 'mellow', 'gentle'],
    tweak: (fx) => {
      fx.filter.enabled = true
      fx.filter.cutoff = Math.min(fx.filter.cutoff, 6000)
    },
    label: '+ warmer tone',
  },
  {
    keywords: ['bright', 'sharp', 'crisp'],
    tweak: (fx) => {
      fx.filter.enabled = false
      fx.distortion.enabled = true
      fx.distortion.drive = Math.max(fx.distortion.drive, 0.25)
    },
    label: '+ brighter / edgier',
  },
  {
    keywords: ['gritty', 'distorted', 'dirty', 'crunch'],
    tweak: (fx) => {
      fx.distortion.enabled = true
      fx.distortion.drive = Math.max(fx.distortion.drive, 0.45)
      fx.distortion.wet = Math.max(fx.distortion.wet, 0.6)
    },
    label: '+ distortion',
  },
]

/**
 * Interpret a free-text prompt into a preset + FX configuration.
 * The first matching "preset rule" wins for the instrument; all matching
 * modifier rules are layered on top.
 */
export function interpretPrompt(prompt: string): PromptResult {
  const text = prompt.toLowerCase()
  const matched: string[] = []

  let presetId = 'dream-piano'
  let fxModeId = 'clean'
  let foundPreset = false

  // First pass: instrument + base FX mode.
  for (const rule of RULES) {
    if (!rule.presetId) continue
    if (rule.keywords.some((k) => text.includes(k))) {
      if (!foundPreset) {
        presetId = rule.presetId
        if (rule.fxModeId) fxModeId = rule.fxModeId
        matched.push(rule.label)
        foundPreset = true
      }
    }
  }

  // Build FX from the chosen mode (or defaults).
  const mode = getFxMode(fxModeId)
  const fx = cloneFx(mode ? mode.fx : DEFAULT_FX)

  // Second pass: apply all tweaks (preset rule tweaks for the matched preset,
  // plus every modifier-only rule that matched).
  for (const rule of RULES) {
    if (!rule.keywords.some((k) => text.includes(k))) continue
    if (rule.presetId && rule.presetId !== presetId) continue
    if (rule.tweak) {
      rule.tweak(fx)
      if (!matched.includes(rule.label)) matched.push(rule.label)
    }
  }

  if (matched.length === 0) {
    matched.push('no keywords matched → kept Dream Piano + Clean')
  }

  // Touch getPreset so an invalid id can never leak downstream.
  void getPreset(presetId)

  return { presetId, fxModeId, fx, matched }
}
