/* ==========================================================================
   Sup' Read With Me Text-To-Speech (TTS) Sync Engine (src/tts.js)
   ========================================================================== */

import { AIService } from './ai-service.js';

let activeUtterance = null;
let wordRanges = [];
let onWordHighlightCallback = null;
let onSpeechEndCallback = null;
let currentWordIndex = -1;
let elevenLabsAudio = null;
let animationFrameId = null;

export const TTS = {
  /**
   * Parse text into HTML structured spans while building character index maps for speech sync
   */
  parseText(text) {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    let globalWordIdx = 0;
    const ranges = [];
    let parsedHTML = '';
    let utteranceText = '';

    paragraphs.forEach((pText, pIdx) => {
      parsedHTML += `<p class="reader-para" data-para-idx="${pIdx}">`;
      
      // Split paragraph into sentences/clauses
      const sentences = pText.match(/[^.!?]+(?:[.!?]+|\s*$)/g) || [pText];
      
      sentences.forEach((sText, sIdx) => {
        const chunkClass = sIdx % 2 === 0 ? 'even' : 'odd';
        parsedHTML += `<span class="sentence-chunk ${chunkClass}">`;
        
        // Tokenize by whitespaces
        const tokens = sText.split(/(\s+)/);
        
        tokens.forEach(token => {
          if (/\s+/.test(token)) {
            parsedHTML += token;
            utteranceText += token;
          } else {
            // Identify word boundary separating prefixes or suffixes (like brackets, commas, quotes)
            const match = token.match(/^([^\w]*)([\w'-]+)([^\w]*)$/);
            if (match) {
              const prefix = match[1];
              const cleanWord = match[2];
              const suffix = match[3];

              parsedHTML += prefix;
              utteranceText += prefix;

              const startIdx = utteranceText.length;
              parsedHTML += `<span class="word" id="word-${globalWordIdx}" data-word-idx="${globalWordIdx}" data-clean-word="${cleanWord}">${cleanWord}</span>`;
              utteranceText += cleanWord;
              const endIdx = utteranceText.length;

              ranges.push({
                index: globalWordIdx,
                word: cleanWord,
                start: startIdx,
                end: endIdx
              });

              globalWordIdx++;

              parsedHTML += suffix;
              utteranceText += suffix;
            } else {
              // Raw punctuation tokens
              parsedHTML += token;
              utteranceText += token;
            }
          }
        });
        
        parsedHTML += `</span>`;
      });

      // Append paragraph action button for simplification context
      parsedHTML += `<button class="para-action-btn" data-para-idx="${pIdx}" title="Simplify this paragraph"><i class="fa-solid fa-wand-magic-sparkles"></i> Simplify</button>`;
      parsedHTML += `</p>`;
      
      utteranceText += '\n\n'; // Reconstruct paragraphs in vocal stream
    });

    return {
      html: parsedHTML,
      utteranceText: utteranceText.trim(),
      ranges: ranges
    };
  },

  /**
   * Initialize voices configuration
   * @param {Function} callback - Triggered when voices are ready
   */
  initVoices(callback) {
    if (typeof window === 'undefined') return;

    const triggerCallback = async () => {
      const huaweiVoices = this.getHuaweiVoices();
      const elevenLabsVoices = await this.getElevenLabsVoices();
      const nativeVoices = this.getAvailableVoices();
      callback([...huaweiVoices, ...elevenLabsVoices, ...nativeVoices]);
    };

    if (window.speechSynthesis) {
      // Chrome loads voices asynchronously, listen to event
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          triggerCallback();
        };
      }
    }
    
    // Initial call
    triggerCallback();
  },

  /**
   * Return Huawei SIS TTS voice options when the proxy is configured.
   * Voice property strings map to Huawei SIS supported voice models.
   */
  getHuaweiVoices() {
    if (!AIService.isUsingHuawei()) return [];
    return [
      { name: 'Huawei: Rose (English, Female)', value: 'huawei|english_rose_16k', lang: 'en' },
      { name: 'Huawei: William (English, Male)', value: 'huawei|english_william_16k', lang: 'en' },
      { name: 'Huawei: Huaxiaomei (中文, Female)', value: 'huawei|chinese_huaxiaomei_16k', lang: 'zh' },
    ];
  },

  /**
   * Fetch all native synthesized voices available
   */
  getAvailableVoices() {
    if (!window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices().filter(voice => voice.lang.includes('en'));
  },

  /**
   * Fetch ElevenLabs voices if key is configured
   */
  async getElevenLabsVoices() {
    const keys = AIService.getKeys();
    if (!keys.elevenlabs) {
      return [
        { name: "ElevenLabs: Rachel (Demo)", value: "elevenlabs|21m00Tcm4TlvDq8ikWAM", lang: "en", default: false },
        { name: "ElevenLabs: Drew (Demo)", value: "elevenlabs|29vD33N1CtxCmqQRPOHJ", lang: "en", default: false },
        { name: "ElevenLabs: Clyde (Demo)", value: "elevenlabs|2EiwWnXF2V4j26hz8Yqd", lang: "en", default: false },
        { name: "ElevenLabs: Paul (Demo)", value: "elevenlabs|5Q0t7uMc1a5Cc2CigRVo", lang: "en", default: false },
        { name: "ElevenLabs: Dom (Demo)", value: "elevenlabs|AZnzlk1XvdvUeBnXmlld", lang: "en", default: false },
        { name: "ElevenLabs: Bella (Demo)", value: "elevenlabs|EXAVITQu4vr4xnSDxMaL", lang: "en", default: false }
      ];
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': keys.elevenlabs
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.voices || []).map(v => ({
        name: `ElevenLabs: ${v.name}`,
        value: `elevenlabs|${v.voice_id}`,
        lang: 'en',
        default: false
      }));
    } catch (e) {
      console.error('Failed to load ElevenLabs voices:', e);
      return [];
    }
  },

  /**
   * Speak input text mapped with word-span boundaries
   */
  speak(parsedData, options = {}, onHighlight, onEnd) {
    this.stop(); // Cancel active reading session

    if (options.voiceName && options.voiceName.startsWith('huawei|')) {
      const property = options.voiceName.split('|')[1];
      this.speakHuawei(parsedData, property, options, onHighlight, onEnd);
      return;
    }

    if (options.voiceName && options.voiceName.startsWith('elevenlabs|')) {
      const voiceId = options.voiceName.split('|')[1];
      this.speakElevenLabs(parsedData, voiceId, options, onHighlight, onEnd);
      return;
    }

    if (!window.speechSynthesis) {
      console.error('SpeechSynthesis not supported on this browser');
      return;
    }

    // Determine where to start — resume from a specific word if requested
    const startWordIdx = options.startFromWordIdx || 0;
    const startRange = parsedData.ranges.find(r => r.index === startWordIdx);
    const charOffset = startRange ? startRange.start : 0;
    const slicedText = charOffset > 0
      ? parsedData.utteranceText.slice(charOffset)
      : parsedData.utteranceText;

    wordRanges = parsedData.ranges;
    onWordHighlightCallback = onHighlight;
    onSpeechEndCallback = onEnd;
    currentWordIndex = startWordIdx - 1;

    activeUtterance = new SpeechSynthesisUtterance(slicedText);
    
    // Apply voice options
    if (options.voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === options.voiceName);
      if (selectedVoice) activeUtterance.voice = selectedVoice;
    }

    activeUtterance.rate = options.rate || 1.0;
    activeUtterance.pitch = options.pitch || 1.0;
    activeUtterance.volume = 1.0;

    // Track speech boundary changes to trigger highlights
    activeUtterance.onboundary = (event) => {
      // Sentence boundary — optional callback for auto-pause between sentences
      if (event.name === 'sentence' && options.onSentenceBoundary) {
        options.onSentenceBoundary();
      }

      if (event.name !== 'word') return;

      // charIndex is relative to the sliced utterance; add offset to match original ranges
      const charIdx = event.charIndex + charOffset;

      // Locate corresponding word span by checking range overlaps
      const match = wordRanges.find(r => charIdx >= r.start && charIdx <= r.end);
      if (match && match.index !== currentWordIndex) {
        currentWordIndex = match.index;
        if (onWordHighlightCallback) {
          onWordHighlightCallback(currentWordIndex);
        }
      }
    };

    activeUtterance.onend = () => {
      this.cleanup();
      if (onSpeechEndCallback) onSpeechEndCallback();
    };

    activeUtterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('Speech synthesis error:', e);
        this.cleanup();
        if (onSpeechEndCallback) onSpeechEndCallback();
      }
    };

    window.speechSynthesis.speak(activeUtterance);
  },

  async speakHuawei(parsedData, voiceProperty, options, onHighlight, onEnd) {
    wordRanges = parsedData.ranges;
    onWordHighlightCallback = onHighlight;
    onSpeechEndCallback = onEnd;
    currentWordIndex = -1;

    try {
      const audio64 = await AIService.synthesizeSpeech(
        parsedData.utteranceText.slice(0, 500),
        voiceProperty,
        options.rate || 1.0
      );
      if (!audio64) throw new Error('Huawei TTS returned no audio — is the proxy server running?');

      const bytes = Uint8Array.from(atob(audio64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);

      elevenLabsAudio = new Audio(audioUrl);
      elevenLabsAudio.playbackRate = options.rate || 1.0;

      elevenLabsAudio.oncanplaythrough = () => {
        if (elevenLabsAudio) { elevenLabsAudio.play(); this.startHighlightSyncLoop(); }
      };
      elevenLabsAudio.onended = () => { this.cleanup(); if (onSpeechEndCallback) onSpeechEndCallback(); };
      elevenLabsAudio.onerror = () => { this.cleanup(); if (onSpeechEndCallback) onSpeechEndCallback(); };

    } catch (e) {
      console.error('Huawei TTS error:', e.message);
      const nativeVoices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
      const fallback = nativeVoices.length > 0 ? nativeVoices[0].name : '';
      this.speak(parsedData, { ...options, voiceName: fallback }, onHighlight, onEnd);
    }
  },

  async speakElevenLabs(parsedData, voiceId, options, onHighlight, onEnd) {
    const keys = AIService.getKeys();
    const apiKey = keys.elevenlabs;
    if (!apiKey) {
      console.warn("ElevenLabs API Key is missing. Using native Web Speech fallback for demo preview.");
      const nativeVoices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
      const fallbackVoice = nativeVoices.length > 0 ? nativeVoices[0].name : '';
      this.speak(parsedData, { ...options, voiceName: fallbackVoice }, onHighlight, onEnd);
      return;
    }

    wordRanges = parsedData.ranges;
    onWordHighlightCallback = onHighlight;
    onSpeechEndCallback = onEnd;
    currentWordIndex = -1;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: parsedData.utteranceText,
          model_id: keys.elevenlabsModel || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail?.message || 'ElevenLabs API request failed');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      elevenLabsAudio = new Audio(audioUrl);
      elevenLabsAudio.playbackRate = options.rate || 1.0;

      elevenLabsAudio.oncanplaythrough = () => {
        if (elevenLabsAudio) {
          elevenLabsAudio.play();
          this.startHighlightSyncLoop();
        }
      };

      elevenLabsAudio.onended = () => {
        this.cleanup();
        if (onSpeechEndCallback) onSpeechEndCallback();
      };

      elevenLabsAudio.onerror = (e) => {
        console.error('ElevenLabs Audio playback error:', e);
        this.cleanup();
        if (onSpeechEndCallback) onSpeechEndCallback();
      };

    } catch (e) {
      alert(`ElevenLabs error: ${e.message}`);
      this.cleanup();
      if (onSpeechEndCallback) onSpeechEndCallback();
    }
  },

  startHighlightSyncLoop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (wordRanges.length === 0) return;

    const totalChars = wordRanges[wordRanges.length - 1].end || 1;

    const update = () => {
      if (!elevenLabsAudio || elevenLabsAudio.paused || elevenLabsAudio.ended) {
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      const duration = elevenLabsAudio.duration;
      if (duration) {
        const currentTime = elevenLabsAudio.currentTime;
        const progress = currentTime / duration;
        const currentRelationChar = progress * totalChars;

        const match = wordRanges.find(r => currentRelationChar >= r.start && currentRelationChar <= r.end);
        if (match && match.index !== currentWordIndex) {
          currentWordIndex = match.index;
          if (onWordHighlightCallback) {
            onWordHighlightCallback(currentWordIndex);
          }
        }
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
  },

  pause() {
    if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
    if (elevenLabsAudio && !elevenLabsAudio.paused) {
      elevenLabsAudio.pause();
    }
  },

  resume() {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    if (elevenLabsAudio && elevenLabsAudio.paused) {
      elevenLabsAudio.play();
    }
  },

  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (elevenLabsAudio) {
      elevenLabsAudio.pause();
      elevenLabsAudio = null;
    }
    this.cleanup();
  },

  cleanup() {
    activeUtterance = null;
    currentWordIndex = -1;
    if (elevenLabsAudio) {
      elevenLabsAudio.pause();
      elevenLabsAudio = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  },

  speakSingleWord(word, voiceName) {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (elevenLabsAudio) {
      elevenLabsAudio.pause();
      elevenLabsAudio = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    const keys = AIService.getKeys();
    if (voiceName && voiceName.startsWith('huawei|')) {
      const property = voiceName.split('|')[1];
      this.speakSingleWordHuawei(word, property);
      return;
    }

    if (voiceName && voiceName.startsWith('elevenlabs|') && keys.elevenlabs) {
      const voiceId = voiceName.split('|')[1];
      this.speakSingleWordElevenLabs(word, voiceId);
      return;
    }

    // Native Speech Fallback
    const utterance = new SpeechSynthesisUtterance(word);
    let cleanVoiceName = voiceName;
    if (voiceName && voiceName.startsWith('elevenlabs|')) {
      const nativeVoices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
      cleanVoiceName = nativeVoices.length > 0 ? nativeVoices[0].name : '';
    }

    if (cleanVoiceName) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === cleanVoiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
    }
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  },

  async speakSingleWordHuawei(word, voiceProperty) {
    try {
      const audio64 = await AIService.synthesizeSpeech(word, voiceProperty, 0.85);
      if (!audio64) return;
      const bytes = Uint8Array.from(atob(audio64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      elevenLabsAudio = new Audio(URL.createObjectURL(blob));
      elevenLabsAudio.playbackRate = 0.85;
      elevenLabsAudio.play();
    } catch (e) {
      console.error('Huawei TTS single word error:', e.message);
    }
  },

  async speakSingleWordElevenLabs(word, voiceId) {
    const keys = AIService.getKeys();
    const apiKey = keys.elevenlabs;
    if (!apiKey) return;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: word,
          model_id: keys.elevenlabsModel || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) return;

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      elevenLabsAudio = new Audio(audioUrl);
      elevenLabsAudio.playbackRate = 0.85;
      elevenLabsAudio.play();
    } catch (e) {
      console.error('Failed to speak single word with ElevenLabs:', e);
    }
  }
};
