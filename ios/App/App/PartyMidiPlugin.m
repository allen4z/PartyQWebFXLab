#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift PartyMidiPlugin with Capacitor's bridge and exposes its
// methods to JavaScript under the plugin name "PartyMidi".
CAP_PLUGIN(PartyMidiPlugin, "PartyMidi",
    CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getDevices, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(selectInput, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(selectOutput, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(send, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(presentBlePairing, CAPPluginReturnPromise);
)
