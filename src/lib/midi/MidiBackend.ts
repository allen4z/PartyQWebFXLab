import type { MidiConnectionStatus, MidiDevice } from '../types'

// ---------------------------------------------------------------------------
// Platform-agnostic MIDI backend contract.
//
// Two implementations:
//   - WebMidiBackend     → browser / desktop Chrome via the Web MIDI API
//   - NativeMidiBackend  → iOS (and Android) via the native CoreMIDI plugin
//
// The rest of the app (store + LED) talks ONLY to this interface, so swapping
// platforms never touches UI or LED logic.
// ---------------------------------------------------------------------------

export interface MidiBackendCallbacks {
  onNoteOn?: (note: number, velocity: number) => void
  onNoteOff?: (note: number) => void
  onStateChange?: () => void
}

export interface MidiBackend {
  /** 'web' | 'native' — for UI hints (e.g. show the Bluetooth pairing button). */
  readonly kind: 'web' | 'native'
  /** Whether this platform can do MIDI at all. */
  readonly supported: boolean

  status: MidiConnectionStatus
  inputs: MidiDevice[]
  outputs: MidiDevice[]
  selectedInputId: string | null
  selectedOutputId: string | null

  setCallbacks(cb: MidiBackendCallbacks): void
  connect(): Promise<MidiConnectionStatus>
  selectInput(id: string | null): void
  selectOutput(id: string | null): void

  /** Raw bytes to the selected output (used for all LED SysEx). */
  send(bytes: number[]): void
  /** True when a usable output is selected. */
  hasOutput(): boolean

  /**
   * iOS only: present the system Bluetooth-MIDI pairing sheet so the user can
   * connect the PartyKeys keyboard wirelessly. No-op on web.
   */
  presentBlePairing?(): Promise<void>
}

/** Detect PartyKeys / PartyQ by device name (competitor names ignored). */
export function isPartyKeysName(name: string): boolean {
  return /party\s*(q|key)/i.test(name)
}
