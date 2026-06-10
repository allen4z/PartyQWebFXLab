import Foundation
import Capacitor
import CoreMIDI
import CoreAudioKit
import UIKit

// ===========================================================================
//  PartyMidi — native CoreMIDI bridge for PartyKeys Web FX Lab (iOS).
//
//  Gives the web layer what Web MIDI can't on iOS:
//    • enumerate BLE/USB MIDI endpoints (CoreMIDI treats them the same)
//    • receive note on/off from the keyboard
//    • send raw bytes incl. SysEx (LED control)  ← the whole point
//    • present the system Bluetooth-MIDI pairing sheet
//
//  The JS side (lib/midi/NativeMidiBackend.ts) calls these methods and listens
//  for "noteOn" / "noteOff" / "stateChange" events.
// ===========================================================================

@objc(PartyMidiPlugin)
public class PartyMidiPlugin: CAPPlugin {
    private var client = MIDIClientRef()
    private var inputPort = MIDIPortRef()
    private var outputPort = MIDIPortRef()
    private var connectedSource: MIDIEndpointRef = 0
    private var selectedDestination: MIDIEndpointRef = 0
    private var initialized = false

    // MARK: - Lifecycle

    @objc func initialize(_ call: CAPPluginCall) {
        if initialized { call.resolve(); return }

        var status = MIDIClientCreateWithBlock("PartyKeysFXLab" as CFString, &client) { [weak self] notificationPtr in
            let msgID = notificationPtr.pointee.messageID
            if msgID == .msgObjectAdded || msgID == .msgObjectRemoved || msgID == .msgSetupChanged {
                self?.notifyListeners("stateChange", data: [:])
            }
        }
        guard status == noErr else { call.reject("MIDIClient create failed (\(status))"); return }

        status = MIDIInputPortCreateWithBlock(client, "PartyKeysIn" as CFString, &inputPort) { [weak self] pktList, _ in
            self?.handlePackets(pktList)
        }
        guard status == noErr else { call.reject("Input port create failed (\(status))"); return }

        status = MIDIOutputPortCreate(client, "PartyKeysOut" as CFString, &outputPort)
        guard status == noErr else { call.reject("Output port create failed (\(status))"); return }

        initialized = true
        call.resolve()
    }

    // MARK: - Device enumeration

    @objc func getDevices(_ call: CAPPluginCall) {
        var inputs: [[String: Any]] = []
        for i in 0 ..< MIDIGetNumberOfSources() {
            inputs.append(endpointInfo(MIDIGetSource(i)))
        }
        var outputs: [[String: Any]] = []
        for i in 0 ..< MIDIGetNumberOfDestinations() {
            outputs.append(endpointInfo(MIDIGetDestination(i)))
        }
        call.resolve(["inputs": inputs, "outputs": outputs])
    }

    @objc func selectInput(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        if connectedSource != 0 {
            MIDIPortDisconnectSource(inputPort, connectedSource)
            connectedSource = 0
        }
        if let ep = endpoint(forId: id, isSource: true) {
            MIDIPortConnectSource(inputPort, ep, nil)
            connectedSource = ep
        }
        call.resolve()
    }

    @objc func selectOutput(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        selectedDestination = endpoint(forId: id, isSource: false) ?? 0
        call.resolve()
    }

    // MARK: - Output (LED / SysEx)

    @objc func send(_ call: CAPPluginCall) {
        guard selectedDestination != 0 else { call.resolve(); return }
        let raw = (call.options["data"] as? [Any]) ?? []
        let bytes = raw.compactMap { ($0 as? NSNumber)?.uint8Value }
        if !bytes.isEmpty { sendBytes(bytes) }
        call.resolve()
    }

    private func sendBytes(_ bytes: [UInt8]) {
        guard selectedDestination != 0, bytes.count < 256 else { return }
        var packetList = MIDIPacketList()
        let packet = MIDIPacketListInit(&packetList)
        bytes.withUnsafeBufferPointer { ptr in
            _ = MIDIPacketListAdd(&packetList, 1024, packet, 0, bytes.count, ptr.baseAddress!)
        }
        MIDISend(outputPort, selectedDestination, &packetList)
    }

    // MARK: - Input parsing

    private func handlePackets(_ pktList: UnsafePointer<MIDIPacketList>) {
        var packet = pktList.pointee.packet
        for _ in 0 ..< pktList.pointee.numPackets {
            let length = Int(packet.length)
            withUnsafeBytes(of: packet.data) { rawBuf in
                let bytes = rawBuf.bindMemory(to: UInt8.self)
                var i = 0
                while i < length {
                    let status = bytes[i] & 0xF0
                    if status == 0x90, i + 2 < length {
                        let note = Int(bytes[i + 1])
                        let vel = Int(bytes[i + 2])
                        if vel > 0 {
                            notifyListeners("noteOn", data: ["note": note, "velocity": Double(vel) / 127.0])
                        } else {
                            notifyListeners("noteOff", data: ["note": note])
                        }
                        i += 3
                    } else if status == 0x80, i + 2 < length {
                        notifyListeners("noteOff", data: ["note": Int(bytes[i + 1])])
                        i += 3
                    } else {
                        i += 1
                    }
                }
            }
            packet = MIDIPacketNext(&packet).pointee
        }
    }

    // MARK: - Bluetooth MIDI pairing sheet

    @objc func presentBlePairing(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let host = self?.bridge?.viewController else {
                call.reject("No view controller to present from")
                return
            }
            let picker = CABTMIDICentralViewController()
            let nav = UINavigationController(rootViewController: picker)
            picker.title = "Connect PartyKeys"
            picker.navigationItem.rightBarButtonItem = UIBarButtonItem(
                barButtonSystemItem: .done, target: self, action: #selector(self?.dismissBlePicker)
            )
            host.present(nav, animated: true)
            call.resolve()
        }
    }

    @objc private func dismissBlePicker() {
        bridge?.viewController?.dismiss(animated: true)
        // Devices likely changed after pairing.
        notifyListeners("stateChange", data: [:])
    }

    // MARK: - Helpers

    private func endpointInfo(_ ep: MIDIEndpointRef) -> [String: Any] {
        return [
            "id": String(uniqueId(ep)),
            "name": stringProperty(ep, kMIDIPropertyDisplayName) ?? "MIDI Device",
            "manufacturer": stringProperty(ep, kMIDIPropertyManufacturer) ?? "",
        ]
    }

    private func uniqueId(_ ep: MIDIEndpointRef) -> Int32 {
        var id: Int32 = 0
        MIDIObjectGetIntegerProperty(ep, kMIDIPropertyUniqueID, &id)
        return id
    }

    private func stringProperty(_ ep: MIDIEndpointRef, _ prop: CFString) -> String? {
        var unmanaged: Unmanaged<CFString>?
        let status = MIDIObjectGetStringProperty(ep, prop, &unmanaged)
        guard status == noErr, let cf = unmanaged?.takeRetainedValue() else { return nil }
        return cf as String
    }

    private func endpoint(forId id: String, isSource: Bool) -> MIDIEndpointRef? {
        guard let target = Int32(id) else { return nil }
        let count = isSource ? MIDIGetNumberOfSources() : MIDIGetNumberOfDestinations()
        for i in 0 ..< count {
            let ep = isSource ? MIDIGetSource(i) : MIDIGetDestination(i)
            if uniqueId(ep) == target { return ep }
        }
        return nil
    }
}
