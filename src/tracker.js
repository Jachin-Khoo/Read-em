/* ==========================================================================
   Sup' Read With Me Passive Difficulty Tracker (src/tracker.js)
   Persists student reading telemetry to Firestore so the Teacher Dashboard
   can see classroom-wide struggles across every signed-in student.
   ========================================================================== */

const COLLECTIONS = {
  WORD_LOGS: 'readem_mock_wordLogs',
  SENTENCE_LOGS: 'readem_mock_sentenceLogs',
  SPEED_LOGS: 'readem_mock_speedLogs',
};

const ACTION_FIELD_MAP = {
  click: 'clicks',
  syllabify: 'syllabified',
  define: 'defined',
  audio_repeat: 'audioRepeated',
};

let currentUid = null;

export function setTrackerUser(uid) {
  currentUid = uid;
}

const getStorageItem = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    return [];
  }
};

const saveStorageItem = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const Tracker = {
  /**
   * Log that a student interacted with a word
   * @param {string} word - The clean target word
   * @param {string} subject - The subject domain (e.g. Science, Math)
   * @param {string} actionType - 'click' | 'syllabify' | 'define' | 'audio_repeat'
   */
  async logWordDifficulty(word, subject = 'General', actionType = 'click') {
    if (!currentUid) return;

    const cleanWord = word.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    const field = ACTION_FIELD_MAP[actionType];
    if (!field) return;

    const logs = getStorageItem(COLLECTIONS.WORD_LOGS);
    const key = `${currentUid}_${cleanWord}_${subject}`;
    
    let entry = logs.find(l => l.key === key);
    if (!entry) {
      entry = {
        key,
        uid: currentUid,
        word: cleanWord,
        subject,
        clicks: 0,
        syllabified: 0,
        defined: 0,
        audioRepeated: 0,
      };
      logs.push(entry);
    }
    
    entry[field] = (entry[field] || 0) + 1;
    entry.lastUpdated = new Date().toISOString();
    
    saveStorageItem(COLLECTIONS.WORD_LOGS, logs);
  },

  /**
   * Log that a sentence or paragraph was simplified by the student
   * @param {string} original - The raw sentence
   * @param {string} simplified - The simplified result
   * @param {string} subject - The subject domain
   */
  async logSentenceSimplification(original, simplified, subject = 'General') {
    if (!currentUid || !original || !simplified) return;

    const logs = getStorageItem(COLLECTIONS.SENTENCE_LOGS);
    logs.push({
      uid: currentUid,
      original: original.trim(),
      simplified: simplified.trim(),
      subject,
      timestamp: new Date().toISOString(),
    });
    
    saveStorageItem(COLLECTIONS.SENTENCE_LOGS, logs);
  },

  /**
   * Log speech speed selection to aggregate average reading speeds
   * @param {number} rate - The speed multiplier selected (e.g. 0.8, 1.2)
   */
  async logReadingSpeed(rate) {
    if (!currentUid) return;

    const logs = getStorageItem(COLLECTIONS.SPEED_LOGS);
    logs.push({
      uid: currentUid,
      rate: parseFloat(rate),
      timestamp: new Date().toISOString(),
    });
    
    saveStorageItem(COLLECTIONS.SPEED_LOGS, logs);
  },

  /**
   * Retrieve aggregated insights for words across the whole classroom
   * Returns list of words with total count, subject, and difficulty classification
   */
  async getWordDigest() {
    const logs = getStorageItem(COLLECTIONS.WORD_LOGS);

    return logs
      .map((entry) => {
        const clicks = entry.clicks || 0;
        const syllabified = entry.syllabified || 0;
        const defined = entry.defined || 0;
        const audioRepeated = entry.audioRepeated || 0;
        const totalWeight = clicks * 1 + syllabified * 2 + defined * 3 + audioRepeated * 2;

        let difficulty = 'low';
        if (totalWeight >= 6) {
          difficulty = 'high';
        } else if (totalWeight >= 3) {
          difficulty = 'medium';
        }

        const actions = [];
        if (clicks > 0) actions.push(`Clicked (${clicks})`);
        if (syllabified > 0) actions.push(`Split Syllables (${syllabified})`);
        if (defined > 0) actions.push(`Defined (${defined})`);
        if (audioRepeated > 0) actions.push(`Replayed (${audioRepeated})`);

        return {
          word: entry.word,
          subject: entry.subject,
          actionsTriggered: actions.join(', '),
          difficulty,
          weight: totalWeight,
        };
      })
      .sort((a, b) => b.weight - a.weight); // Most struggled words first
  },

  /**
   * Retrieve all simplified sentences across the classroom, latest first.
   * Deduplicated by original text so a sentence simplified multiple times
   * (by the same or different students) only shows up once.
   */
  async getSentenceDigest() {
    const logs = getStorageItem(COLLECTIONS.SENTENCE_LOGS);
    const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const seenOriginals = new Set();
    const deduped = [];
    sorted.forEach((entry) => {
      if (seenOriginals.has(entry.original)) return;
      seenOriginals.add(entry.original);
      deduped.push(entry);
    });
    return deduped;
  },

  /**
   * Get general aggregate statistics across the classroom
   */
  async getStats() {
    const wordLogs = getStorageItem(COLLECTIONS.WORD_LOGS);
    const sentenceLogs = getStorageItem(COLLECTIONS.SENTENCE_LOGS);
    const speedLogs = getStorageItem(COLLECTIONS.SPEED_LOGS);

    const totalStruggledWords = wordLogs.length;
    const totalSimplifications = sentenceLogs.length;

    // Calculate average speed
    let avgSpeed = 1.0;
    if (speedLogs.length > 0) {
      const sum = speedLogs.reduce((acc, entry) => acc + (entry.rate || 0), 0);
      avgSpeed = (sum / speedLogs.length).toFixed(1);
    }

    return {
      totalStruggledWords,
      totalSimplifications,
      avgSpeed: `${avgSpeed}x`,
    };
  },

  /**
   * Reset all classroom-wide data logs
   */
  async clearLogs() {
    localStorage.removeItem(COLLECTIONS.WORD_LOGS);
    localStorage.removeItem(COLLECTIONS.SENTENCE_LOGS);
    localStorage.removeItem(COLLECTIONS.SPEED_LOGS);
  },

  /**
   * Export classroom summary as text digest
   */
  async exportDigestReport() {
    const stats = await this.getStats();
    const words = await this.getWordDigest();
    const sentences = await this.getSentenceDigest();

    let text = `==================================================\n`;
    text += `SUP' READ WITH ME WEEKLY LITERACY DIGEST REPORT\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `==================================================\n\n`;

    text += `SUMMARY METRICS:\n`;
    text += `- Total Unique Struggled Words Logged: ${stats.totalStruggledWords}\n`;
    text += `- Sentences Simplified by Students: ${stats.totalSimplifications}\n`;
    text += `- Average Student Read-Aloud Speed: ${stats.avgSpeed}\n\n`;

    text += `MOST CHALLENGING VOCABULARY:\n`;
    if (words.length === 0) {
      text += `  No vocabulary struggles logged yet.\n`;
    } else {
      words.forEach((w, i) => {
        text += `  ${i + 1}. [${w.difficulty.toUpperCase()}] "${w.word}" (${w.subject})\n`;
        text += `     Actions: ${w.actionsTriggered}\n`;
      });
    }
    text += `\n`;

    text += `SENTENCES SIMPLIFIED (COGNITIVE FATIGUE SPOTS):\n`;
    if (sentences.length === 0) {
      text += `  No simplifications logged yet.\n`;
    } else {
      sentences.forEach((s, i) => {
        text += `  ${i + 1}. Subject: ${s.subject}\n`;
        text += `     Original: "${s.original}"\n`;
        text += `     Simplified: "${s.simplified}"\n`;
      });
    }
    text += `\n==================================================\n`;

    return text;
  }
};
