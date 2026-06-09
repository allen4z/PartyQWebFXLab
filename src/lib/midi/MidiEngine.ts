import type { MidiConnectionStatus, MidiDevice } from '../types'

// ---------------------------------------------------------------------------
// Thin wrapper around the Web MIDI API. Normalizes devices, routes note on/off
// to callbacks, and exposes the selected MIDIOutput for LED messages.
//
// Everything degrades safely when Web MIDI is unavailable (e.g. Safari/Firefox
// without the flag) — `status` becomes 'unsupported' and the UI offers the
// on-screen keyboard instead.
// ---------------------------------------------------------------------------

const NOTE_ON = 0x90
const NOTE_OFF = 0x80

export interface MidiEngineCallbacks {
  onNoteOn?: (note: number, velocity: number) => void
  onNoteOff?: (note: number) => void
  onStateChange?: () => void
}

/** Detect PartyKeys by device name. Competitor names are ignored. */
function isPartyKeysName(name: string): boolean {
  return /party\s*(q|key)/i.test(name)
}

function toDevice(port: MIDIInput | MIDIOutput): MidiDevice {
  const name = port.name ?? 'Unknown device'
  return {
    id: port.id,
    name,
    manufacturer: port.manufacturer ?? '',
    isPartyKeys: isPartyKeysName(name),
  }
}

export class MidiEngine {
  private access: MIDIAccess | null = null
  private callbacks: MidiEngineCallbacks = {}

  status: MidiConnectionStatus = 'idle'
  inputs: MidiDevice[] = []
  outputs: MidiDevice[] = []
  selectedInputId: string | null = null
  selectedOutputId: string | null = null

  constructor() {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      this.status = 'unsupported'
    }
  }

  get supported(): boolean {
    return this.status !== 'unsupported'
  }

  setCallbacks(cb: MidiEngineCallbacks) {
    this.callbacks = cb
  }

  /** Request MIDI access (with SysEx for LED control). */
  async connect(): Promise<MidiConnectionStatus> {
    if (!this.supported) return 'unsupported'
    this.status = 'requesting'
    this.callbacks.onStateChange?.()
    try {
      // sysex:true is required for PartyKeys LED output.
      this.access = await navigator.requestMIDIAccess({ sysex: true })
      this.status = 'ready'
      this.access.onstatechange = () => this.refresh()
      this.refresh()
      // Auto-select the PartyKeys device if present.
      this.autoSelect()
      return this.status
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[MIDI] access denied / failed', err)
      this.status = 'denied'
      this.callbacks.onStateChange?.()
      return this.status
    }
  }

  /** Re-read the device lists from the MIDIAccess object. */
  private refresh() {
    if (!this.access) return
    this.inputs = Array.from(this.access.inputs.values()).map(toDevice)
    this.outputs = Array.from(this.access.outputs.values()).map(toDevice)

    // Drop selections whose device disappeared.
    if (this.selectedInputId && !this.inputs.some((d) => d.id === this.selectedInputId)) {
      this.selectedInputId = null
    }
    if (
      this.selectedOutputId &&
      !this.outputs.some((d) => d.id === this.selectedOutputId)
    ) {
      this.selectedOutputId = null
    }
    this.rebindInput()
    this.callbacks.onStateChange?.()
  }

  private autoSelect() {
    if (!this.selectedInputId) {
      const pq = this.inputs.find((d) => d.isPartyKeys) ?? this.inputs[0]
      if (pq) this.selectInput(pq.id)
    }
    if (!this.selectedOutputId) {
      const pq = this.outputs.find((d) => d.isPartyKeys) ?? this.outputs[0]
      if (pq) this.selectOutput(pq.id)
    }
  }

  selectInput(id: string | null) {
    this.selectedInputId = id
    this.rebindInput()
    this.callbacks.onStateChange?.()
  }

  selectOutput(id: string | null) {
    this.selectedOutputId = id
    this.callbacks.onStateChange?.()
  }

  /** Attach our message handler to the selected input only. */
  private rebindInput() {
    if (!this.access) return
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = input.id === this.selectedInputId ? this.handleMessage : null
    }
  }

  private handleMessage = (e: MIDIMessageEvent) => {
    const data = e.data
    if (!data || data.length < 2) return
    const status = data[0] & 0xf0
    const note = data[1]
    const velocity = data.length > 2 ? data[2] : 0

    if (status === NOTE_ON && velocity > 0) {
      this.callbacks.onNoteOn?.(note, velocity / 127)
    } else if (status === NOTE_OFF || (status === NOTE_ON && velocity === 0)) {
      this.callbacks.onNoteOff?.(note)
    }
  }

  getSelectedOutput(): MIDIOutput | null {
    if (!this.access || !this.selectedOutputId) return null
    return this.access.outputs.get(this.selectedOutputId) ?? null
  }
}

// Module-level singleton — one MIDI connection per page.
export const midiEngine = new MidiEngine()
