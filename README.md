# Read'Em
### AI-Enabled Reading Companion for Dyslexic Learners

[![Live Demo](https://img.shields.io/badge/live-read--em--215cc.web.app-brightgreen)](https://read-em-215cc.web.app/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)
[![Huawei Cloud](https://img.shields.io/badge/powered_by-Huawei_Cloud-red)](#huawei-cloud-integration)

> Built for **Tech4City 2026** — AI For Education track.
> Targeting dyslexic students and adults in Singapore who lose school-based support after Primary 4, and working adults who have never had any support at all.

---

## The Problem

Dyslexia affects roughly **10% of Singapore's population**. School-based remediation (SDR) ends after Primary 4 — yet students must continue reading dense worksheets, textbooks, and exam papers across every subject for the next decade. Working adults face the same struggle with workplace documents and emails, entirely alone.

Existing tools are fragmented: a TTS app here, a font extension there. None combine visibility, decoding, and comprehension into one cohesive, zero-setup experience.

---

## What Read'Em Does

Read'Em is a single, unified reading workspace. Upload any text — typed, PDF, or a photo of a worksheet — and it adapts the entire reading experience to the user's needs.

| Layer | What it does |
|---|---|
| **Visibility** | Dyslexia-optimised fonts (OpenDyslexic, Lexend), font/spacing sliders, colour overlays, reading ruler, line focus, bionic reading, morpheme colours, phonics overlays |
| **Decoding** | Click any word — syllables, phonetics, simple definition, analogy, mother-tongue translation (EN / Chinese / Malay / Tamil) |
| **Comprehension** | AI paragraph simplification that preserves subject-specific terminology while rewriting dense sentence structures |
| **Listening** | Multi-voice TTS with word-by-word highlight sync; ElevenLabs neural voices; Web Speech API fallback |
| **Input** | Typed text, PDF upload, image/photo OCR via Huawei Cloud Vision or OpenAI GPT-4o |
| **Teacher Visibility** | Dashboard showing class-wide struggled vocabulary, sentences requiring simplification, reading speed trends, and decode rates |
| **Fluency Assessment** | Read Aloud Check — student reads the passage aloud, Huawei SIS transcribes and scores word-level accuracy |

All features include a full **offline simulation mode**: the app is fully usable without any API keys, which is the realistic experience for most students in schools.

---

## Huawei Cloud Integration

Huawei Cloud is the primary AI backend for school deployments. All calls route through `server.js`, a Node.js proxy that handles HMAC-SHA256 signing — credentials never reach the browser.

| Service | Feature in Read'Em |
|---|---|
| **Huawei OCR** (General Text Recognition) | Worksheet photo to clean readable text |
| **Huawei NLP** (Text Summarization) | Paragraph simplification for dense academic text |
| **Huawei NLP** (Keyword Extraction) | Identifies complex vocabulary for pre-teaching before reading begins |
| **Huawei SIS** (Speech Intelligence Service) | Oral reading fluency scoring — captures student's read-aloud audio, transcribes, compares to source passage |
| **Huawei Machine Translation** | Word definitions in Chinese, Malay, Tamil — mother-tongue bridge for Singapore families |

When Huawei Cloud is configured, it takes priority over OpenAI for every feature. OpenAI GPT-4o serves as a fallback when running without a deployed proxy.

---

## Singapore Context

- Pre-loaded **PSLE curriculum passages** across Science, Maths, English, and Workplace documents
- **Mother-tongue bridge** supports reading at home with parents who may not read English confidently
- **Offline simulation mode** means the app works in classrooms without any API setup
- **Freemium model**: Free tier for individuals, Student Pro at $4.90/month, School License at $800/year with teacher dashboards and Huawei Cloud NLP

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + Vanilla JS (ES modules), single `index.html` |
| Fonts | Lexend, OpenDyslexic, Inter (CDN) |
| AI — school backend | Huawei Cloud OCR, NLP, SIS, Machine Translation (via `server.js` HMAC proxy) |
| AI — personal / fallback | OpenAI GPT-4o (word decode, paragraph simplify, OCR vision) |
| TTS | ElevenLabs neural voices; Web Speech API fallback |
| PDF | PDF.js 3.11 (CDN global) |
| Auth / Data | Mock localStorage auth; Firebase Auth + Firestore wired up but not yet active |
| Hosting | Firebase Hosting (`read-em-215cc`) |
| Proxy server | Plain Node.js `http` server, no framework |

---

## Access (Demo)

- **Student / Reader**: Sign up with any email and choose the Student role. Accounts persist in your browser's `localStorage` — no backend required.
- **Teacher Dashboard**: Sign up with any email and choose the Teacher role at registration to access classroom analytics.

---

## Local Setup

**Prerequisites:** Node.js v16+

```bash
git clone <repo-url>
cd read-em
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview the production build locally
node server.js       # Serve dist/ and Huawei proxy (run build first)
npx firebase deploy --only hosting   # Deploy to Firebase Hosting
```

### Environment Variables

Copy `.env.example` to `.env`. All variables are optional — the app falls back to offline simulation mode without them.

```env
# OpenAI — word decode, paragraph simplify, OCR vision (optional when Huawei is set)
VITE_OPENAI_API_KEY=sk-...

# ElevenLabs — neural TTS (optional, falls back to Web Speech API)
VITE_ELEVENLABS_API_KEY=...
VITE_ELEVENLABS_MODEL_ID=eleven_turbo_v2_5

# Huawei Cloud proxy — browser config pointing to your server.js instance
VITE_HUAWEI_ENDPOINT=http://localhost:3000
VITE_HUAWEI_API_KEY=readem-dev-key

# Huawei Cloud credentials — server-side only, never prefix with VITE_
HUAWEI_AK=your_access_key
HUAWEI_SK=your_secret_key
HUAWEI_PROJECT_ID=your_project_id
HUAWEI_REGION=ap-southeast-1
SERVER_API_KEY=readem-dev-key

# Firebase — placeholder for Phase 2 backend (see .env.example for full list)
VITE_FIREBASE_API_KEY=...
```

---

## License

MIT
