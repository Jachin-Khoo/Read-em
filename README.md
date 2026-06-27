# Read'Em 📖✨
### Integrated AI Dyslexia Reading Companion

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#)
[![Host Platform](https://img.shields.io/badge/hosted--on-Zo_Computer-purple.svg)](#)

---

## 🇸🇬 The Context: Why We Built Read'Em

Dyslexia affects approximately **10% of Singapore's population**, making it the most common learning difference in the country. Yet, support remains heavily gatekept—restricted to formal diagnoses, institutional programs, and early school-based interventions that individuals either age out of or never access. 

### Gaps in Current Systems
* **Early Expiry of Support:** For students, programs like the *School-based Dyslexia Remediation (SDR)* only cover Primary 3 and Primary 4. Access arrangements (extra time, reader assistance) are limited to national exams. Beyond this, students are expected to independently decode dense worksheets, textbooks, and exam papers across all subjects.
* **Adult & Lifelong Challenges:** Dyslexia does not vanish with age. Many working professionals and lifelong learners struggle with workplace documentation, emails, and literature, often hiding their difficulties due to lack of diagnostic access or societal stigma.
* **Fragmented Tools:** Existing solutions (general TTS apps, font extensions, generic speed readers) are highly fragmented, require costly multiple subscriptions, and are built as generic accessibility aids rather than cohesive dyslexia companions. None actually simplify or decode content to aid cognitive comprehension.

> **Problem Statement:** How might we empower dyslexic individuals to independently access and understand any text—across subjects, contexts, and stages of life—through an experience that is fully adaptable to their unique needs?

---

## 🛠 What We Created

**Read'Em** is a comprehensive reading dashboard that bridges the gap between text visibility and actual cognitive comprehension. It is fully responsive, customizable, and runs both online (integrated with advanced AI APIs) and offline (simulation mode).

### Key Features
1. **Unified Entrance Portal:**
   * **Reader Interface:** A clean workspace tailored for kids and adults to read documents without administrative distraction.
   * **Teacher Dashboard:** Protected dashboard (using PIN `teacher123`) to track classroom reading logs, review struggled vocabulary, and download literacy digest telemetry.
2. **Dynamic Bionic Typography Control:**
   * **Adaptable Spacing:** Real-time sliders for Font Size, Line Height, Letter Spacing, and Word Spacing.
   * **Dyslexia-Optimized Fonts:** Support for **OpenDyslexic** (sourced via CDNfonts) and **Lexend** (designed specifically for readability).
   * **Visual Helpers:** Adjustable reading rulers and visual syllable chunking.
3. **Multi-Modal Text-to-Speech (TTS):**
   * Powered by **ElevenLabs** neural voices for natural, non-robotic reading support.
   * Features synchronized word-by-word highlighting and single-word click audio streams.
4. **Interactive AI Companion:**
   * **Word Decoder:** Provides child-friendly definitions and relatable analogies for complex words.
   * **Exa Semantic Search:** Dynamically queries search layers to fetch real-world context and clickable educational citations.
   * **Paragraph Simplifier:** Converts dense academic/technical text into plain language instantly (e.g., translating photosynthesis terminology).
5. **Original PDF Document Layout Toggle:**
   * Retain graphs, figures, and page structures by rendering raw PDF pages onto interactive `<canvas>` elements, or switch back to reflowed bionic reading text on the fly.

---

## 📡 Sponsors & Technology Integrations

Read'Em utilizes cutting-edge web tools, hosting engines, and AI APIs:

* **Zo Computer:** Sponsoring the hosting infrastructure. Read'Em includes a zero-dependency `server.js` node static server to run on personal cloud networks like Zo Computer.
* **OpenAI (GPT-4o):** Powers OCR vision text transcription for paper worksheets, and live intelligent paragraph simplifications.
* **ElevenLabs:** Powers high-fidelity natural speech synthesis and model selection.
* **Exa API:** Powers semantic web search, analogies, and educational citation indexing.

---

## 🚀 Installation & Setup Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v16.0.0 or higher recommended)
* [npm](https://www.npmjs.com/) (usually bundles with Node)

### Local Setup
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/readem.git
   cd readem
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open the printed URL (typically `http://localhost:5173`) in your browser.

### Hosting on Zo Computer (Static Production Build)
1. **Compile the production assets:**
   ```bash
   npm run build
   ```
   This generates all compiled pages and media in the `/dist` folder.
2. **Launch the zero-dependency hosting server:**
   ```bash
   node server.js
   ```
   The application will host the production files locally, serving as a self-contained node server ideal for private clouds.

---

## 🛡 License
This project is licensed under the MIT License - see the LICENSE file for details.
