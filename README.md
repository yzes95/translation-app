# 🌍 LinguaFlow — Live Meeting Translator & Conversational Summary Producer

> **Empowering inclusive, multilingual collaboration across borders, cultures, and native languages.**

[![GitHub Pages](https://img.shields.io/badge/Hosted%20On-GitHub%20Pages-blue?logo=github)](https://yzes95.github.io/translation-app/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-emerald?logo=pwa)](https://yzes95.github.io/translation-app/)
[![Status](https://img.shields.io/badge/Status-Beta-orange)](#-project-status)

---

## 📌 Project Status

**Beta, actively developed.** The web app (PWA) is live on GitHub Pages and the translation backend runs on Render's free tier (`render.yaml`).

| Area | Status |
|---|---|
| Live speech → translation → read-aloud | ✅ Working (browser-dependent, see [Known Limitations](#-known-limitations)) |
| Meeting summary (decisions, action items, export) | ✅ Working |
| Lecture & audio notes (record or upload audio/video) | ✅ Working, needs the AI backend or a personal API key |
| Server-side AI translation (Smart mode) with provider fallback | ✅ Implemented (`server/`) |
| Stripe "tip jar" support page | ✅ Implemented (needs Stripe keys on the server) |
| Android `.apk` | ❌ **No APK release is published yet.** The install dialog mentions it, but there are no GitHub Releases. Use the PWA. |
| User accounts / paid plans | ❌ Not implemented (usage is limited per anonymous user) |
| Automated tests | ❌ None yet (only `oxlint`) |

---

## 💡 The Problem & The Mission

In global teams, medical missions, conferences and multinational businesses, live meetings held in one lingua franca often cause:

- **Cognitive exhaustion & misunderstandings**: non-native speakers translate in their heads and miss nuance.
- **Participation hesitation**: domain experts stay silent because they worry about fluency.
- **Unclear deliverables**: people leave with different ideas of what was agreed.

**LinguaFlow** is a meeting companion that listens, translates in real time into each participant's language (including full RTL layout for Arabic and Urdu), and can produce structured meeting minutes with an action-item checklist.

---

## 🌐 Languages

The language list is defined in [`src/constants/languages.js`](src/constants/languages.js). The core UI languages are:

| Language | Code | Direction |
|---|---|---|
| English | `en` | LTR |
| Arabic | `ar` | **RTL** |
| Urdu | `ur` | **RTL** |
| German | `de` | LTR |
| French | `fr` | LTR |
| Hindi | `hi` | LTR |
| Russian | `ru` | LTR |
| Ukrainian | `uk` | LTR |
| Turkish | `tr` | LTR |

The backend prompts also include Spanish, Nigerian Pidgin (`pcm`) and Yoruba (`yo`), plus dialect hints and speech normalizers for colloquial Arabic (Egyptian, Levantine, Gulf). Speech recognition and voice quality depend on the browser and operating system voices installed, so **not every language works equally well for speaking and listening**.

---

## ✨ Features

### 🎙️ 1. Live Meeting Translation
- Continuous speech recognition (Web Speech API) with automatic restart.
- Live sound-wave visualizer and a turn-based transcript feed with timestamps and speaker labels.
- Fast streaming "speculative" translation, refined by AI in the background in Smart and Unlimited modes.
- Read-aloud of translations (Web Speech Synthesis) with adjustable voice settings.
- Simulated-speech mode to demo a conversation without a real speaker.
- Live translation overlay and history drawer.

### 🧠 2. Three Translation Modes
| Mode | How it works |
|---|---|
| **Basic** | Free public translation endpoints directly from the browser (Google Translate web endpoint, MyMemory as backup). No sign-in. |
| **Smart** | Calls the LinguaFlow server, which uses a provider chain (**Gemini → Groq → Cloudflare Workers AI**). Limited to **30 minutes per day per user** (in-memory quota). |
| **Unlimited** | Uses your **own Gemini API key** stored in your browser (`localStorage`). See the in-app API key guide. |

### 📋 3. Conversational Summary Producer
- Executive overview, key discussion points, decisions, and an interactive action-items checklist.
- Uses Chrome's built-in AI summarizer when available, otherwise a **local rule-based extractor in the browser**.
- Export as Markdown, copy as text, or keep in the local archive.

### 🎓 4. Lecture & Audio Notes
- Record long audio or upload audio/video recordings.
- The server (or your own key) produces a transcript and summary in `lecture`, `meeting` or `verbatim` format.

### 💛 5. Support / Tips
- Optional Stripe Checkout "tip" flow handled by the server (`/api/tips/checkout` and a webhook).

---

## 🔒 Privacy: what stays on your device and what does not

> Earlier versions of this README claimed "100% front-end, nothing leaves your device". **That is not accurate for the current version.**

- **Stored locally**: meeting history and summaries are saved in your browser's IndexedDB (Dexie). Your personal API key is kept in `localStorage`.
- **Sent to third parties** (depending on mode):
  - **Basic mode**: the text being translated goes to Google's and/or MyMemory's public translation endpoints.
  - **Smart mode**: text (and audio for lecture notes) goes to the LinguaFlow server, which forwards it to Gemini, Groq or Cloudflare AI.
  - **Unlimited mode**: text goes directly from your browser to Google Gemini using your key.
  - **Speech recognition**: Chrome and Edge's Web Speech API typically sends audio to the browser vendor's speech service.
- There are no user accounts, and the app has no analytics of its own. A formal privacy policy has not been written yet.

---

## 📱 Installation

### Progressive Web App (PWA)
- **Android**: Chrome → ⋮ → *Install app* / *Add to Home screen*.
- **iPhone / iPad**: Safari → Share → *Add to Home Screen*.
- **Windows / macOS**: Chrome or Edge → install icon in the address bar.
- The app shell works offline, but **translation needs an internet connection** in every mode.

### Android APK
Not published yet. Watch the [Releases page](https://github.com/yzes95/translation-app/releases).

---

## 🏗️ Architecture & Tech Stack

```
Browser (React PWA)
 ├─ Web Speech API  ──► speech-to-text / text-to-speech
 ├─ Dexie (IndexedDB) ► local history & summaries
 ├─ Basic mode ─────► Google web translate / MyMemory
 ├─ Unlimited mode ─► Gemini API (user's own key)
 └─ Smart mode ─────► LinguaFlow server (Express on Render)
                        ├─ provider chain: Gemini → Groq → Cloudflare Workers AI
                        ├─ daily usage quota (in-memory)
                        └─ Stripe tips (checkout + webhook)
```

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide icons, `vite-plugin-pwa` (Workbox).
- **Backend** (`server/`): Node + Express, Stripe, multi-provider AI chain with cooldowns.
  - Endpoints: `GET /health`, `GET /api/usage`, `POST /api/translate`, `POST /api/translate-audio`, `POST /api/summary`, `POST /api/tips/checkout`, `POST /api/tips/webhook`.
- **Hosting**: GitHub Pages workflow (`.github/workflows/deploy.yml`) and a Render blueprint (`render.yaml`) for the static site and API.

---

## ⚠️ Known Limitations

- Web Speech API behavior differs across browsers (Chrome/Edge are best, Firefox has no support, iOS Safari is limited). Continuous recognition can stop silently on some devices.
- The free-tier backend can take time to "warm up" after sleeping, and free AI provider quotas can be rate-limited.
- The usage quota is stored **in server memory**, so it resets on every restart and is not tied to a real account.
- The server CORS policy is currently permissive (marked as temporary in `server.js`).
- No automated tests yet.

## 🗺️ Roadmap
- [ ] Publish a signed Android APK (or Play Store build) and update the install dialog.
- [ ] Write a privacy policy and show clearly in-app which mode sends data where.
- [ ] Persistent usage limits (accounts or a database).
- [ ] Tighten CORS and add rate limiting.
- [ ] Add tests for the translation chain and dialect normalizers.
- [ ] Pick a focused audience, e.g. NGOs and medical missions or specific language pairs (see the project's market notes).

---

## 🚀 Running Locally

```bash
git clone https://github.com/yzes95/translation-app.git
cd translation-app

# Frontend
npm install
npm run dev        # dev server
npm run build      # production build with PWA service worker

# Backend (optional, needed for Smart mode, lecture notes and tips)
cd server
cp .env.example .env   # add GEMINI_API_KEY, etc. (Groq / Cloudflare / Stripe keys are optional)
npm install
npm start
```

---

## 📄 License
MIT License. Built for inclusive global communication.
