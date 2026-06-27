/* ==========================================================================
   Sup' Read With Me Passive Difficulty Tracker (src/tracker.js)
   ========================================================================== */

const STORAGE_KEYS = {
  WORD_LOGS: 'readem_word_logs',
  SENTENCE_LOGS: 'readem_sentence_logs',
  SPEED_LOGS: 'readem_speed_logs',
};

// Retrieve initial data from localStorage or default
function getStoredData(key, defaultVal) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    console.error('Error reading localStorage logs:', e);
    return defaultVal;
  }
}

function setStoredData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing localStorage logs:', e);
  }
}

export const Tracker = {
  /**
   * Log that a student interacted with a word
   * @param {string} word - The clean target word
   * @param {string} subject - The subject domain (e.g. Science, Math)
   * @param {string} actionType - 'click' | 'syllabify' | 'define' | 'audio_repeat'
   */
  logWordDifficulty(word, subject = 'General', actionType = 'click') {
    const cleanWord = word.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    const logs = getStoredData(STORAGE_KEYS.WORD_LOGS, []);
    
    // Find existing entry
    let entry = logs.find(l => l.word === cleanWord && l.subject === subject);
    if (!entry) {
      entry = {
        word: cleanWord,
        subject: subject,
        clicks: 0,
        syllabified: 0,
        defined: 0,
        audioRepeated: 0,
        lastUpdated: Date.now()
      };
      logs.push(entry);
    }

    if (actionType === 'click') entry.clicks++;
    if (actionType === 'syllabify') entry.syllabified++;
    if (actionType === 'define') entry.defined++;
    if (actionType === 'audio_repeat') entry.audioRepeated++;
    
    entry.lastUpdated = Date.now();
    setStoredData(STORAGE_KEYS.WORD_LOGS, logs);
  },

  /**
   * Log that a sentence or paragraph was simplified by the student
   * @param {string} original - The raw sentence
   * @param {string} simplified - The simplified result
   * @param {string} subject - The subject domain
   */
  logSentenceSimplification(original, simplified, subject = 'General') {
    if (!original || !simplified) return;
    const logs = getStoredData(STORAGE_KEYS.SENTENCE_LOGS, []);
    
    logs.push({
      original: original.trim(),
      simplified: simplified.trim(),
      subject: subject,
      timestamp: Date.now()
    });

    setStoredData(STORAGE_KEYS.SENTENCE_LOGS, logs);
  },

  /**
   * Log speech speed selection to aggregate average reading speeds
   * @param {number} rate - The speed multiplier selected (e.g. 0.8, 1.2)
   */
  logReadingSpeed(rate) {
    const logs = getStoredData(STORAGE_KEYS.SPEED_LOGS, []);
    logs.push({
      rate: parseFloat(rate),
      timestamp: Date.now()
    });
    setStoredData(STORAGE_KEYS.SPEED_LOGS, logs);
  },

  /**
   * Retrieve aggregated insights for words
   * Returns list of words with total count, subject, and difficulty classification
   */
  getWordDigest() {
    const logs = getStoredData(STORAGE_KEYS.WORD_LOGS, []);
    
    return logs
      .map(entry => {
        const totalWeight = entry.clicks * 1 + entry.syllabified * 2 + entry.defined * 3 + entry.audioRepeated * 2;
        
        let difficulty = 'low';
        if (totalWeight >= 6) {
          difficulty = 'high';
        } else if (totalWeight >= 3) {
          difficulty = 'medium';
        }

        const actions = [];
        if (entry.clicks > 0) actions.push(`Clicked (${entry.clicks})`);
        if (entry.syllabified > 0) actions.push(`Split Syllables (${entry.syllabified})`);
        if (entry.defined > 0) actions.push(`Defined (${entry.defined})`);
        if (entry.audioRepeated > 0) actions.push(`Replayed (${entry.audioRepeated})`);

        return {
          word: entry.word,
          subject: entry.subject,
          actionsTriggered: actions.join(', '),
          difficulty: difficulty,
          weight: totalWeight
        };
      })
      .sort((a, b) => b.weight - a.weight); // Most struggled words first
  },

  /**
   * Retrieve all simplified sentences
   */
  getSentenceDigest() {
    return getStoredData(STORAGE_KEYS.SENTENCE_LOGS, []).reverse(); // Latest first
  },

  /**
   * Get general aggregate statistics
   */
  getStats() {
    const wordLogs = getStoredData(STORAGE_KEYS.WORD_LOGS, []);
    const sentenceLogs = getStoredData(STORAGE_KEYS.SENTENCE_LOGS, []);
    const speedLogs = getStoredData(STORAGE_KEYS.SPEED_LOGS, []);

    const totalStruggledWords = wordLogs.length;
    const totalSimplifications = sentenceLogs.length;

    // Calculate average speed
    let avgSpeed = 1.0;
    if (speedLogs.length > 0) {
      const sum = speedLogs.reduce((acc, curr) => acc + curr.rate, 0);
      avgSpeed = (sum / speedLogs.length).toFixed(1);
    }

    return {
      totalStruggledWords,
      totalSimplifications,
      avgSpeed: `${avgSpeed}x`
    };
  },

  /**
   * Reset all data logs
   */
  clearLogs() {
    localStorage.removeItem(STORAGE_KEYS.WORD_LOGS);
    localStorage.removeItem(STORAGE_KEYS.SENTENCE_LOGS);
    localStorage.removeItem(STORAGE_KEYS.SPEED_LOGS);
  },

  /**
   * Export classroom summary as text digest
   */
  exportDigestReport() {
    const stats = this.getStats();
    const words = this.getWordDigest();
    const sentences = this.getSentenceDigest();

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
