import type { LedColorMode, Rgb } from '../types'
import { midiToKeyIndex, PARTYQ_KEY_COUNT } from '../music'

// ---------------------------------------------------------------------------
// Color helpers for LED output + on-screen key glow. Pure functions.
// ---------------------------------------------------------------------------

const BLUE: Rgb = { r: 59, g: 130, b: 246 }
const PURPLE: Rgb = { r: 168, g: 85, b: 247 }
const ORANGE: Rgb = { r: 249, g: 115, b: 22 }

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) }
}

/** HSV (h in 0..360, s/v in 0..1) -> RGB 0..255. */
export function hsvToRgb(h: number, s: number, v: number): Rgb {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/**
 * Resolve the RGB color for a given key under a color mode.
 * For 'gradient' and 'rainbow', the key's position across the 36-key span sets
 * the hue, so chords/scales paint a smooth spectrum.
 */
export function colorForKey(mode: LedColorMode, midi: number): Rgb {
  const idx = Math.max(0, midiToKeyIndex(midi))
  const t = idx / (PARTYQ_KEY_COUNT - 1) // 0..1 across the keybed
  switch (mode) {
    case 'blue':
      return BLUE
    case 'purple':
      return PURPLE
    case 'orange':
      return ORANGE
    case 'gradient':
      // Blue -> purple -> orange across the keybed.
      return t < 0.5 ? lerpRgb(BLUE, PURPLE, t * 2) : lerpRgb(PURPLE, ORANGE, (t - 0.5) * 2)
    case 'rainbow':
      return hsvToRgb(t * 300, 0.85, 1)
    default:
      return BLUE
  }
}

export function rgbToCss(c: Rgb, alpha = 1): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`
}

export function scaleBrightness(c: Rgb, brightness: number): Rgb {
  const b = Math.max(0, Math.min(1, brightness))
  return { r: Math.round(c.r * b), g: Math.round(c.g * b), b: Math.round(c.b * b) }
}
