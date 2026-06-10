# PartyKeys FX Lab — iOS App (Capacitor + CoreMIDI)

> 把同一套 React 应用打包成原生 iOS app,通过**蓝牙 MIDI** 连接 PartyKeys、**控制 LED 灯光**。
> 网页版不受影响,仍部署在 fxlab.partykeys.ai。

---

## 0. 为什么需要原生壳(关键背景)

iOS 的 Safari / WKWebView **完全不支持 Web MIDI API**。所以浏览器方案在 iPhone 上**无法**与键盘通信。
解决办法:用 **Capacitor** 把现有 React 构建包进一个原生 iOS 壳(WKWebView),再写一个
**Swift CoreMIDI 插件**做真正的 MIDI 收发(蓝牙/USB 都走 CoreMIDI)。

- UI、Tone.js 音频:**原样运行在 WKWebView 里**,不用改。
- MIDI 层:在原生端用 CoreMIDI;JS 端透明切换(见下"双后端")。
- LED:`sendLedMessage` 的 SysEx 字节通过原生插件发出,协议逻辑零改动。

---

## 1. 架构:双 MIDI 后端

```
store.ts / led          ──▶  midiEngine (facade, lib/midi/MidiEngine.ts)
                                   │  按平台选后端
                 ┌─────────────────┴───────────────────┐
                 ▼                                       ▼
   WebMidiBackend (浏览器/桌面 Chrome)       NativeMidiBackend (iOS/原生)
   navigator.requestMIDIAccess                Capacitor 插件 "PartyMidi"
   MIDIOutput.send()                          → ios/App/App/PartyMidiPlugin.swift
                                                  (CoreMIDI + 蓝牙配对)
```

- 选择逻辑:`Capacitor.isNativePlatform()` 为真 → `NativeMidiBackend`,否则 `WebMidiBackend`。
- 两个后端实现同一个 `MidiBackend` 接口(`lib/midi/MidiBackend.ts`):
  `connect / selectInput / selectOutput / send(bytes) / hasOutput / presentBlePairing`。
- LED 模块只调 `midiEngine.send(bytes)`,完全不知道底层是 Web 还是原生。

### 原生插件做的事(`PartyMidiPlugin.swift`)
| JS 调用 | 原生行为 |
|---------|---------|
| `initialize()` | 建 CoreMIDI client + 输入/输出端口,监听设备变化 |
| `getDevices()` | 枚举所有 CoreMIDI source/destination(蓝牙或 USB) |
| `selectInput/Output(id)` | 连接对应端点(用 `kMIDIPropertyUniqueID` 作 id) |
| `send({data})` | 把字节(含 SysEx)`MIDISend` 给所选输出 → **点灯** |
| `presentBlePairing()` | 弹出系统蓝牙 MIDI 配对面板 `CABTMIDICentralViewController` |
| 事件 `noteOn/noteOff` | 解析 CoreMIDI 包,回传给 JS |

UI 里在原生环境会多出一个 **"Pair via Bluetooth"** 按钮(设备连接面板)。

---

## 2. 在 iPhone 上跑起来(个人使用)

> 前提:已装 Xcode、一根线或同一 Apple ID。**蓝牙必须用真机**(模拟器没有蓝牙)。

```bash
cd ~/Downloads/PartyQWebFXLab
npm run build            # 1) 构建网页资源到 dist/
npx cap sync ios         # 2) 同步进 iOS 工程 + pod install
npx cap open ios         # 3) 打开 Xcode
```

在 Xcode 里:
1. 选中 **App** target → **Signing & Capabilities**。
2. **Team** 选你的个人 Apple ID(免费即可,自动管理签名)。Bundle id 已是 `org.partykeys.fxlab`,如冲突就改成 `org.partykeys.fxlab.<你的名字>`。
3. iPhone 用数据线连上(或无线调试),顶部选你的真机。
4. 点 ▶️ Run。首次会让你在 iPhone **设置 → 通用 → VPN与设备管理** 里信任你的开发者证书。
5. App 启动后:点 **Enable Audio** → 点 **Pair via Bluetooth** → 在系统面板里选中 PartyKeys → 开始弹奏,灯光随之亮起。

> 免费 Apple ID 签名的 app 有效期 7 天,过期重新 Run 即可。要长期/分发需 99 美元/年的 Apple Developer 账号(本次按"仅自己用"配置,无需)。

### 命令行直接跑模拟器(仅测 UI,无蓝牙)
```bash
xcrun simctl boot "iPhone 17 Pro"
npx cap run ios            # 选模拟器；可看 UI、屏幕键盘,但连不了硬件
```

---

## 3. 日常开发循环

改了 React 代码后:
```bash
npm run build && npx cap sync ios     # 再在 Xcode Run
```
只改原生 Swift 时,直接在 Xcode Run 即可。

热重载(可选):把 `capacitor.config.ts` 的 `server.url` 指向你电脑局域网的 `vite` dev server,
即可在真机上实时刷新;默认用打包好的离线资源。

---

## 4. 硬件前提与排查

- **PartyKeys 必须支持蓝牙 MIDI (BLE MIDI)** 才能无线连。若你的型号是 USB-only,
  可用 USB-C 转接直连——CoreMIDI 会把 USB 设备和蓝牙设备一视同仁地列出,插件无需改动。
- 连上但没声音:确认点了 **Enable Audio**(WKWebView 要用户手势);静音开关已通过
  `AVAudioSession(.playback)` 绕过(见 `AppDelegate.swift`)。
- 连上但灯不亮:确认输出端口选的是 PartyKeys;LED 协议默认 `0x71` 索引 12 色
  (见 `lib/led/sendLedMessage.ts`),真琴确认固件后可切 `0x15` 全 RGB。
- 设备没出现在列表:点 **Pair via Bluetooth** 重新配对;蓝牙权限在系统弹窗里允许。

---

## 5. 关键文件清单

| 文件 | 作用 |
|------|------|
| `capacitor.config.ts` | Capacitor 配置(appId `org.partykeys.fxlab`, webDir `dist`) |
| `src/lib/midi/MidiBackend.ts` | 后端接口 |
| `src/lib/midi/WebMidiBackend.ts` | Web MIDI 实现(浏览器) |
| `src/lib/midi/NativeMidiBackend.ts` | 原生实现(调 Capacitor 插件) |
| `src/lib/midi/partyMidiPlugin.ts` | 插件 JS 接口 `registerPlugin('PartyMidi')` |
| `src/lib/midi/MidiEngine.ts` | facade,按平台选后端 |
| `ios/App/App/PartyMidiPlugin.swift` | ★ 原生 CoreMIDI + 蓝牙插件 |
| `ios/App/App/PartyMidiPlugin.m` | Capacitor 插件注册(暴露给 JS) |
| `ios/App/App/AppDelegate.swift` | 启动时配置音频会话(playback) |
| `ios/App/App/Info.plist` | 蓝牙用途说明(NSBluetooth*UsageDescription) |

> 注:`ios/` 已纳入 git(`Pods/`、生成的 `public/`、`capacitor.config.json` 由 `ios/.gitignore` 忽略,需 `cap sync` 重新生成)。
