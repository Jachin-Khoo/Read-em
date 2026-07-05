# Read'Em
### Breaking the Reading Barrier for Dyslexic Learners in Singapore

[![Live Demo](https://img.shields.io/badge/live-read--em--215cc.web.app-brightgreen)](https://read-em-215cc.web.app/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)
[![Huawei Cloud](https://img.shields.io/badge/powered_by-Huawei_Cloud-red)](#why-huawei-cloud)

> Built for **Tech4City 2026** — AI For Education track.

---

## The Problem

**10% of Singapore's population has dyslexia** — roughly 570,000 people.

Singapore's School Dyslexia Remediation (SDR) programme ends after **Primary 4**. From Primary 5 onward, students must independently navigate:
- Dense textbooks and exam papers across 6 subjects
- PSLE, O-Level, and A-Level examination materials
- Workplace documents as working adults — with no support at all

Private dyslexia tuition at the Dyslexia Association of Singapore costs **$80–$150/hour** — out of reach for most families. Digital tools are fragmented: a font extension here, a TTS app there. None address all three layers of reading difficulty in one workflow.

**Reading difficulty has three distinct layers:**
1. **Seeing** — text that is visually hard to distinguish and track
2. **Decoding** — words that cannot be sounded out or understood
3. **Comprehension** — sentences too complex to make sense of

No existing tool solves all three at once.

---

## Our Solution

Read'Em is a single, unified AI reading workspace. Upload any text — typed, PDF, or a photo of a worksheet — and it adapts the entire experience to the student's needs.

| Layer | What Read'Em does |
|---|---|
| **Visibility** | OpenDyslexic / Lexend fonts, font and spacing sliders, colour overlays, reading ruler, line focus, bionic reading, phonics overlays, morpheme colours |
| **Decoding** | Click any word → syllables, phonetics, plain definition, analogy, mother-tongue translation (Chinese / Malay / Tamil) |
| **Comprehension** | AI paragraph simplification that preserves subject-specific terminology while rewriting dense sentence structures |
| **Listening** | Word-by-word TTS with highlight sync across all four Singapore official languages |
| **Input** | Typed text, PDF upload, or photo of a worksheet (OCR) |
| **Teacher visibility** | Cross-device dashboard showing struggled vocabulary, simplification events, reading speed trends, and decode rates per student |
| **Fluency assessment** | Student reads aloud; Huawei SIS transcribes and scores word accuracy in real time |

---

## Why Read'Em, Not X?

| Feature | Read'Em | Microsoft Immersive Reader | Speechify | ChatGPT |
|---|---|---|---|---|
| Dyslexia-optimised UI (fonts, overlays, ruler) | Full | Partial | None | None |
| Word-level decoding with phonetics | Yes | Limited | None | None |
| AI paragraph simplification | Yes | None | None | Separate step |
| Mother-tongue bridge (SG 4 languages) | Yes | None | None | None |
| Worksheet photo OCR | Yes | None | None | Separate step |
| Cross-device teacher analytics | Yes | None | None | None |
| Oral fluency assessment | Yes | None | None | None |
| Zero-setup offline mode | Yes | Requires M365 | Requires account | Requires account |
| Singapore curriculum passages built-in | Yes | None | None | None |

---

## Business Model

### Who pays?

**Schools** are the primary customer. Dyslexic students rarely self-identify and seek tools — the intervention happens through educators. The teacher dashboard, cross-device sync, and oral fluency assessment exist specifically to serve that procurement decision.

| Tier | Price | What's included |
|---|---|---|
| Free | $0 | Core reading tools, offline mode, personal use |
| Student Pro | $4.90 / month | ElevenLabs neural voices, session history, parent progress reports |
| School License | $800 / year | Teacher dashboard, class-wide analytics, Huawei Cloud NLP, cross-device sync |

### Go-to-market: B2B2G via SLS integration

Direct school-by-school SaaS sales face MOE's centralised procurement process. The higher-leverage path is integration with the **Singapore Student Learning Space (SLS)** — MOE's mandated e-learning platform used by every student in every public school.

An API-based overlay or plugin approach means:
- No per-school procurement friction
- Immediate reach to the full student population
- MOE controls rollout; Read'Em provides the accessibility layer

**Roadmap:**

| Phase | Timeline | Goal |
|---|---|---|
| 1 — Pilot | 2026 | 3–5 schools via DAS partnership; collect longitudinal reading data |
| 2 — SLS proposal | 2027 | Submit integration proposal to MOE EdTech office |
| 3 — Nationwide | 2028 | SLS-embedded rollout across all public schools |
| 4 — Adult track | 2029 | SkillsFuture-aligned workplace literacy module |

---

## Why Huawei Cloud

Huawei Cloud is not just an API provider — it is what makes Read'Em viable at school scale in Singapore.

| Capability | Why it matters for schools |
|---|---|
| **Singapore-hosted infrastructure** | Meets PDPA and MOE data residency requirements; student data never leaves Singapore |
| **Enterprise SLA** | Guaranteed uptime for classroom use — a dropped API mid-lesson has real consequences |
| **Multilingual NLP** | Native Chinese, Malay, and Tamil language support — not bolted-on translations |
| **SIS ASR / TTS** | Neural oral fluency assessment and read-aloud in English and Mandarin |
| **OCR for worksheets** | Accurate text extraction from photographed exam papers under real classroom lighting |
| **Scalable pricing** | Per-call model scales from a single pilot classroom to nationwide deployment |

All Huawei Cloud calls are proxied through `server.js` with HMAC-SHA256 signing — credentials never reach the browser. When the proxy is live, Huawei takes priority over every other provider.

### Huawei services used

| Service | Feature in Read'Em |
|---|---|
| OCR — General Text Recognition | Worksheet photo → clean readable text |
| NLP — Text Summarization | Plain-English 1–2 sentence passage preview before reading begins |
| NLP — Keyword Extraction + NER | Domain-specific vocabulary pre-teaching |
| SIS ASR | Oral reading fluency scoring |
| SIS TTS | Neural read-aloud: English (Rose ♀, William ♂) · Mandarin (Huaxiaomei ♀, Huaxiaogang ♂) |
| Machine Translation | Word definitions in 中文, Melayu, தமிழ் — mother-tongue bridge |
| Auto subject detection | Classifies text into Science / Maths / History / Literature using NLP keywords |

### Multilingual TTS — Singapore's four official languages

| Language | Provider | Notes |
|---|---|---|
| English | Huawei SIS TTS → Web Speech API | Neural quality when proxy is live |
| 普通话 Mandarin | Huawei SIS TTS → Web Speech API | Huawei voices: Huaxiaomei (F), Huaxiaogang (M) |
| Melayu Malay | Device Web Speech API (ms-MY) | Huawei SIS does not support Malay TTS |
| தமிழ் Tamil | Device Web Speech API (ta-IN) | Huawei SIS does not support Tamil TTS |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + Vanilla JS (ES modules), single `index.html` |
| Fonts | OpenDyslexic, Lexend, Inter (CDN) |
| AI — school backend | Huawei Cloud OCR, NLP, SIS, Machine Translation (HMAC-SHA256 proxy via `server.js`) |
| AI — personal / fallback | OpenAI GPT-4o (word decode, paragraph simplify, image OCR) |
| TTS | Huawei SIS TTS · ElevenLabs · Web Speech API (fallback chain) |
| PDF | PDF.js 3.11 (CDN) |
| Auth | Firebase Authentication |
| Data | Cloud Firestore — cross-device student telemetry and teacher analytics |
| Hosting | Firebase Hosting (`read-em-215cc`) |
| Proxy server | Plain Node.js `http` server, no framework |

---

## Local Setup

**Prerequisites:** Node.js v16+

```bash
git clone <repo-url>
cd read-em
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # Production build → dist/
node server.js       # Serve dist/ + Huawei proxy (run build first)
npx firebase deploy --only hosting
```

### Environment Variables

Copy `.env.example` to `.env`:

```env
# OpenAI (optional fallback for word decode, simplify, OCR)
VITE_OPENAI_API_KEY=sk-...

# ElevenLabs (optional neural TTS — falls back to Web Speech API)
VITE_ELEVENLABS_API_KEY=...
VITE_ELEVENLABS_MODEL_ID=eleven_turbo_v2_5

# Huawei proxy — browser points to your server.js instance
VITE_HUAWEI_ENDPOINT=https://your-server.com
VITE_HUAWEI_API_KEY=your-shared-key

# Huawei credentials — server-side ONLY, never use VITE_ prefix
HUAWEI_AK=your_access_key
HUAWEI_SK=your_secret_key
HUAWEI_PROJECT_ID=your_project_id
HUAWEI_REGION=ap-southeast-1
SERVER_API_KEY=your-shared-key

# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Firestore Security Rules

Before going live, deploy these rules from the Firebase console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Access

- **Student view:** Sign up with any email, choose the Student role. Data syncs to Firestore — accessible from any device.
- **Teacher dashboard:** Sign up with any email, choose the Teacher role. The dashboard shows class-wide analytics across all registered students.

---

## License

MIT
