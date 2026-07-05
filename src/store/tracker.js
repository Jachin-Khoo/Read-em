/* ==========================================================================
   Read'Em Passive Difficulty Tracker (src/store/tracker.js)

   Firestore schema:
   - wordLogs/{uid}_{word}_{subject}   — per-word interaction counters
   - sentenceLogs/{autoId}             — simplification events
   - speedLogs/{autoId}                — TTS speed selections
   - sessionSummaries/{sessionId}      — one doc per completed reading session
   - readingProgress/{autoId}          — WPM trend points (for sparkline)
   - comprehensionLogs/{autoId}        — comprehension check completions
   ========================================================================== */

import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where,
} from 'firebase/firestore';
import { db } from './firebase.js';

const ACTION_FIELD_MAP = {
  click:        'clicks',
  syllabify:    'syllabified',
  define:       'defined',
  audio_repeat: 'audioRepeated',
};

let currentUid = null;

export function setTrackerUser(uid) {
  currentUid = uid;
}

export const Tracker = {

  /* ─── Word interaction ─────────────────────────────────────────────────── */

  async logWordDifficulty(word, subject = 'General', actionType = 'click') {
    if (!currentUid) return;
    const clean = word.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
    if (!clean || clean.length < 2) return;
    const field = ACTION_FIELD_MAP[actionType];
    if (!field) return;

    const key = `${currentUid}_${clean}_${subject}`;
    const docRef = doc(db, 'wordLogs', key);
    const snap = await getDoc(docRef);
    const entry = snap.exists()
      ? snap.data()
      : { key, uid: currentUid, word: clean, subject, clicks: 0, syllabified: 0, defined: 0, audioRepeated: 0 };

    entry[field] = (entry[field] || 0) + 1;
    entry.lastUpdated = new Date().toISOString();
    await setDoc(docRef, entry);
  },

  /* ─── Sentence simplification ─────────────────────────────────────────── */

  async logSentenceSimplification(original, simplified, subject = 'General') {
    if (!currentUid || !original || !simplified) return;
    await addDoc(collection(db, 'sentenceLogs'), {
      uid: currentUid,
      original: original.trim(),
      simplified: simplified.trim(),
      subject,
      timestamp: new Date().toISOString(),
    });
  },

  /* ─── TTS speed selection ──────────────────────────────────────────────── */

  async logReadingSpeed(rate) {
    if (!currentUid) return;
    await addDoc(collection(db, 'speedLogs'), {
      uid: currentUid,
      rate: parseFloat(rate),
      timestamp: new Date().toISOString(),
    });
  },

  /* ─── Session summary (one per completed reading session) ─────────────── */

  async logSessionSummary({ sessionId, subject, passagePreview, wordsRead, wordsDecoded, durationMs, simplifications, readingSpeedWpm, comprehensionCompleted }) {
    if (!currentUid) return;
    const id = sessionId || `session-${Date.now()}`;
    const decodeRate = wordsRead > 0 ? wordsDecoded / wordsRead : 0;

    const summary = {
      uid: currentUid,
      sessionId: id,
      subject: subject || 'General',
      passagePreview: (passagePreview || '').slice(0, 80),
      wordsRead:    wordsRead    || 0,
      wordsDecoded: wordsDecoded || 0,
      decodeRate:   parseFloat(decodeRate.toFixed(3)),
      durationMs:   durationMs  || 0,
      simplifications: simplifications || 0,
      readingSpeedWpm: readingSpeedWpm || 0,
      comprehensionCompleted: !!comprehensionCompleted,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'sessionSummaries', id), summary);

    if (readingSpeedWpm > 0) {
      await addDoc(collection(db, 'readingProgress'), {
        uid: currentUid,
        sessionId: id,
        timestamp: new Date().toISOString(),
        wpm: readingSpeedWpm,
        decodeRate: parseFloat(decodeRate.toFixed(3)),
        subject: subject || 'General',
      });
    }
  },

  /* ─── Comprehension check completion ──────────────────────────────────── */

  async logComprehensionCompleted(sessionId, subject, questionsAnswered, totalQuestions) {
    if (!currentUid) return;
    await addDoc(collection(db, 'comprehensionLogs'), {
      uid: currentUid,
      sessionId,
      subject,
      questionsAnswered,
      totalQuestions,
      completionRate: totalQuestions > 0 ? questionsAnswered / totalQuestions : 0,
      timestamp: new Date().toISOString(),
    });

    // Back-patch the matching session summary
    const summaryRef = doc(db, 'sessionSummaries', sessionId);
    const snap = await getDoc(summaryRef);
    if (snap.exists() && snap.data().uid === currentUid) {
      await updateDoc(summaryRef, { comprehensionCompleted: questionsAnswered > 0 });
    }
  },

  /* ─── Read queries ─────────────────────────────────────────────────────── */

  async getWordDigest() {
    const snap = await getDocs(collection(db, 'wordLogs'));
    return snap.docs
      .map((d) => {
        const entry = d.data();
        const w = (entry.clicks || 0) + (entry.syllabified || 0) * 2 + (entry.defined || 0) * 3 + (entry.audioRepeated || 0) * 2;
        const difficulty = w >= 6 ? 'high' : w >= 3 ? 'medium' : 'low';
        const actions = [];
        if (entry.clicks > 0)        actions.push(`Clicked (${entry.clicks})`);
        if (entry.syllabified > 0)   actions.push(`Syllables (${entry.syllabified})`);
        if (entry.defined > 0)       actions.push(`Defined (${entry.defined})`);
        if (entry.audioRepeated > 0) actions.push(`Replayed (${entry.audioRepeated})`);
        return { word: entry.word, subject: entry.subject, uid: entry.uid, actionsTriggered: actions.join(', '), difficulty, weight: w };
      })
      .sort((a, b) => b.weight - a.weight);
  },

  async getSentenceDigest() {
    const snap = await getDocs(collection(db, 'sentenceLogs'));
    const sorted = snap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const seen = new Set();
    return sorted.filter((e) => { if (seen.has(e.original)) return false; seen.add(e.original); return true; });
  },

  async getStats() {
    const [wordSnap, sentenceSnap, speedSnap, summarySnap] = await Promise.all([
      getDocs(collection(db, 'wordLogs')),
      getDocs(collection(db, 'sentenceLogs')),
      getDocs(collection(db, 'speedLogs')),
      getDocs(collection(db, 'sessionSummaries')),
    ]);

    const speedLogs  = speedSnap.docs.map((d) => d.data());
    const summaries  = summarySnap.docs.map((d) => d.data());

    let avgSpeed = 1.0;
    if (speedLogs.length > 0) {
      avgSpeed = (speedLogs.reduce((a, e) => a + (e.rate || 0), 0) / speedLogs.length).toFixed(1);
    }

    let avgDecodeRate = 0;
    if (summaries.length > 0) {
      avgDecodeRate = Math.round((summaries.reduce((a, s) => a + (s.decodeRate || 0), 0) / summaries.length) * 100);
    }

    return {
      totalStruggledWords:  wordSnap.size,
      totalSimplifications: sentenceSnap.size,
      totalSessions:        summaries.length,
      avgSpeed:      `${avgSpeed}x`,
      avgDecodeRate: `${avgDecodeRate}%`,
    };
  },

  async getStudentList() {
    const [summarySnap, wordSnap] = await Promise.all([
      getDocs(collection(db, 'sessionSummaries')),
      getDocs(collection(db, 'wordLogs')),
    ]);
    const summaries = summarySnap.docs.map((d) => d.data());
    const wordLogs  = wordSnap.docs.map((d) => d.data());
    const uids = [...new Set([...summaries.map((s) => s.uid), ...wordLogs.map((w) => w.uid)])];

    return uids.map((uid) => {
      const userSessions = summaries.filter((s) => s.uid === uid).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return {
        uid,
        sessionCount: userSessions.length,
        lastActive:   userSessions[0]?.timestamp || null,
        avgWpm: userSessions.length > 0
          ? Math.round(userSessions.reduce((a, s) => a + (s.readingSpeedWpm || 0), 0) / userSessions.length)
          : 0,
      };
    });
  },

  async getStudentProgress(uid) {
    const snap = await getDocs(query(collection(db, 'readingProgress'), where('uid', '==', uid)));
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-10);
  },

  async clearLogs() {
    const cols = ['wordLogs', 'sentenceLogs', 'speedLogs', 'sessionSummaries', 'readingProgress', 'comprehensionLogs'];
    await Promise.all(
      cols.map(async (col) => {
        const snap = await getDocs(collection(db, col));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      })
    );
  },

  async exportDigestReport() {
    const [stats, words, sentences, students] = await Promise.all([
      this.getStats(), this.getWordDigest(), this.getSentenceDigest(), this.getStudentList(),
    ]);

    let text = `==================================================\n`;
    text += `READ'EM WEEKLY LITERACY DIGEST REPORT\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `==================================================\n\n`;

    text += `SUMMARY METRICS:\n`;
    text += `- Total Reading Sessions: ${stats.totalSessions}\n`;
    text += `- Unique Struggled Words: ${stats.totalStruggledWords}\n`;
    text += `- Sentences Simplified: ${stats.totalSimplifications}\n`;
    text += `- Avg. TTS Speed: ${stats.avgSpeed}\n`;
    text += `- Avg. Decode Rate: ${stats.avgDecodeRate}\n\n`;

    text += `STUDENTS (${students.length}):\n`;
    students.forEach((s, i) => {
      text += `  ${i + 1}. ${s.uid} — ${s.sessionCount} sessions, avg ${s.avgWpm} WPM\n`;
    });
    text += `\n`;

    text += `MOST CHALLENGING VOCABULARY:\n`;
    if (words.length === 0) {
      text += `  No vocabulary struggles logged yet.\n`;
    } else {
      words.slice(0, 20).forEach((w, i) => {
        text += `  ${i + 1}. [${w.difficulty.toUpperCase()}] "${w.word}" (${w.subject}) — ${w.actionsTriggered}\n`;
      });
    }
    text += `\n`;

    text += `SENTENCES SIMPLIFIED:\n`;
    if (sentences.length === 0) {
      text += `  No simplifications logged yet.\n`;
    } else {
      sentences.forEach((s, i) => {
        text += `  ${i + 1}. [${s.subject}] "${s.original}" → "${s.simplified}"\n`;
      });
    }
    text += `\n==================================================\n`;
    return text;
  },
};
