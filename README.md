# PartyKeys Web FX Lab

A premium, browser-based performance interface for the **PartyKeys** 36-key MIDI
keyboard. Press keys to trigger high-quality Tone.js instruments, run them through a
real-time DSP effects rack, see live visual feedback, and drive the keyboard's LEDs by
note / scale / chord / FX state.

> React + TypeScript · Web MIDI API · Web Audio + Tone.js · Tailwind CSS · **no backend, no paid APIs**

📘 完整架构 / 模块 / LED 协议 / 决策沉淀 → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173  (use Chrome desktop for Web MIDI)
npm run build    # type-check + production bundle into dist/
```

Click **Enable Audio** (browsers require a user gesture before audio), then **Connect
PartyKeys**. No hardware? Play with the mouse, touch, or the **A–L** computer keys.

## Features

- **Device Connection** — Web MIDI access (with SysEx), auto-detects PartyKeys, separate
  input/output selection, live connection status, safe fallbacks when MIDI is unavailable.
- **Performance Keyboard** — 36 visual keys (C3–B5), glowing on press, mouse/touch
  preview with glissando, animated particle bursts, live note / octave / velocity / chord
  readout, and scale-tone dots.
- **Sound Engine** — 12 presets (Dream Piano, Neon EP, Soft Pad, Analog Lead, Bass Pulse,
  Pluck Bell, Lo-fi Keys, Cyber Choir, Warm Organ, Future Marimba, Synth Brass, Space Arp)
  each with editable ADSR + master volume.
- **DSP FX Rack** — Reverb / Delay / Chorus / Filter / Distortion / Compressor with on-off
  toggles and rotary knobs, plus 8 one-tap modes (Clean, Space, Lo-fi, Stadium, Dream,
  EDM, Cinematic, Practice).
- **LED Light Control** — Note / Scale Guide / Chord Guide / FX Reactive / Trail modes,
  5 color palettes (Blue, Purple, Orange, Gradient, Rainbow), brightness, and a live
  on-screen LED strip preview.
- **AI Sound Designer** — type a prompt (“dreamy synth piano in a huge glass hall”) and the
  offline keyword engine maps it to a preset + FX configuration. No external API.

## Project structure

```
src/
  lib/
    midi/      MidiEngine.ts        Web MIDI wrapper (note routing, device list, output)
    audio/     AudioEngine.ts       Tone.js synth + DSP FX chain
    led/       sendLedMessage.ts    >>> PartyKeys LED protocol lives here <<<
               colors.ts            palette / gradient / rainbow helpers
    presets/   soundPresets.ts      12 instruments
               fxPresets.ts         8 FX modes + defaults
               aiKeywords.ts        offline prompt -> preset/FX mapper
    music.ts   note names, scales, chord detection (C3–B5 = MIDI 48–83)
    types.ts   shared TypeScript types
  store.ts     Zustand store wiring UI <-> engines
  components/  DevicePanel, Keyboard, SoundPanel, FxRack, LedPanel, AiSoundPrompt, ui/
```

## ⚡ Plugging in the real PartyKeys LED protocol

All LED output flows through **one file**: [`src/lib/led/sendLedMessage.ts`](src/lib/led/sendLedMessage.ts).

```ts
sendLedMessage(output, note, color, brightness, duration)
```

It ships with the documented PartyKeys SysEx protocols already implemented:

- `0x71` indexed 12-color (hardware-verified — the **default**)
- `0x15` per-key full RGB (newer)

Flip `LED_PROTOCOL` at the top of the file, or edit `buildLedSysEx()` to match the exact
firmware. Everything else in the app stays protocol-agnostic. Note the ~200 ms hardware LED
latency comment when syncing LEDs tightly to audio.

## Deploy (GitHub → Vercel)

Vite is auto-detected; leave **Root Directory** empty. `vercel.json` adds SPA rewrites.
```bash
git add . && git commit -m "PartyKeys Web FX Lab" && git push
```

## 部署信息

- 部署环境：生产 · 阿里云华东1（cn-hangzhou）
- 部署方案：纯静态 OSS + CDN（方案 A）
- 目标域名：https://fx.popumusic.cn （已验证 200，HTTPS 正常）
- OSS Bucket：`fx-popumusic-cn`（公共读，静态托管 index.html / 404.html）
- CDN 加速域名：`fx.popumusic.cn`，源站 `fx-popumusic-cn.oss-cn-hangzhou.aliyuncs.com`（oss，443）
- DNS：`fx.popumusic.cn` CNAME → `fx.popumusic.cn.w.kunlunaq.com`（阿里云 DNS）
- 证书：CAS `popumusic-c-popumusic-cn-2026`（CertId 26624284，`*.popumusic.cn`，有效期至 2027-02-20）
- 构建：`npm run build` → 上传 `dist/` 到 bucket 根目录
- 注意：部署到 PopuMusic MIDI Browser 前需将 `fx.popumusic.cn` 加入发布清单 Whitelist（cpfile.poputar.com/MidiBrowser/publish.json）
