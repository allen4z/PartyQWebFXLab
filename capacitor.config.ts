import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor wraps the built Vite app (dist/) into a native iOS shell.
// The entire React UI + Tone.js audio run unchanged inside WKWebView; only the
// MIDI layer swaps to a native CoreMIDI plugin on device (see ios/App/App/PartyMidi*).
const config: CapacitorConfig = {
  appId: 'org.partykeys.fxlab',
  appName: 'PartyKeys FX Lab',
  webDir: 'dist',
  ios: {
    // Allow the WKWebView audio to start without extra gestures beyond our own gate.
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#0a0a14',
  },
  server: {
    // Use the bundled build (offline). For live-reload during dev you can set
    // `url` to your machine's LAN dev server, but bundled is the default.
    iosScheme: 'partykeys',
  },
}

export default config
