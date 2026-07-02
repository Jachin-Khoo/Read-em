# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

**Read'Em** — an AI-assisted reading companion for dyslexic students and adults, built for the **Tech4City 2026 hackathon (AI For Education track)**. Live at https://read-em-215cc.web.app/.

### Who this is for
Dyslexic individuals of **all ages** — from primary school students to working adults — who need to independently access and understand dense text (worksheets, textbooks, exam papers, workplace documents). School-based support (SDR) in Singapore ends after Primary 4; Read'Em is designed to fill that gap at every life stage.

### What it does, layer by layer
- **Visibility** — bionic typography, dyslexia-optimised fonts (OpenDyslexic, Lexend), spacing/size sliders, colour overlays, reading ruler, line focus, phonics overlays, morpheme colours
- **Decoding** — click any word → syllables, phonetics, child-friendly definition, analogy, mother-tongue translation (Chinese / Malay / Tamil via Huawei MT)
- **Comprehension** — AI paragraph simplification that strips complex sentence structures while preserving subject terminology
- **Listening** — multi-voice TTS with word-by-word highlight sync; ElevenLabs neural voices; Web Speech API fallback
- **Input** — typed text, PDF, or photo of worksheet (OCR via Huawei Cloud Vision or OpenAI GPT-4o)
- **Teacher visibility** — dashboard showing struggled words, simplified sentences, and reading speeds
- **Fluency assessment** — Read Aloud Check: student reads aloud, Huawei SIS transcribes and scores word accuracy

### Design principle
**Every decision should reduce cognitive load.** Users are people for whom reading is already effortful — don't add to that effort through the UI itself.

---

## Tech stack

- **Vite + vanilla JS (ES modules)** — no frontend framework. `index.html` holds all views; `src/main.js` toggles visibility between them.
- **pdfjs-dist** — the npm package is a dependency but dormant; the active PDF.js instance comes from a CDN `<script>` tag (`cdnjs.cloudflare.com/pdf.js/3.11.174/pdf.min.js`) exposed as `window.pdfjsLib`.
- **Huawei Cloud** — the primary AI backend for school deployments. `server.js` implements full HMAC-SHA256 signing and proxies five Huawei Cloud services: OCR, NLP simplification, NLP keyword extraction, SIS speech-to-text, and Machine Translation. Credentials (AK/SK) live only on the server; the browser only sends a shared `SERVER_API_KEY`. See "Architecture — server.js" below.
- **OpenAI (GPT-4o)** — fallback for word decoding, paragraph simplification, and image OCR when Huawei is not configured. Called directly from the browser via `fetch`.
- **ElevenLabs** — neural TTS called directly from the browser; falls back to Web Speech API.
- **Firebase** (`firebase` package) — initialized in `src/store/firebase.js` (Auth + Firestore) but not currently used anywhere else. Placeholder for Phase 2 backend.
- **server.js** — a plain Node `http` server (no Express) that serves `dist/` and handles all Huawei Cloud proxy routes.

---

## Folder structure

```
.
├── index.html            # single-page markup for all views (landing, reader, teacher)
├── style.css             # single global stylesheet, no CSS framework
├── server.js             # Node http server: serves dist/ + Huawei Cloud proxy routes
├── firebase.json         # Firebase Hosting config (public: dist/, SPA rewrite to index.html)
├── .firebaserc           # Firebase project id: read-em-215cc
├── .env.example          # template for all env vars (OpenAI, ElevenLabs, Huawei, Firebase)
├── package.json
├── assets/
│   └── readem_logo.png
└── src/
    ├── main.js                    # orchestrator: appState, DOM lookups, view switching, event wiring
    ├── services/                  # modules that call APIs or process files
    │   ├── ai-service.js          # AIService: OpenAI + Huawei proxy calls, offline mocks
    │   ├── tts.js                 # TTS: Web Speech + ElevenLabs playback, word-highlight sync
    │   └── pdf-handler.js         # PDF/text extraction via global pdfjsLib
    └── store/                     # modules that store state and persist data
        ├── auth.js                # mock auth (localStorage-backed, not Firebase Auth)
        ├── tracker.js             # reading telemetry (localStorage-backed, not Firestore)
        └── firebase.js            # Firebase Auth/Firestore init (currently unused elsewhere)
```

`src/` is split into `services/` for external integrations and processors, and `store/` for state and persistence. `main.js` stays at the root of `src/` as the orchestrator. Don't add further nesting unless the project genuinely outgrows this structure.

---

## Feature status

Everything currently in the codebase is considered **done for MVP / demo-ready** — bionic typography controls, word decoder, paragraph simplifier, OCR image transcription, dual-mode TTS with highlight sync, PDF canvas toggle, teacher dashboard, fluency assessment (Huawei SIS), mother-tongue bridge (Huawei MT), vocabulary pre-teaching modal, comprehension check modal, word glossary, onboarding wizard, session history, and quick presets.

There's no separate backlog of half-built features; treat anything not yet in the code as net-new work.

---

## Off-limits / locked-in decisions

None specified. Nothing in the current architecture should be assumed off-limits — raise proposed changes rather than assuming they're settled.

---

## Commands

```bash
npm run dev              # Vite dev server (binds to 0.0.0.0 — accessible on LAN)
npm run build            # Production build -> dist/
npm run preview          # Preview the production build
node server.js           # Serve dist/ via plain http server + Huawei proxy (run build first)
npx firebase deploy --only hosting   # Deploy to Firebase Hosting (project: read-em-215cc)
```

There is no lint, typecheck, or test script in `package.json`, and no test suite in the repo.

---

## Architecture

### `src/main.js` (~950 lines)
The orchestrator. Owns `appState`, a single `doc` object of `getElementById` lookups for all DOM elements, view-switching logic (landing portal / reader workspace / teacher workspace), event wiring, phonics overlay rendering, and hardcoded demo curriculum passages (`DEMO_MATERIALS`).

### `src/services/ai-service.js` (~675 lines)
Exports the `AIService` singleton. Methods: `simplifyParagraph`, `decodeWord`, `getOpenAIAnalogy`, `transcribeImage` (OCR), `extractVocabWords`, `generateComprehensionQuestions`, `transcribeAudio` (Huawei SIS), `extractHardWords` (NER→keywords→heuristic), `translateWord` (Huawei MT), `synthesizeSpeech` (Huawei TTS), `detectSubject` (NLP keywords + signal table).

**Call priority for every feature:**
1. Huawei Cloud proxy (when `VITE_HUAWEI_ENDPOINT` + `VITE_HUAWEI_API_KEY` are set)
2. OpenAI (when `VITE_OPENAI_API_KEY` is set)
3. Offline simulation mode (MOCK_WORDS, MOCK_SENTENCES, MOCK_PARAGRAPHS, MOCK_COMPREHENSION, MOCK_OFFLINE_ANALOGIES, `fallbackWordSplit` heuristic)

The offline fallback is **the default real-world experience** for most users who won't have API keys. Treat it as a first-class path. Never remove or degrade it.

**Huawei-only features** (no OpenAI fallback, only offline mode):
- `transcribeAudio` — Huawei SIS ASR oral reading assessment
- `synthesizeSpeech` — Huawei SIS TTS (returns `null` when Huawei not configured; TTS falls back to Web Speech)
- `translateWord` — Huawei MT mother-tongue bridge (returns `null` when Huawei not configured)
- `detectSubject` — subject classification using Huawei NLP keywords; falls back to built-in signal table

**`main.js` functions that call AI:**
- `generatePassageSummary(text)` — calls `AIService.simplifyParagraph` on the first 1200 chars to get a 1-2 sentence plain English preview; shown at the top of the vocab pre-teaching modal before reading begins
- `colorParagraphsByDifficulty()` — client-side only, no API; assigns `para-diff-easy/medium/hard` CSS classes to each `.reader-para` based on word length ratio and average sentence length; runs after `loadTextIntoReader`
- `renderTeacherInsights(stats, words, sentences)` — template-based natural language summary generated from telemetry data; no API call; populates the "AI Teaching Insights" card on the teacher dashboard

### `server.js`
A plain Node `http` server with two responsibilities:
1. **Static serving** — serves `dist/` with SPA fallback to `index.html`
2. **Huawei Cloud proxy** — seven routes under `/api/huawei/`:
   - `POST /api/huawei/ocr` — General Text Recognition (worksheet photos)
   - `POST /api/huawei/nlp/simplify` — NLP text summarization (paragraph simplification)
   - `POST /api/huawei/asr` — SIS short-audio ASR (oral reading fluency)
   - `POST /api/huawei/nlp/keywords` — NLP keyword extraction (vocabulary pre-teaching fallback)
   - `POST /api/huawei/nlp/translate` — Machine Translation EN→zh/ms/ta
   - `POST /api/huawei/tts` — SIS Text-to-Speech → base64 MP3 (English + Mandarin neural voices)
   - `POST /api/huawei/nlp/ner` — Named Entity Recognition for domain term detection

All proxy routes require the `X-API-Key` header matching `SERVER_API_KEY`. Huawei requests are signed with HMAC-SHA256 using AK/SK from environment variables — credentials never leave the server.

### `src/services/tts.js`
Exports the `TTS` singleton. Voice engine priority: **Huawei SIS TTS** → **ElevenLabs** → **Browser Web Speech API**.

**Multilingual TTS — Singapore's four official languages:**
| Language | Engine | Notes |
|---|---|---|
| English | Huawei SIS TTS (Rose ♀, William ♂) → Web Speech | Neural quality when proxy is live |
| 普通话 Mandarin | Huawei SIS TTS (Huaxiaomei ♀, Huaxiaogang ♂) → Web Speech | Neural quality when proxy is live |
| Melayu Malay | Device Web Speech API (`ms-MY`) only | Huawei SIS does not support Malay TTS |
| தமிழ் Tamil | Device Web Speech API (`ta-IN`) only | Huawei SIS does not support Tamil TTS |

`getAvailableVoices()` filters Web Speech voices for language codes `en`, `zh`, `ms`, `ta` so all four appear in the voice selector. ElevenLabs word-highlight sync is **time-based approximation** (audio progress mapped linearly to character positions), not real boundary events.

### `src/store/auth.js`
**Mock auth, not Firebase Auth.** Signing in with an unregistered email auto-creates an account (any password accepted on first use); returning users must match their stored password. Role (`student`/`teacher`) is chosen at sign-up. Accounts and sessions persist in `localStorage` (`readem_mock_users`, `readem_current_user`).

### `src/store/tracker.js`
Reading-difficulty telemetry (word clicks, simplifications, reading speed). Despite the header comment mentioning Firestore, the implementation is entirely `localStorage`-backed. The teacher dashboard reads all logs regardless of `currentUid` — every student who has used the same browser contributes to the same view. This is intentional for the single-device demo.

### `src/store/firebase.js`
Initializes Firebase App/Auth/Firestore from `VITE_FIREBASE_*` env vars, but nothing else in `src/` imports it. Placeholder for a future real backend.

### `src/services/tts.js` (~450 lines)
Exports the `TTS` singleton: `parseText`, browser Web Speech playback (`speak`), ElevenLabs playback (`speakElevenLabs`), word-highlight sync loop, `pause`/`resume`/`stop`, single-word click-to-hear. ElevenLabs word-highlight sync is **time-based approximation** (audio progress mapped linearly to character positions), not real boundary events. It is a heuristic.

### `src/services/pdf-handler.js`
`extractTextFromPDF` (via CDN-loaded `pdfjsLib`), `readTextFile`, `cleanExtractedText` (de-hyphenation/whitespace cleanup).

### `index.html` / `style.css`
Single-page markup and a single global stylesheet; no component system or scoped CSS.

---

## API key handling

- Keys come from `.env` (`VITE_OPENAI_API_KEY`, `VITE_ELEVENLABS_API_KEY`, `VITE_ELEVENLABS_MODEL_ID`, `VITE_HUAWEI_ENDPOINT`, `VITE_HUAWEI_API_KEY`) or from the user at runtime via `AIService.saveKeys` / `AIService.saveHuaweiConfig`, saved to `localStorage`.
- **localStorage takes priority over env vars** (see `AIService.getKeys`).
- All OpenAI/ElevenLabs calls are made directly from the browser with the key in the request header — there is no backend proxy for these. Keys are client-exposed by design; this is a demo pattern, not production-safe. Flag this if asked to productionize.
- Huawei credentials (AK/SK) **only** live in server-side env vars and are never sent to the browser.

---

## Known gaps / things to double-check before relying on them

- **Huawei proxy server must be deployed for Huawei features to work.** `server.js` is fully implemented and ready; it just needs to run on a server (e.g. Huawei ECS) with `HUAWEI_AK`, `HUAWEI_SK`, `HUAWEI_PROJECT_ID` set. Without a deployed instance, all Huawei features silently fall back to OpenAI or offline mode.
- **Firebase is configured but dormant.** Auth and Firestore are initialized in `src/store/firebase.js` but unused; all data lives only in `localStorage` and will not sync across devices or survive a cleared cache.
- **Teacher dashboard shows all-device data**, not per-student, because tracker logs are keyed to localStorage not to a user account. This is intentional for single-device demo but must be addressed before multi-student classroom use.
- **No LICENSE file** in the repo despite MIT claim in README.
- No automated tests, lint, or CI.

---

## Conventions

### Code
- Feature modules export a single capitalized singleton (`Auth`, `AIService`, `TTS`, `Tracker`) with methods attached — not ES classes.
- File headers use a `/* === Title (path) === */` comment block. Some files still say "Sup' Read With Me" in the header — harmless legacy naming, not a bug.
- DOM access is centralized through the single `doc` lookup object in `main.js` rather than scattered `querySelector` calls — follow this pattern when adding new UI hooks.

### UI and copy — dyslexia-first rules
- **Icon + label always.** Never use icons alone for controls — dyslexic users rely on the text label to confirm meaning. The only exceptions are universally unambiguous icons (play, pause, stop, close).
- **Plain, short language everywhere.** Button labels, error messages, placeholder text — all must use the shortest, simplest words possible. Users may be children or adults for whom reading is effortful. Avoid jargon, passive voice, and multi-clause sentences in any user-facing string.
- **Never remove the offline fallback paths** in `ai-service.js`. Simulation mode is the real experience for most users.
- The existing `alert()` and `confirm()` calls in `main.js` are acceptable for MVP. If replacing them, keep the replacement language equally plain.
