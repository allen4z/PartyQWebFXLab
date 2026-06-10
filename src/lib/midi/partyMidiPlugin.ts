import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

// ---------------------------------------------------------------------------
// JS interface for the native CoreMIDI plugin (ios/App/App/PartyMidiPlugin.swift).
// Registered by name; on web this resolves to a no-op proxy that simply rejects,
// which is fine because we only use it when Capacitor reports a native platform.
// ---------------------------------------------------------------------------

export interface NativeMidiDevice {
  id: string
  name: string
  manufacturer: string
}

export interface PartyMidiPlugin {
  /** Create the CoreMIDI client and begin observing devices. */
  initialize(): Promise<void>
  /** Current input + output endpoints (BLE or USB — CoreMIDI treats them alike). */
  getDevices(): Promise<{ inputs: NativeMidiDevice[]; outputs: NativeMidiDevice[] }>
  /** Route note input from this endpoint id (empty string = none). */
  selectInput(options: { id: string }): Promise<void>
  /** Route LED/SysEx output to this endpoint id (empty string = none). */
  selectOutput(options: { id: string }): Promise<void>
  /** Send raw MIDI bytes (incl. SysEx) to the selected output. */
  send(options: { data: number[] }): Promise<void>
  /** Present the system Bluetooth-MIDI pairing sheet. */
  presentBlePairing(): Promise<void>

  addListener(
    eventName: 'noteOn',
    cb: (e: { note: number; velocity: number }) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'noteOff',
    cb: (e: { note: number }) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'stateChange',
    cb: () => void,
  ): Promise<PluginListenerHandle>
}

export const PartyMidi = registerPlugin<PartyMidiPlugin>('PartyMidi')
