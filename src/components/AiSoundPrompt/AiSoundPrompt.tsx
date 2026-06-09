import { useState } from 'react'
import { useStore } from '../../store'
import { getPreset } from '../../lib/presets/soundPresets'
import { getFxMode } from '../../lib/presets/fxPresets'
import { Card } from '../ui/Card'

const EXAMPLES = [
  'Dreamy synth piano in a huge glass hall',
  'Lo-fi tape keys, warm and dusty',
  'Stadium piano with massive reverb',
  'EDM bass with delay and filter modulation',
  'Cinematic choir, angelic and spacious',
  'Bright analog lead with gritty distortion',
]

export function AiSoundPrompt() {
  const applyPrompt = useStore((s) => s.applyPrompt)
  const lastResult = useStore((s) => s.lastPromptResult)
  const [text, setText] = useState('')

  const submit = (value?: string) => {
    const prompt = (value ?? text).trim()
    if (!prompt) return
    setText(prompt)
    applyPrompt(prompt)
  }

  const presetName = lastResult ? getPreset(lastResult.presetId).name : null
  const fxName = lastResult ? getFxMode(lastResult.fxModeId)?.name ?? 'Custom' : null

  return (
    <Card title="AI Sound Designer" icon="✲" accent="#8b5cf6">
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
            }}
            rows={3}
            placeholder="Describe a sound… e.g. “Make this sound like a dreamy synth piano in a huge glass hall”"
            className="w-full resize-none rounded-xl border border-white/10 bg-ink-700/70 p-3 text-sm text-white/90 outline-none transition placeholder:text-white/30 focus:border-brand-violet/60"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-white/30">
            ⌘/Ctrl + Enter
          </span>
        </div>

        <button type="button" onClick={() => submit()} className="btn-brand w-full">
          <span>✲</span> Design Sound
        </button>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => submit(ex)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55 transition hover:bg-white/10 hover:text-white/80"
            >
              {ex}
            </button>
          ))}
        </div>

        {lastResult && (
          <div className="rounded-xl border border-brand-violet/25 bg-brand-violet/5 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="chip border-brand-violet/40 text-brand-violet">
                ♬ {presetName}
              </span>
              <span className="chip border-brand-orange/40 text-brand-amber">∿ {fxName}</span>
            </div>
            <ul className="space-y-0.5 text-[11px] text-white/55">
              {lastResult.matched.map((m, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-brand-violet">›</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-white/35">
          Keyword matching runs fully offline — no external API. Maps your words to a preset
          plus DSP rack settings, then loads them into the engine instantly.
        </p>
      </div>
    </Card>
  )
}
