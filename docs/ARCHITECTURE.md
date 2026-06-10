# PartyKeys Web FX Lab — 架构与沉淀文档

> 最后更新: 2026-06-10 · 维护者: Bohan (PartyKeys / 视感科技)
> 配套快速上手见根目录 [`README.md`](../README.md);本文是**完整技术沉淀**(架构、模块、协议、决策、扩展指南)。

---

## 0. 一句话

浏览器里的 **PartyKeys 演奏台**:连上键盘 → 按键触发 Tone.js 高质量音色 + 实时 DSP 效果 + 画面反馈 + 回送 LED 灯光。纯前端、无后端、无付费 API。Chrome 桌面端优先。

| | |
|---|---|
| 线上 | https://fxlab.partykeys.ai (备用别名 fxlab-beryl.vercel.app) |
| 仓库 | https://github.com/PartyBohan/PartyQWebFXLab (`main` 推送即自动部署) |
| Vercel 项目 | `fxlab` (team `bohans-projects-c16e1e8e`,Root Directory 留空) |
| 本地 | `~/Downloads/PartyQWebFXLab/` |

> 命名史:产品最初叫 **PartyQ Web FX Lab**,2026-06 全量改名为 **PartyKeys**(UI 文案、代码标识符 `isPartyQ→isPartyKeys` / `PARTYQ_*→PARTYKEYS_*`、logo 字 `Q→P`)。**本地文件夹与 GitHub 仓库名仍是 `PartyQWebFXLab`**(未改,改名涉及重链接,风险大)。

---

## 1. 技术栈

- **React 18 + TypeScript**(严格模式,Vite 5 构建)
- **Web MIDI API** — MIDI 输入/输出 + SysEx(LED)
- **Web Audio + Tone.js 15** — 合成器与 DSP
- **Zustand 4** — 全局状态(UI ↔ 引擎桥接)
- **Tailwind CSS 3** — 暗色玻璃拟态 UI,品牌色蓝/紫/橙
- 零后端、零付费 API。音频必须用户手势后启动(浏览器自动播放策略)。

---

## 2. 目录结构与模块职责

```
src/
  lib/
    midi/   MidiEngine.ts      Web MIDI 封装:设备列表、note 路由、输出句柄
    audio/  AudioEngine.ts     Tone.js 合成器 + DSP 效果链(命令式单例)
    led/    sendLedMessage.ts  ★ LED 输出唯一出口(协议都在这,要改硬件改这里)
            colors.ts          调色板 / 渐变 / 彩虹 + 亮度缩放(纯函数)
    presets/
            soundPresets.ts    12 个乐器预设
            fxPresets.ts        默认 FX + 8 个 FX 模式
            aiKeywords.ts       离线 prompt → 预设/FX 关键词映射
    music.ts                   音名、音阶、和弦识别(C3–B5 = MIDI 48–83)
    types.ts                   全部共享 TS 类型
  store.ts                     Zustand store:状态 + 动作,编排三大引擎
  components/
    DevicePanel/   设备连接面板
    Keyboard/      演奏键盘 + Particles 粒子层
    SoundPanel/    音色引擎面板(预设 + ADSR + 主音量)
    FxRack/        DSP 效果架(6 效果 + 8 模式)
    LedPanel/      LED 控制面板(模式/颜色/亮度/音阶 + 实时预览条)
    AiSoundPrompt/ AI 音色设计师(文本框 + 示例)
    ui/            Card / Knob / Toggle / Segmented / Logo 复用组件
  App.tsx                      布局 + 音频启动门 + QWERTY 兜底输入
  main.tsx / index.css         入口 + Tailwind + 自定义工具类
public/assets/brand/           品牌资源(logo-mark.png 等,见该目录 README)
```

**三个命令式单例**(不在 React 里,通过 store 调用):
`midiEngine`(MidiEngine.ts)、`audioEngine`(AudioEngine.ts)、以及 LED 的纯函数模块。它们有副作用、与 React 渲染解耦,store 是它们与 UI 之间的唯一桥。

---

## 3. 核心数据流

```
          ┌─────────────┐   note on/off    ┌──────────────┐
 硬件 MIDI │ MidiEngine  │ ───────────────▶ │              │
  键盘     └─────────────┘                  │              │
                                            │   store.ts   │
 鼠标/触摸  Keyboard 组件 ── noteOn/Off ───▶ │  (Zustand)   │
                                            │              │
 电脑键盘   App QWERTY  ── noteOn/Off ─────▶ │              │
                                            └──────┬───────┘
                                                   │ 一次 noteOn 扇出到 ↓↓↓
                    ┌──────────────────────────────┼───────────────────────────┐
                    ▼                              ▼                            ▼
            audioEngine.triggerAttack      set({activeNotes,             sendLedMessage()
            (Tone.js 出声)                  lastNote, chord})             → MIDI 输出点灯
                                            (UI 高亮/粒子/读数)
```

- **入口三选一**:硬件 MIDI、屏幕键盘鼠标/触摸、电脑 QWERTY(`A–L`)。三者最终都调 `store.noteOn(note, velocity, source)`。
- `noteOn` 内一次性扇出:**出声**(audioEngine)+ **更新状态**(activeNotes/lastNote/和弦识别)+ **点灯**(按当前 LED 模式)。
- UI 组件用 `useStore(selector)` 订阅各自需要的切片,自动重渲。

---

## 4. 六大面板

| # | 面板 | 关键能力 |
|---|------|---------|
| 1 | **DevicePanel** 设备连接 | `Connect PartyKeys` 按钮 → `requestMIDIAccess({sysex:true})`;分别选输入/输出;自动识别名字含 PartyKeys/PartyQ 的设备(★ 标记并自动选中);状态:idle/requesting/ready/denied/unsupported;不支持时降级提示用 Chrome |
| 2 | **Keyboard** 演奏键盘 | 36 键 C3–B5,白/黑键精确布局;按下发光(颜色取自 LED 调色);鼠标拖拽滑奏;Canvas 粒子爆发;读数:音名/八度/力度/和弦/按住数;音阶音标记圆点 |
| 3 | **SoundPanel** 音色引擎 | 12 预设网格;ADSR 四旋钮(attack/decay/sustain/release,log 映射);主音量旋钮 |
| 4 | **FxRack** 效果架 | 6 效果(Reverb/Delay/Chorus/Filter/Distortion/Compressor)各带开关 + 参数旋钮;8 个一键模式;手动改参数后模式标记为 Custom |
| 5 | **LedPanel** 灯光控制 | 5 模式 + 5 调色 + 亮度 + 音阶选择器;**36 格实时预览条**(无硬件也能看灯效);底部说明指向 `sendLedMessage` |
| 6 | **AiSoundPrompt** AI 音色师 | 文本框输入自然语言 → 离线关键词映射到 预设+FX;6 个示例 chip;⌘/Ctrl+Enter 提交;显示命中的规则 |

---

## 5. 声音引擎(`AudioEngine.ts`)

**效果链顺序**(固定,常连;"关闭"= 中性参数,避免重连爆音):

```
PolySynth → Distortion → Chorus → Filter → Compressor → Delay → Reverb → Limiter → 输出
```

- 每个预设 `kind` 决定 Tone 声部类:`fm`→FMSynth · `am`→AMSynth · `poly`/`mono`→Synth(都包在 PolySynth 里,maxPolyphony 24)。
- `fatsawtooth/fatsine/fatsquare` 用 `spread` + `count:3` 做加宽。
- 换预设 = dispose 旧 synth → 新建 → 接回 `preGain`;改 ADSR 用 `synth.set({envelope})` **不重建**(便宜)。
- 旁路实现:reverb/delay/chorus/distortion 用 `wet→0`;filter 关闭=cutoff 拉到 20kHz、Q→0;compressor 关闭=ratio→1。

### 12 个预设

| id | 名称 | kind | 振荡器 | 性格 |
|----|------|------|--------|------|
| `dream-piano` | Dream Piano | fm | triangle | 柔和闪烁钢琴(默认) |
| `neon-ep` | Neon EP | fm | sine | 有冲击的电钢 |
| `soft-pad` | Soft Pad | poly | fatsawtooth | 慢起氛围 pad |
| `analog-lead` | Analog Lead | poly | fatsawtooth | 明亮失谐主音 |
| `bass-pulse` | Bass Pulse | mono | square | 圆润方波贝斯 |
| `pluck-bell` | Pluck Bell | fm | sine | 玻璃质 FM 铃 |
| `lofi-keys` | Lo-fi Keys | am | triangle | 微失谐复古键 |
| `cyber-choir` | Cyber Choir | poly | fatsine | 合成人声合唱 |
| `warm-organ` | Warm Organ | poly | fatsquare | 拉杆风琴 |
| `future-marimba` | Future Marimba | fm | sine | 木质打击马林巴 |
| `synth-brass` | Synth Brass | poly | fatsawtooth | 厚铜管 stab |
| `space-arp` | Space Arp | poly | square | 适合延迟/琶音的亮拨弦 |

---

## 6. DSP FX Rack

**6 个效果及参数**(对应 Tone 节点):

| 效果 | 参数 | Tone 映射 |
|------|------|-----------|
| Reverb | wet / decay / roomSize | `Tone.Reverb`(roomSize→preDelay) |
| Delay | wet / time / feedback | `Tone.FeedbackDelay` |
| Chorus | wet / depth / rate | `Tone.Chorus` |
| Filter | cutoff / resonance | `Tone.Filter`(lowpass, Q) |
| Distortion | drive / wet | `Tone.Distortion` |
| Compressor | threshold / ratio | `Tone.Compressor` |

**8 个一键模式**:`clean` · `space` · `lofi` · `stadium` · `dream` · `edm` · `cinematic` · `practice`。
默认 FX(`DEFAULT_FX`):reverb 开 25% wet + compressor 开,其余关。

---

## 7. ★ LED 协议(最重要的沉淀)

**所有点灯只走一个出口**:[`src/lib/led/sendLedMessage.ts`](../src/lib/led/sendLedMessage.ts) 的
```ts
sendLedMessage(output, note, color, brightness, duration?, keyIndex?)
```
其余代码全部协议无关。**换真硬件协议只改 `buildLedSysEx()` 一个函数。**

### 两套并存协议(都需 `requestMIDIAccess({sysex:true})`)

厂商头统一:`F0 05 30 7F 7F 20 00`,结束 `F7`。

**① CMD 0x71 — 索引 12 色(硬件验证过,当前默认)**
```
点灯:  ...71 <数量> [音符 颜色]...  F7     (用真实 MIDI 音符 48–83)
全关:  ...71 00 F7
关单键: ...71 01 <音符> 00 F7
初始化: F0 05 30 7F 7F 20 00 0F 05 F7      (每次重连发一次)
```
12 色板见文件内 `PALETTE_12`;任意 RGB 会用欧氏距离量化到最近的板色(`nearestPaletteId`)。

**② CMD 0x15 — 每键全 RGB(protocol.partykeys.org 新主命令)**
```
初始化: F0 05 30 7F 7F 20 00 0F 01 F7
RGB:    ...15 <组数> <Rhi Rlo Ghi Glo Bhi Blo keyCount key0..> F7
        (8-bit→7-bit 对: hi=floor(v/128), lo=v%128;key 索引 0–35)
```

### 当前选择与切换
- 常量 `LED_PROTOCOL: '0x71' | '0x15'` = **`'0x71'`**(默认保证一定能亮)。
- 真琴确认固件支持 0x15 后,把常量改成 `'0x15'` 即可获得全 RGB 渐变(`buildLedSysEx`/`buildLedInit` 已都写好两套分支)。

### 两个关键事实
- **键索引 ↔ 音符**:`midi_note = key_index + 48`(key0=C3=48 最左,key35=B5=83 最右)。`sendLedMessage` 默认 `keyIndex = note - 48`。
- **LED 延迟 ≈ 200ms**:别提前发 SysEx。要和音频严格同步时,在节拍点发灯,然后把音频+视觉**一起延后同一个常量**(见文件顶部注释)。
- 避免用 legacy note-on 点灯(`0x90 note 0x40`):固件会回弹 note-on,像玩家自己按了键。0x71/0x15 不回弹。

### 5 种 LED 模式(在 store 里实现)
| 模式 | 行为 |
|------|------|
| `note` Note Light | 点亮按下的键 |
| `scale` Scale Guide | 常亮所选音阶音(根音更亮),按下临时加亮 |
| `chord` Chord Guide | 点亮当前按住的全部和弦音 |
| `reactive` FX Reactive | 亮度跟随 reverb/delay 湿度 |
| `trail` Performance Trail | 按下留拖尾,`duration` 后自动熄灭 |

---

## 8. AI 音色设计师(`aiKeywords.ts`)

纯离线两遍匹配:
1. **第一遍**:命中第一条"预设规则"的关键词 → 定乐器 + 基础 FX 模式。
2. **第二遍**:叠加所有命中的"修饰规则"(`tweak` 微调 FX,如 `+reverb`、`+distortion`、`+warm`)。

示例:`dreamy`→Soft Pad+Dream · `lofi`→Lo-fi Keys+低通+轻失真 · `stadium`→Dream Piano+大混响+压缩 · `edm`→Bass Pulse+延迟+谐振滤波。无命中 → 保持 Dream Piano + Clean。

> 升级真模型:把 `interpretPrompt` 换成调用 serverless 代理(密钥放服务端),返回相同 `PromptResult` 结构即可,UI 不用动。

---

## 9. 状态管理(`store.ts`)

单个 Zustand store,持有 UI 状态 + 动作,内部闭包里有 LED 渲染辅助函数(`renderScaleLeds` / `renderChordLeds` / `ledNoteOn` / `ledNoteOff`)。

主要动作:`startAudio` `connectMidi` `selectInput/Output` `setPreset` `setAdsr` `setFxMode` `setFxParam` `toggleFx` `setLedMode/Color/Brightness` `toggleLed` `setScale` `noteOn` `noteOff` `applyPrompt` `syncMidiState`。

组件用细粒度 selector 订阅(如 `useStore(s => s.fx)`),避免无关重渲。

---

## 10. 关键决策 & 踩过的坑

1. **Vercel 区分大小写**:`public/` 里静态资源文件名必须和代码引用**精确同大小写**。logo 一开始叫 `Logo.png`,macOS 不区分能跑、Vercel(Linux)会 404 → 已强制小写 `logo-mark.png`。新增资源务必小写 kebab-case。
2. **验证线上资源别只看 200**:`vercel.json` 的 SPA rewrite 会把任意路径回退成 `index.html`(也返回 200)。验证静态文件要看 **content-type**(如 `image/png`),否则会被假 200 骗。
3. **音频门**:浏览器要求用户手势后才能起音频 → 全屏 `AudioGate` + `Tone.start()`,启动后才建合成器。
4. **效果常连、中性旁路**:不在切换时重连节点,避免咔哒声。
5. **粒子订阅 `lastNote` 引用**:每次 noteOn 都 `set` 新对象,保证连按同一键也触发粒子。
6. **logo 组件兜底**:`Logo.tsx` 读 `/assets/brand/logo-mark.png`,`onError` 回退渐变"P",所以缺图也不白屏。
7. **MIDI 不可用降级**:Safari/Firefox 无 Web MIDI → 状态 `unsupported`,引导用 Chrome,但屏幕键盘/QWERTY 仍可玩。

---

## 11. 如何扩展(给未来的自己)

- **加一个音色** → 在 `soundPresets.ts` 数组加一项(`id/name/kind/oscillator/envelope/...`);UI 自动出现。
- **加一个 FX 模式** → 在 `fxPresets.ts` 的 `FX_MODES` 加一项(给全 6 效果的完整 `fx`)。
- **接真 LED 协议** → 只改 `sendLedMessage.ts` 的 `LED_PROTOCOL` 常量或 `buildLedSysEx()`;别的不用动。
- **加 AI 关键词** → 在 `aiKeywords.ts` 的 `RULES` 加规则(预设规则或纯修饰规则)。
- **加音阶** → `music.ts` 的音阶表 + `LedPanel.tsx` 的 `SCALE_OPTS`。
- **换 logo** → 把 `logo-mark.png`(或改 `Logo.tsx` 里的 `LOGO_SRC`)丢进 `public/assets/brand/`,命名规则见该目录 README。透明背景版直接替换即可。

---

## 12. 本地开发 & 部署

```bash
cd ~/Downloads/PartyQWebFXLab
npm install
npm run dev      # http://localhost:5173  (Web MIDI 用 Chrome 桌面)
npm run build    # tsc 类型检查 + 生产打包到 dist/

# 部署:推 main 即触发 Vercel 自动部署到 fxlab.partykeys.ai
git add . && git commit -m "..." && git push
```

Vercel 坑位提醒:Root Directory 留空;CLI 命令前缀 `NODE_EXTRA_CA_CERTS=~/.macos-roots.pem`(证书库不全)。

---

## 13. 已知限制 / TODO

- LED 默认走 0x71 索引 12 色;**真琴到手验证固件后**可升级 0x15 全 RGB。
- AI 音色师是离线关键词,非真模型(可按 §8 升级)。
- 未做音色采样(纯合成);未做 MIDI 录制/回放;未做预设保存到本地。
- bundle ~458KB(gzip ~128KB),主要是 Tone.js;如需可做按需加载。
- 本地文件夹/仓库名仍 `PartyQWebFXLab`,与产品名 PartyKeys 不一致(改名见 §0 风险说明)。
