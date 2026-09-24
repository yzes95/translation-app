# 🌍 LinguaFlow — Live Meeting Translator & Conversational Summary Producer

> **Empowering inclusive, multilingual collaboration across borders, cultures, and native languages.**

[![GitHub Pages](https://img.shields.io/badge/Hosted%20On-GitHub%20Pages-blue?logo=github)](https://yzes95.github.io/translation-app/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-emerald?logo=pwa)](https://yzes95.github.io/translation-app/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20iOS-indigo)](#-installation-options-pwa-vs-apk)

---

## 💡 The Problem & The Mission

### The Challenge in Today's Global Teams
In today’s interconnected global economy, cross-functional teams, medical missions, international conferences, and multinational businesses bring together talented individuals from vastly different linguistic and cultural backgrounds. 

However, live meetings held in a single lingua franca (such as English) often introduce significant friction:
- **Cognitive Exhaustion & Misunderstandings**: Non-native speakers must mentally translate spoken dialogue in real-time, often missing critical nuances, technical terms, or fast-paced conversational shifts.
- **Participation Hesitation**: Valuable domain experts frequently remain silent or hesitant to contribute because they worry about their pronunciation or immediate fluency.
- **Unclear Deliverables**: When the meeting ends, participants frequently leave with ambiguous interpretations of what was agreed upon, leading to misaligned priorities and lost productivity.

### The Mission of LinguaFlow
**LinguaFlow was created to eliminate the linguistic divide.** It acts as an ambient, respectful meeting companion that:
1. **Listens continuously** to whatever language is being spoken in the room.
2. **Translates speech in real time** into each participant’s native language with proper typography and native script direction (including full **Right-to-Left (RTL)** for Arabic and Urdu).
3. **Automatically distills a Conversational Summary**: If enabled, the app produces structured meeting minutes—including an Executive Overview, Key Discussion Points, Consensus Decisions, and an **interactive Action Items Checklist** with assignees.

Every participant leaves the room with complete clarity, aligned priorities, and zero doubt about their action items.

---

## 🌐 Supported Languages

LinguaFlow offers bi-directional speech recognition and translation across 9 major world languages:

| Language | Native Script | Code | Script Direction | Live Speech (STT) | Live Voice (TTS) |
|---|---|---|---|---|---|
| **English** | English | `en` | Left-to-Right | ✅ | ✅ |
| **Arabic** | العربية | `ar` | **Right-to-Left (RTL)** | ✅ | ✅ |
| **Urdu** | اردو | `ur` | **Right-to-Left (RTL)** | ✅ | ✅ |
| **German** | Deutsch | `de` | Left-to-Right | ✅ | ✅ |
| **French** | Français | `fr` | Left-to-Right | ✅ | ✅ |
| **Hindi** | हिन्दी | `hi` | Left-to-Right | ✅ | ✅ |
| **Russian** | Русский | `ru` | Left-to-Right | ✅ | ✅ |
| **Ukrainian** | Українська | `uk` | Left-to-Right | ✅ | ✅ |
| **Turkish** | Türkçe | `tr` | Left-to-Right | ✅ | ✅ |

---

## ✨ Core Features

### 🎙️ 1. Live Meeting Audio Capture & Simultaneous Translation
- **Continuous Speech Recognition**: Handles extended meeting sessions with automatic reconnection.
- **Live Soundwave Visualizer**: Animated volume bars provide immediate visual feedback that your microphone is capturing clear room audio.
- **Turn-Taking Dialogue Feed**: Automatically organizes dialogue with timestamps, alternating speaker labels (`Speaker 1`, `Speaker 2`), original utterances, and translated text.
- **Simulate Speech Mode**: Test and demo realistic multi-turn meeting exchanges in any language pair with a single click, even without an active speaker in the room.
- **Audio Read-Aloud (TTS)**: Hear translations spoken aloud with native accents, adjustable voice pitch, and playback speeds.

### 📋 2. Conversational Summary Producer (Toggleable)
- **Executive Overview (TL;DR)**: Concise multi-sentence briefing summarizing the core focus of the session in your chosen language.
- **Key Discussion Points**: Grouped, high-signal highlights extracted from dialogue.
- **Decisions Made**: Distinct log of consensus points, approvals, and agreements reached.
- **Action Items Checklist**: Interactive checkboxes with assigned speakers and tasks.
- **One-Click Export**: Save meeting minutes as Markdown (`.md`), copy formatted text, or retain in your device's persistent archive.

### 🔒 3. 100% Front-End & Offline-First Privacy
- **Zero Backend**: All processing happens client-side in the user's browser.
- **No Cloud Transcripts**: Meeting audio and transcripts never leave your device to an external app backend.
- **Persistent Local Archive**: Past meetings and generated summaries are saved in your browser's private **IndexedDB** using Dexie.js.

---

## 📱 Installation Options: PWA vs. APK

LinguaFlow gives users on mobile and desktop full flexibility to choose how they run the app:

```
                          [ LinguaFlow Application ]
                                      |
         +----------------------------+----------------------------+
         |                                                         |
  [ Option A: PWA ]                                         [ Option B: APK ]
  • Instant 1-tap install                                   • Standalone Android package
  • Works on iOS, Android, Windows Desktop                  • Downloadable via GitHub Releases
  • 0 MB initial download                                   • Sideloadable on any Android phone
  • Auto-updates via Service Worker                         • Direct offline binary
```

### Option A: Progressive Web App (PWA) — *Recommended*
- **Android**: Open the web link in Chrome ➔ Tap `⋮` (menu) ➔ Select **"Install App"** or **"Add to Home screen"**.
- **iPhone / iPad (iOS)**: Open the web link in Safari ➔ Tap the **Share** button (box with upward arrow) ➔ Select **"Add to Home Screen"**.
- **Windows / macOS**: Open in Chrome or Edge ➔ Click the **Install** icon in the address bar to install as a standalone desktop program.
- *Once installed, the PWA works completely offline.*

### Option B: Android Standalone Package (.APK)
- For users who prefer a direct `.apk` installer without using a browser:
  1. Visit the [Releases Page](https://github.com/yzes95/translation-app/releases).
  2. Download the latest `LinguaFlow.apk`.
  3. Open the file on your Android device and allow "Install from Unknown Sources" if prompted.

---

## 🏗️ Architecture & Technology Stack

- **UI & Framework**: React 19, Vite, Tailwind CSS v4, Lucide Icons.
- **Offline PWA Engine**: `vite-plugin-pwa` with Workbox Service Worker caching.
- **Speech Technologies**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) with fallback simulation.
- **Local Storage**: IndexedDB via `dexie` for zero-leak local meeting logs.
- **Summarization**: Offline NLP conversational extractor generating bilingual structured meeting notes.

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/yzes95/translation-app.git

# Navigate into the project
cd translation-app

# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle with PWA Service Worker
npm run build
```

---

## 📄 License
MIT License. Built with ❤️ for inclusive global communication.
