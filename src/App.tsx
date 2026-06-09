import { useEffect } from 'react'
import { useStore } from './store'
import { DevicePanel } from './components/DevicePanel/DevicePanel'
import { Keyboard } from './components/Keyboard/Keyboard'
import { SoundPanel } from './components/SoundPanel/SoundPanel'
import { FxRack } from './components/FxRack/FxRack'
import { LedPanel } from './components/LedPanel/LedPanel'
import { AiSoundPrompt } from './components/AiSoundPrompt/AiSoundPrompt'

// QWERTY -> MIDI note (starting at C4 = 60) for keyboard-less demoing.
const KEY_MAP: Record<string, number> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67,
  y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ';': 76,
}

function Header() {
  const audioStarted = useStore((s) => s.audioStarted)
  const startAudio = useStore((s) => s.startAudio)

  return (
    <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-xl font-black text-white shadow-glow"
          aria-hidden
        >
          P
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            PartyKeys <span className="text-gradient">Web FX Lab</span>
          </h1>
          <p className="text-xs text-white/45">
            Performance · DSP · LED control center for PartyKeys
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="chip"
          style={{ color: audioStarted ? '#34d399' : '#fbbf24' }}
        >
          <span
            className={`h-2 w-2 rounded-full ${audioStarted ? '' : 'animate-pulse-glow'}`}
            style={{
              background: audioStarted ? '#34d399' : '#fbbf24',
              boxShadow: `0 0 8px ${audioStarted ? '#34d399' : '#fbbf24'}`,
            }}
          />
          {audioStarted ? 'Audio live' : 'Audio suspended'}
        </span>
        {!audioStarted && (
          <button type="button" onClick={startAudio} className="btn-brand">
            ▶ Enable Audio
          </button>
        )}
      </div>
    </header>
  )
}

/** Full-screen gate shown until the user enables audio (browser autoplay rule). */
function AudioGate() {
  const audioStarted = useStore((s) => s.audioStarted)
  const startAudio = useStore((s) => s.startAudio)
  if (audioStarted) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/70 p-6 backdrop-blur-md">
      <div className="glass-strong max-w-md p-8 text-center">
        <div
          className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-brand-gradient text-3xl font-black text-white shadow-glow animate-float"
          aria-hidden
        >
          P
        </div>
        <h2 className="mb-2 text-2xl font-extrabold">
          PartyKeys <span className="text-gradient">Web FX Lab</span>
        </h2>
        <p className="mb-6 text-sm text-white/55">
          A browser-based performance rig for your PartyKeys keyboard — high-quality synths,
          real-time DSP effects, and live LED control. Audio starts on your command.
        </p>
        <button type="button" onClick={startAudio} className="btn-brand mx-auto text-base">
          ▶ Enable Audio &amp; Enter
        </button>
        <p className="mt-4 text-[11px] text-white/35">
          Then click <span className="font-semibold text-white/60">Connect PartyKeys</span> to bind
          your hardware — or play with mouse / QWERTY keys right away.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const noteOn = useStore((s) => s.noteOn)
  const noteOff = useStore((s) => s.noteOff)
  const startAudio = useStore((s) => s.startAudio)

  // QWERTY fallback input — lets the app be demoed with no MIDI hardware.
  useEffect(() => {
    const pressed = new Set<string>()
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const note = KEY_MAP[e.key.toLowerCase()]
      if (note == null || pressed.has(e.key)) return
      pressed.add(e.key)
      void startAudio()
      noteOn(note, 0.8, 'pointer')
    }
    const up = (e: KeyboardEvent) => {
      const note = KEY_MAP[e.key.toLowerCase()]
      if (note == null) return
      pressed.delete(e.key)
      noteOff(note)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [noteOn, noteOff, startAudio])

  return (
    <>
      <AudioGate />
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <Header />

        {/* Keyboard takes the spotlight */}
        <div className="mb-5">
          <Keyboard />
        </div>

        {/* Control panels */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5">
            <DevicePanel />
            <AiSoundPrompt />
          </div>
          <div className="flex flex-col gap-5">
            <SoundPanel />
            <LedPanel />
          </div>
          <div className="flex flex-col gap-5">
            <FxRack />
          </div>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/30">
          <span>PartyKeys Web FX Lab · React · Tone.js · Web MIDI · no backend</span>
          <span className="font-mono">QWERTY: A–L = play · ⌘+Enter in AI box</span>
        </footer>
      </div>
    </>
  )
}
