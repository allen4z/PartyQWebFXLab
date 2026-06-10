import type { MidiConnectionStatus, MidiDevice } from '../types'
import {
  isPartyKeysName,
  type MidiBackend,
  type MidiBackendCallbacks,
} from './MidiBackend'
import { PartyMidi, type NativeMidiDevice } from './partyMidiPlugin'

// ---------------------------------------------------------------------------
// Native CoreMIDI backend (iOS). Talks to the Swift PartyMidi plugin, which
// handles BLE/USB MIDI endpoints, note input, and SysEx output via CoreMIDI.
// ---------------------------------------------------------------------------

function toDevice(d: NativeMidiDevice): MidiDevice {
  return {
    id: d.id,
    name: d.name,
    manufacturer: d.manufacturer,
    isPartyKeys: isPartyKeysName(d.name),
  }
}

export class NativeMidiBackend implements MidiBackend {
  readonly kind = 'native' as const
  readonly supported = true

  private callbacks: MidiBackendCallbacks = {}
  private listenersBound = false

  status: MidiConnectionStatus = 'idle'
  inputs: MidiDevice[] = []
  outputs: MidiDevice[] = []
  selectedInputId: string | null = null
  selectedOutputId: string | null = null

  setCallbacks(cb: MidiBackendCallbacks) {
    this.callbacks = cb
  }

  async connect(): Promise<MidiConnectionStatus> {
    this.status = 'requesting'
    this.callbacks.onStateChange?.()
    try {
      await PartyMidi.initialize()
      await this.bindListeners()
      this.status = 'ready'
      await this.refresh()
      this.autoSelect()
      return this.status
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[MIDI/native] init failed', err)
      this.status = 'denied'
      this.callbacks.onStateChange?.()
      return this.status
    }
  }

  private async bindListeners() {
    if (this.listenersBound) return
    this.listenersBound = true
    await PartyMidi.addListener('noteOn', (e) =>
      this.callbacks.onNoteOn?.(e.note, e.velocity),
    )
    await PartyMidi.addListener('noteOff', (e) => this.callbacks.onNoteOff?.(e.note))
    await PartyMidi.addListener('stateChange', () => {
      void this.refresh()
    })
  }

  private async refresh() {
    try {
      const { inputs, outputs } = await PartyMidi.getDevices()
      this.inputs = inputs.map(toDevice)
      this.outputs = outputs.map(toDevice)
      if (this.selectedInputId && !this.inputs.some((d) => d.id === this.selectedInputId)) {
        this.selectedInputId = null
      }
      if (this.selectedOutputId && !this.outputs.some((d) => d.id === this.selectedOutputId)) {
        this.selectedOutputId = null
      }
      this.callbacks.onStateChange?.()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[MIDI/native] getDevices failed', err)
    }
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
    void PartyMidi.selectInput({ id: id ?? '' })
    this.callbacks.onStateChange?.()
  }

  selectOutput(id: string | null) {
    this.selectedOutputId = id
    void PartyMidi.selectOutput({ id: id ?? '' })
    this.callbacks.onStateChange?.()
  }

  hasOutput(): boolean {
    return !!this.selectedOutputId
  }

  send(bytes: number[]): void {
    if (!this.selectedOutputId) return
    // Fire-and-forget; LED rates are well within the bridge's throughput.
    void PartyMidi.send({ data: bytes }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[MIDI/native] send failed', err)
    })
  }

  async presentBlePairing(): Promise<void> {
    try {
      await PartyMidi.presentBlePairing()
      // Devices usually change right after pairing.
      await this.refresh()
      this.autoSelect()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[MIDI/native] BLE pairing failed', err)
    }
  }
}
