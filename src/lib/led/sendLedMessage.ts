import type { Rgb } from '../types'
import { scaleBrightness } from './colors'

// ===========================================================================
//  PartyQ / PartyKeys LED OUTPUT  —  EDIT THIS FILE TO MATCH REAL HARDWARE
// ===========================================================================
//
// `sendLedMessage` is the single place that turns an (note, color, brightness,
// duration) request into bytes on the MIDI output. Everything else in the app
// calls this and stays protocol-agnostic. When the *exact* PartyQ LED protocol
// is confirmed, you only need to change `buildLedSysEx` below.
//
// ---------------------------------------------------------------------------
//  Two documented PartyKeys protocols (both over requestMIDIAccess({sysex:true})):
//
//  1) CMD 0x71 — indexed 12-color (hardware-verified, used by shipping games):
//       Vendor header:  F0 05 30 7F 7F 20 00
//       Light keys:     ...71 <count> [note color]...  F7   (real MIDI note 48..83)
//       All off:        ...71 00 F7
//       One key off:    ...71 01 <note> 00 F7
//       Init once after (re)connect:  F0 05 30 7F 7F 20 00 0F 05 F7
//
//  2) CMD 0x15 — per-key full RGB (newer protocol.partykeys.org main command):
//       Init once:      F0 05 30 7F 7F 20 00 0F 01 F7
//       RGB groups:     ...15 <numGroups> <Rhi Rlo Ghi Glo Bhi Blo keyCount key0..> F7
//       (8-bit -> 7-bit pairs: hi = floor(v/128), lo = v % 128; key index 0..35)
//
//  This implementation DEFAULTS to the verified 0x71 indexed protocol so a lamp
//  is guaranteed to light. Flip `LED_PROTOCOL` to '0x15' for full RGB once the
//  connected firmware is confirmed to support it.
// ===========================================================================

export type LedProtocol = '0x71' | '0x15'

/** Switch here when the connected PartyQ firmware is confirmed. */
export const LED_PROTOCOL: LedProtocol = '0x71'

const VENDOR_HEADER = [0xf0, 0x05, 0x30, 0x7f, 0x7f, 0x20, 0x00]
const SYSEX_END = 0xf7

// --- 0x71 indexed 12-color palette ----------------------------------------
const PALETTE_12: { id: number; rgb: Rgb }[] = [
  { id: 0x01, rgb: { r: 255, g: 0, b: 0 } }, // red
  { id: 0x02, rgb: { r: 255, g: 64, b: 0 } }, // red-orange
  { id: 0x03, rgb: { r: 255, g: 128, b: 0 } }, // orange
  { id: 0x04, rgb: { r: 255, g: 96, b: 0 } }, // deep orange
  { id: 0x05, rgb: { r: 255, g: 220, b: 0 } }, // amber/yellow
  { id: 0x06, rgb: { r: 180, g: 255, b: 0 } }, // yellow-green (also "white")
  { id: 0x07, rgb: { r: 0, g: 255, b: 0 } }, // green
  { id: 0x08, rgb: { r: 0, g: 255, b: 200 } }, // cyan
  { id: 0x09, rgb: { r: 0, g: 80, b: 255 } }, // blue
  { id: 0x0a, rgb: { r: 0, g: 0, b: 200 } }, // deep blue
  { id: 0x0b, rgb: { r: 75, g: 0, b: 200 } }, // indigo
  { id: 0x0c, rgb: { r: 160, g: 0, b: 255 } }, // purple
]

/** Nearest 12-color palette index for an arbitrary RGB value. */
function nearestPaletteId(c: Rgb): number {
  let best = PALETTE_12[0]
  let bestDist = Infinity
  for (const entry of PALETTE_12) {
    const d =
      (entry.rgb.r - c.r) ** 2 + (entry.rgb.g - c.g) ** 2 + (entry.rgb.b - c.b) ** 2
    if (d < bestDist) {
      bestDist = d
      best = entry
    }
  }
  return best.id
}

/** 8-bit value -> [hi, lo] 7-bit pair used by the 0x15 RGB protocol. */
function to7bitPair(v: number): [number, number] {
  const x = Math.max(0, Math.min(255, Math.round(v)))
  return [Math.floor(x / 128), x % 128]
}

/**
 * Build the SysEx byte array to set ONE key to a color, for the active protocol.
 * `keyIndex` is 0..35 (PartyQ key index); `midiNote` is the true note 48..83.
 */
function buildLedSysEx(midiNote: number, keyIndex: number, color: Rgb): number[] {
  if (LED_PROTOCOL === '0x15') {
    const [rh, rl] = to7bitPair(color.r)
    const [gh, gl] = to7bitPair(color.g)
    const [bh, bl] = to7bitPair(color.b)
    // ...15 <numGroups=1> <Rhi Rlo Ghi Glo Bhi Blo keyCount=1 key> F7
    return [
      ...VENDOR_HEADER,
      0x15,
      0x01,
      rh, rl, gh, gl, bh, bl,
      0x01,
      keyIndex & 0x7f,
      SYSEX_END,
    ]
  }
  // Default: 0x71 indexed color, addressed by real MIDI note.
  const colorId = nearestPaletteId(color)
  return [...VENDOR_HEADER, 0x71, 0x01, midiNote & 0x7f, colorId & 0x7f, SYSEX_END]
}

/** Build the "init" SysEx required once after each (re)connection. */
export function buildLedInit(): number[] {
  const sub = LED_PROTOCOL === '0x15' ? 0x01 : 0x05
  return [...VENDOR_HEADER, 0x0f, sub, SYSEX_END]
}

/** Build the "all keys off" SysEx. */
export function buildLedAllOff(): number[] {
  return [...VENDOR_HEADER, 0x71, 0x00, SYSEX_END]
}

// ---------------------------------------------------------------------------
//  Public API used by the rest of the app.
// ---------------------------------------------------------------------------

/**
 * Send a single LED command to the keyboard.
 *
 * @param output     selected MIDI output (null = no device; logs instead)
 * @param note       real MIDI note number (48..83 for PartyQ)
 * @param color      desired RGB (will be quantized for the 0x71 protocol)
 * @param brightness 0..1 multiplier applied to the color
 * @param duration   optional auto-off in ms (used by Note Light / Trail modes)
 * @param keyIndex   PartyQ key index 0..35 (needed by the 0x15 protocol)
 *
 * NOTE: hardware LED latency is ~200ms — when tightly syncing to audio, send
 * the LED on the beat and delay audio + visuals by the same constant.
 */
export function sendLedMessage(
  output: MIDIOutput | null,
  note: number,
  color: Rgb,
  brightness = 1,
  duration?: number,
  keyIndex = note - 48,
): void {
  const finalColor = scaleBrightness(color, brightness)
  const bytes = buildLedSysEx(note, keyIndex, finalColor)

  if (!output) {
    // Safe fallback: no device selected — surface the intent for debugging.
    // (Comment out in production if too noisy.)
    // eslint-disable-next-line no-console
    console.debug('[LED] (no output) note=%d rgb=%o b=%s', note, finalColor, brightness)
    return
  }

  try {
    output.send(bytes)
    if (duration && duration > 0) {
      // Auto-off after `duration` ms (turn this single key off).
      window.setTimeout(() => {
        try {
          output.send([...VENDOR_HEADER, 0x71, 0x01, note & 0x7f, 0x00, SYSEX_END])
        } catch {
          /* device may have disconnected */
        }
      }, duration)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[LED] send failed', err)
  }
}

/** Convenience: initialize the device (call once after selecting an output). */
export function initLed(output: MIDIOutput | null): void {
  if (!output) return
  try {
    output.send(buildLedInit())
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[LED] init failed', err)
  }
}

/** Convenience: turn a single key off (used on note-off). */
export function ledKeyOff(output: MIDIOutput | null, note: number): void {
  if (!output) return
  try {
    output.send([...VENDOR_HEADER, 0x71, 0x01, note & 0x7f, 0x00, SYSEX_END])
  } catch {
    /* ignore */
  }
}

/** Convenience: turn every key off. */
export function allLedsOff(output: MIDIOutput | null): void {
  if (!output) return
  try {
    output.send(buildLedAllOff())
  } catch {
    /* ignore */
  }
}
