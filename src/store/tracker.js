/* ==========================================================================
   Read'Em Passive Difficulty Tracker (src/store/tracker.js)

   Schema (all localStorage):
   - readem_mock_wordLogs        [{key, uid, word, subject, clicks, syllabified, defined, audioRepeated, lastUpdated}]
   - readem_mock_sentenceLogs    [{uid, original, simplified, subject, timestamp}]
   - readem_mock_speedLogs       [{uid, rate, timestamp}]
   - readem_session_summaries    [{uid, sessionId, subject, passagePreview, wordsRead, wordsDecoded,
                                    decodeRate, durationMs, readingSpeedWpm, simplifications,
                                    comprehensionCompleted, timestamp}]
   - readem_reading_progress     [{uid, sessionId, timestamp, wpm, decodeRate, subject}]
   - readem_comprehension_logs   [{uid, sessionId, subject, questionsAnswered, totalQuestions,
                                    completionRate, timestamp}]
   ========================================================================== */

const COLLECTIONS = {
  WORD_LOGS:          'readem_mock_wordLogs',
  SENTENCE_LOGS:      'readem_mock_sentenceLogs',
  SPEED_LOGS:         'readem_mock_speedLogs',
  SESSION_SUMMARIES:  'readem_session_summaries',
  READING_PROGRESS:   'readem_reading_progress',
  COMPREHENSION_LOGS: 'readem_comprehension_logs',
};

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

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch (e) { return []; }
};

const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export const Tracker = {

  /* ─── Word interaction ─────────────────────────────────────────────────── */

  async logWordDifficulty(word, subject = 'General', actionType = 'click') {
    if (!currentUid) return;
    const clean = word.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
    if (!clean || clean.length < 2) return;
    const field = ACTION_FIELD_MAP[actionType];
    if (!field) return;

    const logs = load(COLLECTIONS.WORD_LOGS);
    const key = `${currentUid}_${clean}_${subject}`;
    let entry = logs.find(l => l.key === key);
    if (!entry) {
      entry = { key, uid: currentUid, word: clean, subject, clicks: 0, syllabified: 0, defined: 0, audioRepeated: 0 };
      logs.push(entry);
    }
    entry[field] = (entry[field] || 0) + 1;
    entry.lastUpdated = new Date().toISOString();
    save(COLLECTIONS.WORD_LOGS, logs);
  },

  /* ─── Sentence simplification ─────────────────────────────────────────── */

  async logSentenceSimplification(original, simplified, subject = 'General') {
    if (!currentUid || !original || !simplified) return;
    const logs = load(COLLECTIONS.SENTENCE_LOGS);
    logs.push({ uid: currentUid, original: original.trim(), simplified: simplified.trim(), subject, timestamp: new Date().toISOString() });
    save(COLLECTIONS.SENTENCE_LOGS, logs);
  },

  /* ─── TTS speed selection ──────────────────────────────────────────────── */

  async logReadingSpeed(rate) {
    if (!currentUid) return;
    const logs = load(COLLECTIONS.SPEED_LOGS);
    logs.push({ uid: currentUid, rate: parseFloat(rate), timestamp: new Date().toISOString() });
    save(COLLECTIONS.SPEED_LOGS, logs);
  },

  /* ─── Session summary (one per completed reading session) ─────────────── */

  async logSessionSummary({ sessionId, subject, passagePreview, wordsRead, wordsDecoded, durationMs, simplifications, readingSpeedWpm, comprehensionCompleted }) {
    if (!currentUid) return;
    const id = sessionId || `session-${Date.now()}`;
    const decodeRate = wordsRead > 0 ? wordsDecoded / wordsRead : 0;

    const summaries = load(COLLECTIONS.SESSION_SUMMARIES);
    summaries.push({
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
    });
    save(COLLECTIONS.SESSION_SUMMARIES, summaries);

    // Append to reading progress trend if WPM is available
    if (readingSpeedWpm > 0) {
      const progress = load(COLLECTIONS.READING_PROGRESS);
      progress.push({
        uid: currentUid,
        sessionId: id,
        timestamp: new Date().toISOString(),
        wpm: readingSpeedWpm,
        decodeRate: parseFloat(decodeRate.toFixed(3)),
        subject: subject || 'General',
      });
      save(COLLECTIONS.READING_PROGRESS, progress);
    }
  },

  /* ─── Comprehension check completion ──────────────────────────────────── */

  async logComprehensionCompleted(sessionId, subject, questionsAnswered, totalQuestions) {
    if (!currentUid) return;
    const logs = load(COLLECTIONS.COMPREHENSION_LOGS);
    logs.push({
      uid: currentUid,
      sessionId,
      subject,
      questionsAnswered,
      totalQuestions,
      completionRate: totalQuestions > 0 ? questionsAnswered / totalQuestions : 0,
      timestamp: new Date().toISOString(),
    });
    save(COLLECTIONS.COMPREHENSION_LOGS, logs);

    // Back-patch the matching session summary
    const summaries = load(COLLECTIONS.SESSION_SUMMARIES);
    const match = summaries.find(s => s.sessionId === sessionId && s.uid === currentUid);
    if (match) {
      match.comprehensionCompleted = questionsAnswered > 0;
      save(COLLECTIONS.SESSION_SUMMARIES, summaries);
    }
  },

  /* ─── Read queries ─────────────────────────────────────────────────────── */

  async getWordDigest() {
    return load(COLLECTIONS.WORD_LOGS)
      .map(entry => {
        const w = (entry.clicks || 0) + (entry.syllabified || 0) * 2 + (entry.defined || 0) * 3 + (entry.audioRepeated || 0) * 2;
        const difficulty = w >= 6 ? 'high' : w >= 3 ? 'medium' : 'low';
        const actions = [];
        if (entry.clicks > 0)       actions.push(`Clicked (${entry.clicks})`);
        if (entry.syllabified > 0)  actions.push(`Syllables (${entry.syllabified})`);
        if (entry.defined > 0)      actions.push(`Defined (${entry.defined})`);
        if (entry.audioRepeated > 0) actions.push(`Replayed (${entry.audioRepeated})`);
        return { word: entry.word, subject: entry.subject, uid: entry.uid, actionsTriggered: actions.join(', '), difficulty, weight: w };
      })
      .sort((a, b) => b.weight - a.weight);
  },

  async getSentenceDigest() {
    const sorted = [...load(COLLECTIONS.SENTENCE_LOGS)].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const seen = new Set();
    return sorted.filter(e => { if (seen.has(e.original)) return false; seen.add(e.original); return true; });
  },

  async getStats() {
    const wordLogs     = load(COLLECTIONS.WORD_LOGS);
    const sentenceLogs = load(COLLECTIONS.SENTENCE_LOGS);
    const speedLogs    = load(COLLECTIONS.SPEED_LOGS);
    const summaries    = load(COLLECTIONS.SESSION_SUMMARIES);

    let avgSpeed = 1.0;
    if (speedLogs.length > 0) {
      avgSpeed = (speedLogs.reduce((a, e) => a + (e.rate || 0), 0) / speedLogs.length).toFixed(1);
    }

    let avgDecodeRate = 0;
    if (summaries.length > 0) {
      avgDecodeRate = Math.round((summaries.reduce((a, s) => a + (s.decodeRate || 0), 0) / summaries.length) * 100);
    }

    return {
      totalStruggledWords: wordLogs.length,
      totalSimplifications: sentenceLogs.length,
      totalSessions: summaries.length,
      avgSpeed: `${avgSpeed}x`,
      avgDecodeRate: `${avgDecodeRate}%`,
    };
  },

  // Returns list of unique students who have session data
  async getStudentList() {
    const summaries = load(COLLECTIONS.SESSION_SUMMARIES);
    const wordLogs  = load(COLLECTIONS.WORD_LOGS);
    const uids = [...new Set([...summaries.map(s => s.uid), ...wordLogs.map(w => w.uid)])];
    return uids.map(uid => {
      const userSessions = summaries.filter(s => s.uid === uid).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return {
        uid,
        sessionCount: userSessions.length,
        lastActive: userSessions[0]?.timestamp || null,
        avgWpm: userSessions.length > 0
          ? Math.round(userSessions.reduce((a, s) => a + (s.readingSpeedWpm || 0), 0) / userSessions.length)
          : 0,
      };
    });
  },

  // Progress data for a single student (for sparkline)
  async getStudentProgress(uid) {
    return load(COLLECTIONS.READING_PROGRESS)
      .filter(p => p.uid === uid)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-10);
  },

  async clearLogs() {
    Object.values(COLLECTIONS).forEach(key => localStorage.removeItem(key));
  },

  async exportDigestReport() {
    const [stats, words, sentences, students] = await Promise.all([
      this.getStats(), this.getWordDigest(), this.getSentenceDigest(), this.getStudentList()
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
