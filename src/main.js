/* ==========================================================================
   Read'Em Main Orchestrator (src/main.js)
   ========================================================================== */

import { TTS } from './services/tts.js';
import { AIService } from './services/ai-service.js';
import { Tracker, setTrackerUser } from './store/tracker.js';
import { extractTextFromPDF, readTextFile } from './services/pdf-handler.js';
import { Auth } from './store/auth.js';

/* ==================== PHONICS / OVERLAY CONSTANTS ==================== */
const DIGRAPH_SET = new Set(['th', 'ch', 'sh', 'ph', 'wh', 'ck', 'ng', 'gh', 'kn', 'wr']);
const VOWEL_DIGRAPH_SET = new Set(['ai', 'ay', 'ea', 'ee', 'ei', 'ey', 'ie', 'oa', 'oe', 'oi', 'oo', 'ou', 'ow', 'oy', 'au', 'aw', 'ue', 'ui', 'eu']);
const SIMPLE_VOWELS = new Set('aeiou');
const PREFIX_TABLE = ['inter', 'trans', 'super', 'under', 'over', 'semi', 'multi', 'anti', 'non', 'pre', 'dis', 'mis', 'un', 're', 'de', 'co', 'ex', 'bi', 'tri', 'sub', 'pro', 'fore', 'mid', 'out'];
const SUFFIX_TABLE = ['tion', 'sion', 'ness', 'ment', 'less', 'ful', 'able', 'ible', 'ious', 'ous', 'ive', 'ize', 'ise', 'ify', 'ship', 'hood', 'ward', 'wise', 'ing', 'age', 'al', 'ic', 'ly', 'er', 'ed', 'est'];

/* ==================== GLOBAL APPLICATION STATE ==================== */
let appState = {
  rawText: '',
  subject: 'General',
  parsedData: null,
  activeVoice: '',
  isPlaying: false,
  isPaused: false,
  activeWordIdx: -1,
  rulerActive: false,
  savedScrollTop: 0,
  pdfDoc: null,
  role: null,
  overlays: {
    syllable: false,
    phonicsVowels: false,
    phonicsDigraphs: false,
    morpheme: false,
    bionic: false,
    bionicRatio: 0.45,
  },
  focusMode: false,
  progressiveReveal: false,
  progressiveIdx: 0,
  pendingPreteachText: null,
  lastDecodedWordData: null,
  sessionId: null,
  sessionStartTime: null,
  sessionWordDecodes: 0,
  sessionSimplifications: 0,
  // Oral fluency assessment
  assessmentMode: false,
  assessmentStartTime: null,
  pcmRecorder: null,
  // Mother-tongue bridge
  bridgeLang: '',
};

/* ==================== CURRICULUM DEMO MATERIALS ==================== */
const DEMO_MATERIALS = {
  // Singapore Primary curriculum (PSLE-level)
  "sg-psle-science": {
    subject: "Science",
    text: "Living things need water to survive. Water exists in three states: solid ice, liquid water, and water vapour, which is a gas. When water is heated by the sun, it changes into water vapour and rises into the atmosphere. This process is called evaporation. When water vapour rises higher and cools down, it condenses into tiny droplets that form clouds. Eventually, water falls back to Earth as rain. This continuous movement of water between the Earth and atmosphere is called the water cycle, and it ensures that fresh water is continuously available on our planet."
  },
  "sg-psle-math": {
    subject: "Mathematics",
    text: "Ahmad bought 3 identical bags of marbles. Each bag contained 48 marbles. He gave 27 marbles to his classmates and packed the remaining marbles equally into 9 containers. How many marbles were there in each container? To solve this problem, first calculate the total number of marbles Ahmad started with. Then subtract the number he gave to his classmates. Finally, divide the remaining marbles equally among the 9 containers to find how many are in each container."
  },
  "sg-psle-english": {
    subject: "Literature",
    text: "The old hawker uncle had been frying char kway teow at the same stall in Tiong Bahru Market for over forty years. Every morning, he arrived before dawn to prepare his ingredients: flat rice noodles, bean sprouts, cockles, eggs, and his secret blend of dark soy sauce and chilli paste. The familiar sizzle of the wok and the fragrant smoke rising into the air drew a long queue of loyal customers. For many Singaporeans, eating at his stall was not merely about food but about reconnecting with the comforting sights, sounds and smells of childhood."
  },
  "sg-workplace": {
    subject: "General",
    text: "The Performance Review process is conducted twice yearly to assess each employee's contributions and identify areas for development. During the review meeting, your manager will discuss your key performance indicators, which are the measurable goals agreed upon at the start of the year. You are encouraged to prepare a self-evaluation form beforehand, summarising achievements, challenges faced, and your professional development goals. The outcome of your review will inform decisions regarding annual increments and promotion eligibility for the coming financial year."
  },
  // General curriculum passages
  "math-word": {
    subject: "Mathematics",
    text: "In order to evaluate the relationship between two distinct sets of objects, you must perform a comparative analysis of their quantities. Consider group A, which consists of 4 red blocks, and group B, which consists of 8 blue blocks. Determine the ratio of group A to group B, expressing the relationship in its simplest equivalent fractional representation."
  },
  "science-passage": {
    subject: "Science",
    text: "Green plants synthesize organic compounds from inorganic materials through a biochemical process called photosynthesis. The primary catalyst is chlorophyll, a green pigment within leaves that captures light energy. Water is absorbed from the substrate by the root system, while carbon dioxide is taken in from the surrounding atmosphere through microscopic pores called stomata. Sunlight subsequently converts these compounds into glucose carbohydrates and oxygen."
  },
  "history-passage": {
    subject: "History",
    text: "The Roman Empire pioneered advanced municipal sanitation networks, constructing stone aqueducts to transport freshwater from elevated mountainous regions into urban centers. Their architectural durability was achieved through the invention of a proprietary concrete composed of volcanic ash and lime. Modern archaeologists analyze these structural relics to chart Roman civilization."
  },
  "english-lit": {
    subject: "Literature",
    text: "Robin Hood, a legendary outlaw of English folklore, resided in Sherwood Forest where he assembled a band of loyal companions known as the Merry Men. He engaged in persistent conflict against the tyrannical Sheriff of Nottingham, executing a strategy of redistributing wealth by seizing assets from wealthy noblemen and donating them to destitute peasant families."
  }
};

/* ==================== DOM ELEMENT CACHE ==================== */
const doc = {
  viewLandingPortal: document.getElementById('view-landing-portal'),
  btnLogout: document.getElementById('btn-logout'),
  tabSignIn: document.getElementById('tab-signin'),
  tabSignUp: document.getElementById('tab-signup'),
  authRoleField: document.getElementById('auth-role-field'),
  authRoleSelect: document.getElementById('auth-role-select'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  authError: document.getElementById('auth-error'),
  btnAuthSubmit: document.getElementById('btn-auth-submit'),
  readerWorkspace: document.getElementById('reader-workspace'),
  teacherWorkspace: document.getElementById('teacher-workspace'),
  fontFamily: document.getElementById('font-family-select'),
  fontSize: document.getElementById('font-size-slider'),
  fontSizeVal: document.getElementById('font-size-value'),
  lineHeight: document.getElementById('line-height-slider'),
  lineHeightVal: document.getElementById('line-height-value'),
  letterSpacing: document.getElementById('letter-spacing-slider'),
  letterSpacingVal: document.getElementById('letter-spacing-value'),
  wordSpacing: document.getElementById('word-spacing-slider'),
  wordSpacingVal: document.getElementById('word-spacing-value'),
  themeSwatches: document.querySelectorAll('.swatch'),
  toggleRuler: document.getElementById('toggle-ruler'),
  rulerControls: document.querySelector('.ruler-control'),
  rulerHeight: document.getElementById('ruler-height-slider'),
  rulerHeightVal: document.getElementById('ruler-height-value'),
  toggleChunking: document.getElementById('toggle-chunking'),
  toggleLineFocus: document.getElementById('toggle-line-focus'),
  toggleBionic: document.getElementById('toggle-bionic'),
  bionicRatioRow: document.getElementById('bionic-ratio-row'),
  bionicRatioSlider: document.getElementById('bionic-ratio-slider'),
  bionicRatioValue: document.getElementById('bionic-ratio-value'),
  // New phonics toggles
  toggleSyllable: document.getElementById('toggle-syllable'),
  togglePhonicsVowels: document.getElementById('toggle-phonics-vowels'),
  togglePhonicsDigraphs: document.getElementById('toggle-phonics-digraphs'),
  toggleMorpheme: document.getElementById('toggle-morpheme'),
  // Irlen overlay
  toggleIrlen: document.getElementById('toggle-irlen'),
  irlenControls: document.getElementById('irlen-controls'),
  irlenColor: document.getElementById('irlen-color'),
  irlenOpacity: document.getElementById('irlen-opacity'),
  irlenOpacityValue: document.getElementById('irlen-opacity-value'),
  irlenOverlay: document.getElementById('irlen-overlay'),
  // Reading flow
  toggleFocusMode: document.getElementById('toggle-focus-mode'),
  toggleProgressive: document.getElementById('toggle-progressive'),
  autopauseSlider: document.getElementById('autopause-slider'),
  autopauseValue: document.getElementById('autopause-value'),
  // Audio panel
  voiceSelect: document.getElementById('voice-select'),
  voiceSpeed: document.getElementById('voice-speed-slider'),
  voiceSpeedVal: document.getElementById('voice-speed-value'),
  // Upload panel
  panelUpload: document.getElementById('panel-upload'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  btnBrowseFile: document.getElementById('btn-browse-file'),
  textInput: document.getElementById('text-input'),
  demoSelect: document.getElementById('demo-select'),
  subjectBadge: document.getElementById('subject-badge'),
  btnLoadText: document.getElementById('btn-load-text'),
  // Reader panel
  panelReader: document.getElementById('panel-reader'),
  btnViewReflowed: document.getElementById('btn-view-reflowed'),
  btnViewPdf: document.getElementById('btn-view-pdf'),
  pdfCanvasContainer: document.getElementById('pdf-canvas-container'),
  readerContent: document.getElementById('reader-content'),
  readerRuler: document.getElementById('reading-ruler'),
  scrollContainer: document.querySelector('.reader-content-scroll'),
  readerSubject: document.getElementById('reader-subject-indicator'),
  btnBackUpload: document.getElementById('btn-back-upload'),
  btnPlay: document.getElementById('btn-play-speech'),
  btnPause: document.getElementById('btn-pause-speech'),
  btnStop: document.getElementById('btn-stop-speech'),
  btnCheckUnderstanding: document.getElementById('btn-check-understanding'),
  progressWrapper: document.getElementById('reading-progress-wrapper'),
  progressFill: document.getElementById('progress-bar-fill'),
  progressTime: document.getElementById('reading-est-time'),
  // AI helper panel
  aiDictEmpty: document.getElementById('ai-dict-empty'),
  aiDictContent: document.getElementById('ai-dict-content'),
  targetWord: document.getElementById('target-word'),
  btnSpeakTarget: document.getElementById('btn-speak-target'),
  btnSaveGlossary: document.getElementById('btn-save-glossary'),
  syllablesChunked: document.getElementById('syllables-chunked'),
  phoneticGuide: document.getElementById('phonetic-guide'),
  wordDefinition: document.getElementById('word-definition'),
  conceptAnalogy: document.getElementById('concept-analogy'),
  aiSimplifierEmpty: document.getElementById('ai-simplifier-empty'),
  aiSimplifierContent: document.getElementById('ai-simplifier-content'),
  simplifiedOriginal: document.getElementById('simplified-original'),
  simplifiedResult: document.getElementById('simplified-result'),
  btnReplaceOriginal: document.getElementById('btn-replace-original'),
  btnGlossary: document.getElementById('btn-glossary'),
  // Fluency assessment
  btnStartAssess: document.getElementById('btn-start-assess'),
  btnStopAssess: document.getElementById('btn-stop-assess'),
  fluencyResult: document.getElementById('fluency-result'),
  // Language bridge
  languageBridge: document.getElementById('language-bridge'),
  wordTranslation: document.getElementById('word-translation'),
  // Plans & session summary modals
  plansModal: document.getElementById('plans-modal'),
  plansCloseBtn: document.getElementById('plans-close-btn'),
  sessionSummaryModal: document.getElementById('session-summary-modal'),
  sessionSummaryBody: document.getElementById('session-summary-body'),
  sessionSummaryCloseBtn: document.getElementById('session-summary-close-btn'),
  // Teacher dashboard
  aiInsightsBody: document.getElementById('ai-insights-body'),
  statWordsCount: document.getElementById('stat-words-count'),
  statSimplifications: document.getElementById('stat-simplifications'),
  statAvgSpeed: document.getElementById('stat-avg-speed'),
  statTotalSessions: document.getElementById('stat-total-sessions'),
  statAvgDecodeRate: document.getElementById('stat-avg-decode-rate'),
  studentProgressSection: document.getElementById('student-progress-section'),
  studentProgressList: document.getElementById('student-progress-list'),
  btnRefreshDigest: document.getElementById('btn-refresh-digest'),
  btnExportDigest: document.getElementById('btn-export-digest'),
  btnClearDigest: document.getElementById('btn-clear-digest'),
  struggledWordsTbody: document.getElementById('struggled-words-tbody'),
  simplifiedSentencesList: document.getElementById('simplified-sentences-list'),
  // System overlays
  toastContainer: document.getElementById('toast-container'),
  confirmOverlay: document.getElementById('confirm-overlay'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmOk: document.getElementById('confirm-ok'),
  confirmCancel: document.getElementById('confirm-cancel'),
  // Provider badge & AI status
  providerPill: document.getElementById('provider-pill'),
  aiStatusBadge: document.getElementById('ai-status-badge'),
  // Header actions
  btnPlans: document.getElementById('btn-plans'),
  // Modals
  vocabModal: document.getElementById('vocab-modal'),
  vocabWordList: document.getElementById('vocab-word-list'),
  vocabSkipBtn: document.getElementById('vocab-skip-btn'),
  vocabStartBtn: document.getElementById('vocab-start-btn'),
  comprehensionModal: document.getElementById('comprehension-modal'),
  comprehensionBody: document.getElementById('comprehension-body'),
  comprehensionCloseBtn: document.getElementById('comprehension-close-btn'),
  comprehensionAnswerCount: document.getElementById('comprehension-answer-count'),
  comprehensionDoneBtn: document.getElementById('comprehension-done-btn'),
  glossaryModal: document.getElementById('glossary-modal'),
  glossaryBody: document.getElementById('glossary-body'),
  glossaryClearBtn: document.getElementById('glossary-clear-btn'),
  glossaryCloseBtn: document.getElementById('glossary-close-btn'),
  // Onboarding wizard
  onboardingModal: document.getElementById('onboarding-modal'),
  onboardStep1: document.getElementById('onboard-step-1'),
  onboardStep2: document.getElementById('onboard-step-2'),
  onboardStep3: document.getElementById('onboard-step-3'),
  onboardNext1: document.getElementById('onboard-next-1'),
  onboardNext2: document.getElementById('onboard-next-2'),
  onboardFinish: document.getElementById('onboard-finish'),
  btnSkipOnboard: document.getElementById('btn-skip-onboard'),
  // Quick presets
  presetDyslexia: document.getElementById('preset-dyslexia'),
  presetFocus: document.getElementById('preset-focus'),
  presetPhonics: document.getElementById('preset-phonics'),
  presetReset: document.getElementById('preset-reset'),
  // Session history
  sessionHistorySection: document.getElementById('session-history-section'),
  sessionHistoryList: document.getElementById('session-history-list'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  // Shortcut help
  shortcutHelpModal: document.getElementById('shortcut-help-modal'),
  shortcutCloseBtn: document.getElementById('shortcut-close-btn'),
  btnShortcutHelp: document.getElementById('btn-shortcut-help'),
  // Text stats
  textStatsRow: document.getElementById('text-stats-row'),
  wordCountDisplay: document.getElementById('word-count-display'),
  textDifficultyBadge: document.getElementById('text-difficulty-badge'),
  readingTimeBadge: document.getElementById('reading-time-badge'),
};

let lastSimplifiedParagraphIdx = -1;
let authMode = 'signin';

/* ==================== NOTIFICATION HELPERS ==================== */
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
  doc.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

function showConfirm(message, onConfirm) {
  doc.confirmMessage.textContent = message;
  doc.confirmOverlay.style.display = 'flex';
  const cleanup = () => { doc.confirmOverlay.style.display = 'none'; };
  const handleOk = () => { cleanup(); onConfirm(); doc.confirmOk.removeEventListener('click', handleOk); doc.confirmCancel.removeEventListener('click', handleCancel); };
  const handleCancel = () => { cleanup(); doc.confirmOk.removeEventListener('click', handleOk); doc.confirmCancel.removeEventListener('click', handleCancel); };
  doc.confirmOk.addEventListener('click', handleOk);
  doc.confirmCancel.addEventListener('click', handleCancel);
}

/* ==================== INITIALIZATION ==================== */
document.addEventListener('DOMContentLoaded', () => {
  initUIPreferences();
  initVoiceList();
  initEventListeners();
  initKeyboardNav();
  loadGlossaryFromStorage();
  renderSessionHistory();
  updateProviderBadge();
  updateAIStatusBadge();
  // Restore language bridge preference
  appState.bridgeLang = localStorage.getItem('readem_bridge_lang') || '';
  if (appState.bridgeLang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === appState.bridgeLang);
    });
  }

  Auth.onAuthChange(async (user) => {
    if (user) {
      const role = await Auth.getUserRole(user.uid);
      setTrackerUser(user.uid);
      switchRole(role === 'teacher' ? 'teacher' : 'reader');
    } else {
      setTrackerUser(null);
      showLandingPortal();
    }
  });
});

function initUIPreferences() {
  doc.fontSizeVal.textContent = `${doc.fontSize.value}px`;
  doc.lineHeightVal.textContent = doc.lineHeight.value;
  doc.letterSpacingVal.textContent = `${doc.letterSpacing.value}em`;
  doc.wordSpacingVal.textContent = `${doc.wordSpacing.value}em`;
  doc.voiceSpeedVal.textContent = `${doc.voiceSpeed.value}x`;
  applyTypographyStyles();
}

function initVoiceList() {
  TTS.initVoices((voices) => {
    doc.voiceSelect.innerHTML = voices.map(v =>
      `<option value="${v.value || v.name}" ${v.default ? 'selected' : ''}>${v.name} (${v.lang})</option>`
    ).join('');
    if (voices.length > 0 && !doc.voiceSelect.value) {
      doc.voiceSelect.value = voices[0].value || voices[0].name;
    }
  });
}

function initEventListeners() {
  // Auth
  doc.tabSignIn.addEventListener('click', () => setAuthMode('signin'));
  doc.tabSignUp.addEventListener('click', () => setAuthMode('signup'));
  doc.btnAuthSubmit.addEventListener('click', () => handleAuthSubmit());
  doc.authPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAuthSubmit(); });
  doc.btnLogout.addEventListener('click', logOut);

  // Layout toggles
  doc.btnViewReflowed.addEventListener('click', () => switchLayoutView('reflowed'));
  doc.btnViewPdf.addEventListener('click', () => switchLayoutView('pdf'));

  // Typography
  doc.fontFamily.addEventListener('change', () => {
    applyTypographyStyles();
    applyContentOverlays();
  });
  doc.fontSize.addEventListener('input', (e) => { doc.fontSizeVal.textContent = `${e.target.value}px`; applyTypographyStyles(); });
  doc.lineHeight.addEventListener('input', (e) => { doc.lineHeightVal.textContent = e.target.value; applyTypographyStyles(); });
  doc.letterSpacing.addEventListener('input', (e) => { doc.letterSpacingVal.textContent = `${e.target.value}em`; applyTypographyStyles(); });
  doc.wordSpacing.addEventListener('input', (e) => { doc.wordSpacingVal.textContent = `${e.target.value}em`; applyTypographyStyles(); });

  // Theme swatches
  doc.themeSwatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      doc.themeSwatches.forEach(s => s.classList.remove('active'));
      e.target.classList.add('active');
      document.body.className = '';
      document.body.classList.add(e.target.getAttribute('data-theme'));
    });
  });

  // Ruler
  doc.toggleRuler.addEventListener('change', (e) => {
    appState.rulerActive = e.target.checked;
    doc.rulerControls.style.display = e.target.checked ? 'block' : 'none';
    doc.readerRuler.style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) doc.readerRuler.style.height = `${doc.rulerHeight.value}px`;
  });
  doc.rulerHeight.addEventListener('input', (e) => {
    doc.rulerHeightVal.textContent = `${e.target.value}px`;
    if (appState.rulerActive) doc.readerRuler.style.height = `${e.target.value}px`;
  });

  // Visual Aid toggles
  doc.toggleChunking.addEventListener('change', (e) => {
    doc.readerContent.classList.toggle('show-chunking', e.target.checked);
  });
  doc.toggleLineFocus.addEventListener('change', (e) => {
    doc.readerContent.classList.toggle('line-focus-active', e.target.checked);
  });

  // Unified overlay toggles
  doc.toggleBionic.addEventListener('change', (e) => {
    appState.overlays.bionic = e.target.checked;
    doc.bionicRatioRow.style.display = e.target.checked ? 'block' : 'none';
    applyContentOverlays();
  });
  doc.bionicRatioSlider.addEventListener('input', (e) => {
    doc.bionicRatioValue.textContent = `${e.target.value}%`;
    appState.overlays.bionicRatio = parseInt(e.target.value) / 100;
    if (appState.overlays.bionic) applyContentOverlays();
  });
  doc.toggleSyllable.addEventListener('change', (e) => {
    appState.overlays.syllable = e.target.checked;
    applyContentOverlays();
  });
  doc.togglePhonicsVowels.addEventListener('change', (e) => {
    appState.overlays.phonicsVowels = e.target.checked;
    applyContentOverlays();
  });
  doc.togglePhonicsDigraphs.addEventListener('change', (e) => {
    appState.overlays.phonicsDigraphs = e.target.checked;
    applyContentOverlays();
  });
  doc.toggleMorpheme.addEventListener('change', (e) => {
    appState.overlays.morpheme = e.target.checked;
    applyContentOverlays();
  });

  // Irlen overlay
  doc.toggleIrlen.addEventListener('change', (e) => {
    doc.irlenControls.style.display = e.target.checked ? 'block' : 'none';
    doc.irlenOverlay.style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) updateIrlenOverlay();
  });
  doc.irlenColor.addEventListener('input', updateIrlenOverlay);
  doc.irlenOpacity.addEventListener('input', (e) => {
    doc.irlenOpacityValue.textContent = `${e.target.value}%`;
    updateIrlenOverlay();
  });

  // Reading flow
  doc.toggleFocusMode.addEventListener('change', (e) => {
    appState.focusMode = e.target.checked;
    doc.readerWorkspace.classList.toggle('focus-mode-active', e.target.checked);
  });
  doc.toggleProgressive.addEventListener('change', (e) => {
    appState.progressiveReveal = e.target.checked;
    if (appState.parsedData) {
      if (e.target.checked) initProgressiveReveal();
      else endProgressiveReveal();
    }
  });
  doc.autopauseSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    doc.autopauseValue.textContent = val === 0 ? 'Off' : `${val}s`;
  });

  // Scroll — save position & update progress bar
  doc.scrollContainer.addEventListener('scroll', () => {
    appState.savedScrollTop = doc.scrollContainer.scrollTop;
    updateProgressFromScroll();
  });

  // Ruler follow cursor
  doc.scrollContainer.addEventListener('mousemove', (e) => {
    if (!appState.rulerActive) return;
    const rect = doc.scrollContainer.getBoundingClientRect();
    const relativeY = e.clientY - rect.top + doc.scrollContainer.scrollTop;
    const rulerH = parseInt(doc.rulerHeight.value);
    doc.readerRuler.style.top = `${relativeY - (rulerH / 2)}px`;
  });

  // Demo dropdown
  doc.demoSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (DEMO_MATERIALS[key]) {
      const material = DEMO_MATERIALS[key];
      doc.textInput.value = material.text;
      appState.subject = material.subject;
      doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${material.subject}`;
      appState.pdfDoc = null;
      doc.btnViewPdf.disabled = true;
      switchLayoutView('reflowed');
    }
  });

  // File ingestion
  doc.btnBrowseFile.addEventListener('click', () => doc.fileInput.click());
  doc.dropzone.addEventListener('dragover', (e) => { e.preventDefault(); doc.dropzone.classList.add('dragover'); });
  doc.dropzone.addEventListener('dragleave', () => doc.dropzone.classList.remove('dragover'));
  doc.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    doc.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleIngestedFile(e.dataTransfer.files[0]);
  });
  doc.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleIngestedFile(e.target.files[0]);
  });

  doc.btnLoadText.addEventListener('click', () => {
    const text = doc.textInput.value.trim();
    if (!text) { showToast('Please paste some text, load a demo, or drag a document to adapt.', 'info'); return; }
    beginReadingSession(text);
  });

  // Back button
  doc.btnBackUpload.addEventListener('click', async () => {
    await endReadingSession(true);
    TTS.stop();
    resetSpeechButtons();
    doc.panelReader.style.display = 'none';
    doc.panelUpload.style.display = 'block';
    doc.readerWorkspace.classList.add('show-upload');
    appState.savedScrollTop = 0;
    appState.pdfDoc = null;
    appState.subject = 'General';
    doc.subjectBadge.innerHTML = '<i class="fa-solid fa-tag"></i> General';
    doc.btnViewPdf.disabled = true;
    doc.pdfCanvasContainer.innerHTML = '';
    doc.btnCheckUnderstanding.style.display = 'none';
    doc.progressWrapper.style.display = 'none';
    endProgressiveReveal();
    switchLayoutView('reflowed');
  });

  // TTS controls
  doc.btnPlay.addEventListener('click', handleSpeechPlay);
  doc.btnPause.addEventListener('click', handleSpeechPause);
  doc.btnStop.addEventListener('click', handleSpeechStop);
  doc.voiceSpeed.addEventListener('input', (e) => {
    doc.voiceSpeedVal.textContent = `${e.target.value}x`;
    Tracker.logReadingSpeed(e.target.value);
    updateReadingTimeEstimate();
    if (appState.isPlaying && !appState.isPaused) handleSpeechPlay(appState.activeWordIdx);
  });

  // Word clicks in reader
  doc.readerContent.addEventListener('click', (e) => {
    const target = e.target.closest('.word');
    if (target) {
      const wordText = target.getAttribute('data-clean-word');
      speakSingleWord(wordText);
      openWordDecoder(wordText);
      Tracker.logWordDifficulty(wordText, appState.subject, 'click');
    }
    const simplifyBtn = e.target.closest('.para-action-btn');
    if (simplifyBtn) {
      const paraIdx = parseInt(simplifyBtn.getAttribute('data-para-idx'));
      const paragraphs = doc.readerContent.querySelectorAll('.reader-para');
      if (paragraphs[paraIdx]) {
        const paraText = Array.from(paragraphs[paraIdx].querySelectorAll('.word')).map(el => el.getAttribute('data-clean-word')).join(' ');
        openTextSimplifier(paraText, paraIdx);
      }
    }
  });

  // Highlight selection simplify
  doc.readerContent.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText.length > 5) {
      const anchorNode = selection.anchorNode;
      if (anchorNode) {
        const paraEl = anchorNode.parentElement.closest('.reader-para');
        if (paraEl && doc.readerContent.contains(paraEl)) {
          const paraIdx = parseInt(paraEl.getAttribute('data-para-idx'));
          openTextSimplifier(selectedText, paraIdx);
        }
      }
    }
  });

  // AI panel buttons
  doc.btnSpeakTarget.addEventListener('click', () => {
    if (doc.targetWord.textContent) speakSingleWord(doc.targetWord.textContent);
  });
  doc.btnSaveGlossary.addEventListener('click', () => saveCurrentWordToGlossary());
  doc.btnReplaceOriginal.addEventListener('click', () => {
    if (lastSimplifiedParagraphIdx !== -1 && doc.simplifiedResult.textContent) {
      replaceParagraphWithSimplified(lastSimplifiedParagraphIdx, doc.simplifiedResult.textContent);
    }
  });

  // Comprehension check
  doc.btnCheckUnderstanding.addEventListener('click', openComprehensionCheck);

  // Glossary modal
  doc.btnGlossary.addEventListener('click', () => renderGlossaryModal());
  doc.glossaryCloseBtn.addEventListener('click', () => { doc.glossaryModal.style.display = 'none'; });
  doc.glossaryClearBtn.addEventListener('click', () => {
    showConfirm('Clear your entire word glossary? This cannot be undone.', () => {
      localStorage.removeItem('readem_word_glossary');
      appState.lastDecodedWordData = null;
      showToast('Glossary cleared.', 'success');
      doc.glossaryModal.style.display = 'none';
    });
  });

  // Vocab modal
  doc.vocabSkipBtn.addEventListener('click', () => {
    doc.vocabModal.style.display = 'none';
    if (appState.pendingPreteachText) {
      loadTextIntoReader(appState.pendingPreteachText);
      appState.pendingPreteachText = null;
    }
  });
  doc.vocabStartBtn.addEventListener('click', () => {
    doc.vocabModal.style.display = 'none';
    if (appState.pendingPreteachText) {
      loadTextIntoReader(appState.pendingPreteachText);
      appState.pendingPreteachText = null;
    }
  });

  // Comprehension modal
  doc.comprehensionCloseBtn.addEventListener('click', () => { doc.comprehensionModal.style.display = 'none'; });

  // Text input → live stats
  doc.textInput.addEventListener('input', () => {
    const text = doc.textInput.value.trim();
    if (text) {
      doc.textStatsRow.style.display = 'flex';
      updateTextStats(text);
    } else {
      doc.textStatsRow.style.display = 'none';
    }
  });

  // Quick presets
  doc.presetDyslexia.addEventListener('click', () => applyPreset('dyslexia'));
  doc.presetFocus.addEventListener('click', () => applyPreset('focus'));
  doc.presetPhonics.addEventListener('click', () => applyPreset('phonics'));
  doc.presetReset.addEventListener('click', () => applyPreset('reset'));

  // Session history — delegated click on reload buttons
  doc.sessionHistoryList.addEventListener('click', (e) => {
    const btn = e.target.closest('.session-reload-btn');
    if (btn) {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const sessions = JSON.parse(localStorage.getItem('readem_session_history') || '[]');
      if (sessions[idx]) {
        doc.textInput.value = sessions[idx].fullText;
        appState.subject = sessions[idx].subject;
        doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${sessions[idx].subject}`;
        doc.textStatsRow.style.display = 'flex';
        updateTextStats(sessions[idx].fullText);
        showToast('Previous session reloaded.', 'success');
      }
    }
  });
  doc.btnClearHistory.addEventListener('click', () => {
    showConfirm('Clear your session history?', () => {
      localStorage.removeItem('readem_session_history');
      doc.sessionHistorySection.style.display = 'none';
      showToast('Session history cleared.', 'success');
    });
  });

  // Onboarding wizard
  doc.btnSkipOnboard.addEventListener('click', () => {
    localStorage.setItem('readem_onboarded', '1');
    doc.onboardingModal.style.display = 'none';
  });
  doc.onboardNext1.addEventListener('click', () => {
    doc.onboardStep1.style.display = 'none';
    doc.onboardStep2.style.display = 'flex';
  });
  doc.onboardNext2.addEventListener('click', () => {
    doc.onboardStep2.style.display = 'none';
    doc.onboardStep3.style.display = 'flex';
  });
  doc.onboardFinish.addEventListener('click', () => {
    applyOnboardingSettings();
    localStorage.setItem('readem_onboarded', '1');
    doc.onboardingModal.style.display = 'none';
    showToast('Settings applied. Happy reading!', 'success');
  });
  document.querySelectorAll('.font-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.font-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.subject-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.subject-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.difficulty-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Shortcut help modal
  doc.btnShortcutHelp.addEventListener('click', () => { doc.shortcutHelpModal.style.display = 'flex'; });
  doc.shortcutCloseBtn.addEventListener('click', () => { doc.shortcutHelpModal.style.display = 'none'; });

  // Plans modal
  doc.btnPlans.addEventListener('click', () => { doc.plansModal.style.display = 'flex'; });
  doc.plansCloseBtn.addEventListener('click', () => { doc.plansModal.style.display = 'none'; });

  // Session summary modal
  doc.sessionSummaryCloseBtn.addEventListener('click', () => { doc.sessionSummaryModal.style.display = 'none'; });

  // Oral fluency assessment
  doc.btnStartAssess.addEventListener('click', startOralAssessment);
  doc.btnStopAssess.addEventListener('click', stopOralAssessment);

  // Language bridge — delegate clicks on all .lang-btn elements
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (btn) setLanguageBridge(btn.getAttribute('data-lang') || '');
  });

  // Comprehension done button
  doc.comprehensionDoneBtn.addEventListener('click', () => {
    const sessionId = doc.comprehensionDoneBtn.getAttribute('data-session-id') || appState.sessionId;
    const total = parseInt(doc.comprehensionDoneBtn.getAttribute('data-total') || '0');
    const answered = doc.comprehensionBody.querySelectorAll('.comprehension-answer-btn.answered').length;
    Tracker.logComprehensionCompleted(sessionId, appState.subject, answered, total);
    doc.comprehensionModal.style.display = 'none';
    showToast('Great work checking your understanding!', 'success');
  });

  // Teacher dashboard
  doc.btnRefreshDigest.addEventListener('click', refreshTeacherDigest);
  doc.btnClearDigest.addEventListener('click', () => {
    showConfirm('Reset all logged telemetry? This cannot be undone.', async () => {
      await Tracker.clearLogs();
      refreshTeacherDigest();
      showToast('All telemetry cleared.', 'success');
    });
  });
  doc.btnExportDigest.addEventListener('click', async () => {
    const reportText = await Tracker.exportDigestReport();
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ReadEm_Weekly_Literacy_Digest_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  });
}

/* ==================== WORKSPACE NAVIGATION ==================== */
function switchRole(role) {
  doc.viewLandingPortal.classList.remove('active');
  doc.readerWorkspace.classList.remove('active');
  doc.teacherWorkspace.classList.remove('active');
  doc.btnLogout.style.display = 'block';
  if (role === 'reader') {
    doc.readerWorkspace.classList.add('active');
    appState.role = 'reader';
    checkOnboarding();
    checkFirstLogin();
    doc.btnPlans.style.display = 'inline-flex';
  } else if (role === 'teacher') {
    doc.teacherWorkspace.classList.add('active');
    appState.role = 'teacher';
    refreshTeacherDigest();
  }
}

function setAuthMode(mode) {
  authMode = mode;
  doc.tabSignIn.classList.toggle('active', mode === 'signin');
  doc.tabSignUp.classList.toggle('active', mode === 'signup');
  doc.authRoleField.style.display = mode === 'signup' ? 'block' : 'none';
  doc.btnAuthSubmit.textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
  doc.authError.style.display = 'none';
}

async function handleAuthSubmit() {
  const email = doc.authEmail.value.trim();
  const password = doc.authPassword.value;
  if (!email || !password) { showAuthError('Please enter both an email and password.'); return; }
  doc.btnAuthSubmit.disabled = true;
  doc.authError.style.display = 'none';
  try {
    if (authMode === 'signup') {
      await Auth.signUp(email, password, doc.authRoleSelect.value);
    } else {
      await Auth.signIn(email, password);
    }
    doc.authPassword.value = '';
  } catch (err) {
    showAuthError(describeAuthError(err));
  } finally {
    doc.btnAuthSubmit.disabled = false;
  }
}

function showAuthError(message) {
  doc.authError.textContent = message;
  doc.authError.style.display = 'block';
}

function describeAuthError(err) {
  const code = err && err.code;
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists. Try signing in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Incorrect email or password.';
  if (code === 'auth/user-not-found') return 'No account found with this email. Try signing up instead.';
  if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  return err.message || 'Authentication failed. Please try again.';
}

function showLandingPortal() {
  doc.readerWorkspace.classList.remove('active');
  doc.teacherWorkspace.classList.remove('active');
  doc.btnLogout.style.display = 'none';
  doc.btnPlans.style.display = 'none';
  doc.viewLandingPortal.classList.add('active');
  appState.role = null;
}

function logOut() {
  Auth.signOut();
}

function switchLayoutView(view) {
  doc.btnViewReflowed.classList.remove('active');
  doc.btnViewPdf.classList.remove('active');
  if (view === 'reflowed') {
    doc.btnViewReflowed.classList.add('active');
    doc.readerContent.style.display = 'block';
    doc.pdfCanvasContainer.style.display = 'none';
    if (appState.rulerActive) doc.readerRuler.style.display = 'block';
  } else if (view === 'pdf') {
    doc.btnViewPdf.classList.add('active');
    doc.readerContent.style.display = 'none';
    doc.pdfCanvasContainer.style.display = 'flex';
    doc.readerRuler.style.display = 'none';
    if (appState.pdfDoc) renderPDFCanvasPages(appState.pdfDoc);
  }
}

async function renderPDFCanvasPages(pdf) {
  doc.pdfCanvasContainer.innerHTML = '<span style="color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Rendering original PDF pages...</span>';
  try {
    doc.pdfCanvasContainer.innerHTML = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-card';
      doc.pdfCanvasContainer.appendChild(canvas);
      const context = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    }
  } catch (err) {
    console.error('PDF rendering failed:', err);
    doc.pdfCanvasContainer.innerHTML = `<span style="color:var(--color-danger)">Failed to render PDF: ${err.message}</span>`;
  }
}

/* ==================== DOCUMENT INGESTION ==================== */
async function handleIngestedFile(file) {
  const oldText = doc.dropzone.innerHTML;
  doc.dropzone.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin dropzone-icon"></i><p>Ingesting <strong>${file.name}</strong>...</p><span>Extracting content</span>`;
  try {
    let rawContent = '';
    const name = file.name.toLowerCase();
    if (name.includes('math') || name.includes('psle-math')) appState.subject = 'Mathematics';
    else if (name.includes('sci') || name.includes('bio') || name.includes('psle-sci')) appState.subject = 'Science';
    else if (name.includes('hist') || name.includes('roman')) appState.subject = 'History';
    else if (name.includes('lit') || name.includes('english') || name.includes('psle-eng')) appState.subject = 'Literature';
    else appState.subject = 'General';
    doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${appState.subject}`;

    if (file.name.endsWith('.pdf')) {
      rawContent = await extractTextFromPDF(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          appState.pdfDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
          doc.btnViewPdf.disabled = false;
        } catch (err) { console.error('PDF doc load failed:', err); }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.txt')) {
      appState.pdfDoc = null;
      doc.btnViewPdf.disabled = true;
      rawContent = await readTextFile(file);
    } else if (file.type.startsWith('image/')) {
      appState.pdfDoc = null;
      doc.btnViewPdf.disabled = true;
      if (!AIService.hasKeys()) throw new Error('An OpenAI API Key is required for image OCR. Add your key in settings.');
      rawContent = await AIService.transcribeImage(file);
    } else {
      throw new Error('Unsupported format. Please upload PDF, TXT or an image.');
    }
    doc.textInput.value = rawContent;
    beginReadingSession(rawContent);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    doc.dropzone.innerHTML = oldText;
  }
}

// Entry point: show vocab pre-teaching modal, then load reader
async function beginReadingSession(text) {
  // Auto-detect subject when user didn't select one via demo dropdown or filename
  if (appState.subject === 'General') {
    try {
      const detected = await AIService.detectSubject(text);
      if (detected !== 'General') {
        appState.subject = detected;
        doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${detected}`;
      }
    } catch (e) { /* keep General */ }
  }

  saveSessionToHistory(text, appState.subject);
  appState.pendingPreteachText = text;
  doc.vocabModal.style.display = 'flex';
  doc.vocabWordList.innerHTML = '<div class="vocab-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Preparing your reading...</div>';

  // Run passage summary and vocab extraction in parallel
  const [summaryResult, vocabResult] = await Promise.allSettled([
    generatePassageSummary(text),
    AIService.extractVocabWords(text, appState.subject, 6),
  ]);

  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
  const vocabWords = vocabResult.status === 'fulfilled' ? vocabResult.value : [];

  const summaryHTML = summary
    ? `<div class="passage-summary-box">
        <label><i class="fa-solid fa-book-open"></i> What this passage is about</label>
        <p class="passage-summary-text">${summary}</p>
       </div>`
    : '';

  const vocabHTML = vocabWords.length === 0
    ? '<div class="vocab-empty">No complex vocabulary found — this passage uses everyday language.</div>'
    : vocabWords.map(v => `
        <div class="vocab-word-item">
          <div class="vocab-word-heading"><h4>${v.word}</h4></div>
          <div class="vocab-syllable-chips">${(v.syllables || []).map(s => `<span>${s}</span>`).join('')}</div>
          <div class="vocab-phonetics">${v.phonetics || ''}</div>
          <div class="vocab-definition">${v.definition || ''}</div>
        </div>
      `).join('');

  const vocabSectionLabel = vocabWords.length > 0
    ? '<div class="vocab-section-label"><i class="fa-solid fa-spell-check"></i> Key words to know before reading</div>'
    : '';

  doc.vocabWordList.innerHTML = summaryHTML + vocabSectionLabel + vocabHTML;
}

async function generatePassageSummary(text) {
  try {
    const simplified = await AIService.simplifyParagraph(text.slice(0, 1200), appState.subject);
    const sentences = simplified.match(/[^.!?]+[.!?]+/g) || [];
    const twoSentences = sentences.slice(0, 2).join(' ').trim();
    return twoSentences || simplified.slice(0, 200).trim();
  } catch (e) {
    // Offline: return first sentence of original text
    const first = (text.match(/[^.!?]+[.!?]+/) || [])[0];
    return first ? first.trim() : null;
  }
}

function loadTextIntoReader(text) {
  appState.rawText = text;
  appState.parsedData = TTS.parseText(text);
  doc.readerContent.innerHTML = appState.parsedData.html;
  doc.readerSubject.textContent = appState.subject;

  // Reset all overlay toggles & states
  doc.toggleChunking.checked = false;
  doc.toggleLineFocus.checked = false;
  doc.toggleBionic.checked = false;
  doc.toggleSyllable.checked = false;
  doc.togglePhonicsVowels.checked = false;
  doc.togglePhonicsDigraphs.checked = false;
  doc.toggleMorpheme.checked = false;
  doc.bionicRatioRow.style.display = 'none';
  doc.readerContent.className = 'font-lexend';
  appState.overlays = { syllable: false, phonicsVowels: false, phonicsDigraphs: false, morpheme: false, bionic: false, bionicRatio: 0.45 };
  appState.progressiveReveal = false;
  doc.toggleProgressive.checked = false;

  doc.panelUpload.style.display = 'none';
  doc.panelReader.style.display = 'block';
  doc.readerWorkspace.classList.remove('show-upload');

  // Show progress bar with reading time estimate
  doc.progressWrapper.style.display = 'flex';
  updateReadingTimeEstimate();

  // Show comprehension button
  doc.btnCheckUnderstanding.style.display = 'inline-flex';

  requestAnimationFrame(() => {
    doc.scrollContainer.scrollTop = appState.savedScrollTop || 0;
  });

  doc.aiDictContent.style.display = 'none';
  doc.aiDictEmpty.style.display = 'block';
  doc.aiSimplifierContent.style.display = 'none';
  doc.aiSimplifierEmpty.style.display = 'block';
  doc.fluencyResult.style.display = 'none';
  doc.wordTranslation.style.display = 'none';

  startReadingSession();

  // Non-blocking: pre-flag hard words using Huawei NLP after render
  preflightHardWords(text);
  colorParagraphsByDifficulty();
}

/* ==================== PHONICS / OVERLAY RENDERING ==================== */

function syllabifyWord(word) {
  if (word.length <= 3) return word;
  const VOWELS = 'aeiouyAEIOUY';
  const isVowel = c => VOWELS.includes(c);
  const dots = new Set();
  let i = 0;

  while (i < word.length) {
    while (i < word.length && !isVowel(word[i])) i++;
    if (i >= word.length) break;
    while (i < word.length && isVowel(word[i])) i++;
    const cStart = i;
    while (i < word.length && !isVowel(word[i])) i++;
    const cEnd = i;
    if (i >= word.length) break;
    const n = cEnd - cStart;
    if (n === 0) continue;
    dots.add(n === 1 ? cStart : cStart + 1);
  }

  let result = '';
  for (let j = 0; j < word.length; j++) {
    if (dots.has(j)) result += '·';
    result += word[j];
  }
  return result;
}

function buildWordInnerHTML(cleanWord, overlays) {
  const { syllable, phonicsVowels, phonicsDigraphs, morpheme, bionic, bionicRatio } = overlays;
  if (!syllable && !phonicsVowels && !phonicsDigraphs && !morpheme && !bionic) return cleanWord;

  const lower = cleanWord.toLowerCase();
  const len = cleanWord.length;

  // Syllable dot positions (in cleanWord index space)
  const syllablePositions = new Set();
  if (syllable) {
    const syl = syllabifyWord(cleanWord);
    let cp = 0;
    for (let j = 0; j < syl.length; j++) {
      if (syl[j] === '·') syllablePositions.add(cp);
      else cp++;
    }
  }

  // Morpheme boundaries
  let prefixEnd = 0, suffixStart = len;
  if (morpheme) {
    for (const p of PREFIX_TABLE) {
      if (lower.startsWith(p) && len > p.length + 2 && p.length > prefixEnd) prefixEnd = p.length;
    }
    for (const s of SUFFIX_TABLE) {
      if (lower.endsWith(s) && len > s.length + 2) {
        const c = len - s.length;
        if (c > prefixEnd && c < suffixStart) suffixStart = c;
      }
    }
  }

  const bionicSplit = bionic ? Math.max(1, Math.ceil(len * (bionicRatio || 0.45))) : -1;

  let html = '';
  let i = 0;

  while (i < len) {
    if (syllablePositions.has(i)) html += '<span class="syl-dot">·</span>';

    const pair = i + 1 < len ? lower[i] + lower[i + 1] : '';
    const isConsonantDigraph = phonicsDigraphs && DIGRAPH_SET.has(pair);
    const isVowelDigraph = phonicsVowels && VOWEL_DIGRAPH_SET.has(pair);
    const charCount = (isConsonantDigraph || isVowelDigraph) ? 2 : 1;
    const chars = cleanWord.slice(i, i + charCount);

    const classes = [];
    if (bionic && i < bionicSplit) classes.push('bionic-bold');
    if (isConsonantDigraph) classes.push('phonics-digraph');
    else if (isVowelDigraph) classes.push('phonics-vowel-digraph');
    else if (phonicsVowels && SIMPLE_VOWELS.has(lower[i])) classes.push('phonics-vowel');

    if (morpheme) {
      if (prefixEnd > 0 && i < prefixEnd) classes.push('morpheme-prefix');
      else if (suffixStart < len && i >= suffixStart) classes.push('morpheme-suffix');
      else if (prefixEnd > 0 || suffixStart < len) classes.push('morpheme-root');
    }

    if (classes.length > 0) {
      const tag = classes.includes('bionic-bold') ? 'strong' : 'span';
      html += `<${tag} class="${classes.join(' ')}">${chars}</${tag}>`;
    } else {
      html += chars;
    }
    i += charCount;
  }
  return html;
}

function applyContentOverlays() {
  if (!appState.parsedData) return;
  const words = doc.readerContent.querySelectorAll('.word');
  words.forEach(span => {
    const clean = span.getAttribute('data-clean-word');
    if (clean) span.innerHTML = buildWordInnerHTML(clean, appState.overlays);
  });
}

/* ==================== IRLEN OVERLAY ==================== */
function updateIrlenOverlay() {
  const hex = doc.irlenColor.value;
  const opacity = parseInt(doc.irlenOpacity.value) / 100;
  doc.irlenOpacityValue.textContent = `${doc.irlenOpacity.value}%`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  doc.irlenOverlay.style.backgroundColor = `rgba(${r},${g},${b},${opacity})`;
}

/* ==================== READING PROGRESS ==================== */
function updateReadingTimeEstimate() {
  if (!appState.parsedData) return;
  const wordCount = appState.parsedData.ranges.length;
  const speed = parseFloat(doc.voiceSpeed.value);
  const wpm = Math.round(200 * speed);
  const minutes = Math.ceil(wordCount / wpm);
  doc.progressTime.innerHTML = `<i class="fa-regular fa-clock"></i> ~${minutes} min read`;
}

function updateProgressFromScroll() {
  const el = doc.scrollContainer;
  const scrollable = el.scrollHeight - el.clientHeight;
  if (scrollable <= 0) return;
  const pct = Math.round((el.scrollTop / scrollable) * 100);
  doc.progressFill.style.width = `${pct}%`;
}

function updateProgressFromWord(wordIdx) {
  if (!appState.parsedData) return;
  const total = appState.parsedData.ranges.length;
  if (total <= 0) return;
  const pct = Math.round((wordIdx / total) * 100);
  doc.progressFill.style.width = `${pct}%`;
}

/* ==================== TYPOGRAPHY STYLES ==================== */
function applyTypographyStyles() {
  document.documentElement.style.setProperty('--user-font-size', `${doc.fontSize.value}px`);
  document.documentElement.style.setProperty('--user-line-height', doc.lineHeight.value);
  document.documentElement.style.setProperty('--user-letter-spacing', `${doc.letterSpacing.value}em`);
  document.documentElement.style.setProperty('--user-word-spacing', `${doc.wordSpacing.value}em`);
  doc.readerContent.classList.remove('font-lexend', 'font-opendyslexic', 'font-inter', 'font-system');
  doc.readerContent.classList.add(doc.fontFamily.value);
}

/* ==================== PROGRESSIVE REVEAL ==================== */
function initProgressiveReveal() {
  const paras = doc.readerContent.querySelectorAll('.reader-para');
  if (paras.length === 0) return;
  appState.progressiveIdx = 0;
  paras.forEach((p, idx) => {
    p.classList.remove('para-current', 'para-hidden');
    if (idx > 0) p.classList.add('para-hidden');
    else p.classList.add('para-current');
    // Remove any existing self-assess rows
    const old = p.nextElementSibling;
    if (old && old.classList.contains('self-assess-row')) old.remove();
  });
  showProgressiveNextBar(paras.length > 1);
}

function endProgressiveReveal() {
  const paras = doc.readerContent.querySelectorAll('.reader-para');
  paras.forEach(p => p.classList.remove('para-hidden', 'para-current'));
  const bar = doc.readerContent.querySelector('.progressive-next-bar');
  if (bar) bar.remove();
  const rows = doc.readerContent.querySelectorAll('.self-assess-row');
  rows.forEach(r => r.remove());
}

function showProgressiveNextBar(hasMore) {
  const existing = doc.readerContent.querySelector('.progressive-next-bar');
  if (existing) existing.remove();
  if (!hasMore) return;
  const bar = document.createElement('div');
  bar.className = 'progressive-next-bar';
  bar.innerHTML = '<button class="progressive-next-btn"><i class="fa-solid fa-arrow-down"></i> Next Paragraph</button>';
  bar.querySelector('button').addEventListener('click', progressiveNextParagraph);
  doc.readerContent.appendChild(bar);
}

function progressiveNextParagraph() {
  const paras = doc.readerContent.querySelectorAll('.reader-para');
  const currentPara = paras[appState.progressiveIdx];

  // Show self-assessment on current paragraph
  showSelfAssessment(currentPara, appState.progressiveIdx);

  appState.progressiveIdx++;
  if (appState.progressiveIdx < paras.length) {
    currentPara.classList.remove('para-current');
    const next = paras[appState.progressiveIdx];
    next.classList.remove('para-hidden');
    next.classList.add('para-current');
    next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showProgressiveNextBar(appState.progressiveIdx < paras.length - 1);
  } else {
    currentPara.classList.remove('para-current');
    showProgressiveNextBar(false);
    showToast('You have finished reading! Check your understanding below.', 'success');
  }
}

function showSelfAssessment(paraEl, paraIdx) {
  const existing = paraEl.nextElementSibling;
  if (existing && existing.classList.contains('self-assess-row')) return;

  const row = document.createElement('div');
  row.className = 'self-assess-row';
  row.innerHTML = `
    <span>How did this paragraph feel?</span>
    <button class="assess-btn assess-got-it" data-rating="got-it" data-para="${paraIdx}">✓ Got it</button>
    <button class="assess-btn assess-sort-of" data-rating="sort-of" data-para="${paraIdx}">~ Sort of</button>
    <button class="assess-btn assess-lost-me" data-rating="lost-me" data-para="${paraIdx}">✕ Lost me</button>
  `;
  row.querySelectorAll('.assess-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      row.querySelectorAll('.assess-btn').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      const rating = e.target.getAttribute('data-rating');
      Tracker.logWordDifficulty(`para-${paraIdx}-${appState.subject}`, appState.subject, rating === 'lost-me' ? 'define' : 'click');
    });
  });
  paraEl.insertAdjacentElement('afterend', row);
}

/* ==================== SPEECH CONTROLLER ==================== */
function handleSpeechPlay(startFromWordIdx = 0) {
  if (!appState.parsedData) return;

  if (appState.isPaused && startFromWordIdx === 0) {
    TTS.resume();
    appState.isPaused = false;
    toggleSpeechButtons(true);
    return;
  }

  const rate = parseFloat(doc.voiceSpeed.value);
  const voiceName = doc.voiceSelect.value;
  const autoPauseMs = parseInt(doc.autopauseSlider.value) * 1000;

  appState.isPlaying = true;
  appState.isPaused = false;
  toggleSpeechButtons(true);

  TTS.speak(
    appState.parsedData,
    {
      voiceName, rate, startFromWordIdx,
      onSentenceBoundary: autoPauseMs > 0 ? () => {
        TTS.pause();
        setTimeout(() => {
          if (appState.isPlaying && !appState.isPaused) TTS.resume();
        }, autoPauseMs);
      } : undefined,
    },
    (wordIdx) => {
      highlightWordInReader(wordIdx);
      updateProgressFromWord(wordIdx);
    },
    () => {
      resetSpeechButtons();
      endReadingSession(false);
    }
  );
}

function handleSpeechPause() {
  TTS.pause();
  appState.isPaused = true;
  toggleSpeechButtons(false);
}

function handleSpeechStop() {
  TTS.stop();
  resetSpeechButtons();
}

function speakSingleWord(word) {
  TTS.speakSingleWord(word, doc.voiceSelect.value);
}

function highlightWordInReader(wordIdx) {
  const old = doc.readerContent.querySelector('.word.highlighted');
  if (old) old.classList.remove('highlighted');
  const target = document.getElementById(`word-${wordIdx}`);
  if (target) {
    target.classList.add('highlighted');
    appState.activeWordIdx = wordIdx;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function toggleSpeechButtons(playing) {
  doc.btnPlay.style.display = playing ? 'none' : 'inline-flex';
  doc.btnPause.style.display = playing ? 'inline-flex' : 'none';
}

function resetSpeechButtons() {
  doc.btnPlay.style.display = 'inline-flex';
  doc.btnPause.style.display = 'none';
  appState.isPlaying = false;
  appState.isPaused = false;
  const highlighted = doc.readerContent.querySelector('.word.highlighted');
  if (highlighted) highlighted.classList.remove('highlighted');
}

/* ==================== AI DECODER PANEL ==================== */
async function openWordDecoder(wordText) {
  appState.sessionWordDecodes++;
  doc.aiDictEmpty.style.display = 'none';
  doc.aiDictContent.style.display = 'block';
  doc.targetWord.textContent = wordText;
  doc.syllablesChunked.innerHTML = `<span><i class="fa-solid fa-spinner fa-spin"></i> Breaking syllables...</span>`;
  doc.phoneticGuide.innerHTML = `<i>Pronouncing...</i>`;
  doc.wordDefinition.innerHTML = `<span style="color:var(--text-muted)">Querying dictionary...</span>`;
  doc.conceptAnalogy.innerHTML = `<span style="color:var(--text-muted)">Generating analogy...</span>`;
  doc.btnSaveGlossary.classList.remove('saved');
  doc.btnSaveGlossary.innerHTML = `<i class="fa-solid fa-bookmark"></i> Save`;

  // Check if already saved
  const glossary = JSON.parse(localStorage.getItem('readem_word_glossary') || '[]');
  if (glossary.find(g => g.word === wordText.toLowerCase())) {
    doc.btnSaveGlossary.classList.add('saved');
    doc.btnSaveGlossary.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
  }

  try {
    const data = await AIService.decodeWord(wordText, appState.subject);
    appState.lastDecodedWordData = { word: wordText, ...data };

    doc.syllablesChunked.innerHTML = data.syllables.map(s => `<span>${s}</span>`).join('');
    doc.phoneticGuide.textContent = data.phonetics;
    doc.wordDefinition.textContent = data.definition;
    doc.conceptAnalogy.textContent = data.analogy;

    Tracker.logWordDifficulty(wordText, appState.subject, 'define');
    Tracker.logWordDifficulty(wordText, appState.subject, 'syllabify');

    // Mother-tongue bridge: auto-translate if a language is selected
    if (appState.bridgeLang) translateCurrentWord(wordText, data.definition);
  } catch (err) {
    doc.wordDefinition.textContent = 'Could not retrieve definition.';
    doc.conceptAnalogy.textContent = 'Analogy lookup failed.';
  }
}

async function openTextSimplifier(paraText, paraIdx) {
  appState.sessionSimplifications++;
  doc.aiSimplifierEmpty.style.display = 'none';
  doc.aiSimplifierContent.style.display = 'block';
  doc.btnReplaceOriginal.disabled = true;
  doc.simplifiedOriginal.textContent = `"${paraText.substring(0, 100)}..."`;
  doc.simplifiedResult.innerHTML = `<span><i class="fa-solid fa-circle-notch fa-spin"></i> Rewriting...</span>`;
  lastSimplifiedParagraphIdx = paraIdx;

  try {
    const simplified = await AIService.simplifyParagraph(paraText, appState.subject);
    doc.simplifiedResult.textContent = simplified;
    doc.btnReplaceOriginal.disabled = false;
    Tracker.logSentenceSimplification(paraText, simplified, appState.subject);
  } catch (err) {
    doc.simplifiedResult.textContent = `Simplification failed: ${err.message}`;
  }
}

function replaceParagraphWithSimplified(paraIdx, newText) {
  const paragraphs = doc.readerContent.querySelectorAll('.reader-para');
  if (!paragraphs[paraIdx]) return;
  const fullText = Array.from(paragraphs).map((p, idx) => {
    if (idx === paraIdx) return newText;
    return Array.from(p.querySelectorAll('.word')).map(el => el.getAttribute('data-clean-word') || el.textContent).join(' ');
  }).join('\n\n');

  appState.rawText = fullText;
  appState.parsedData = TTS.parseText(fullText);
  doc.readerContent.innerHTML = appState.parsedData.html;
  applyContentOverlays();
  applyTypographyStyles();
  showToast('Paragraph replaced with simplified version.', 'success');
}

/* ==================== WORD GLOSSARY ==================== */
function loadGlossaryFromStorage() {
  // Pre-load glossary count — used when rendering
}

function saveCurrentWordToGlossary() {
  if (!appState.lastDecodedWordData) return;
  const { word } = appState.lastDecodedWordData;
  const glossary = JSON.parse(localStorage.getItem('readem_word_glossary') || '[]');
  if (glossary.find(g => g.word === word.toLowerCase())) {
    showToast(`"${word}" is already in your glossary.`, 'info');
    return;
  }
  glossary.push({ ...appState.lastDecodedWordData, word: word.toLowerCase(), savedAt: new Date().toISOString() });
  localStorage.setItem('readem_word_glossary', JSON.stringify(glossary));
  doc.btnSaveGlossary.classList.add('saved');
  doc.btnSaveGlossary.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
  showToast(`"${word}" saved to your glossary.`, 'success');
}

function renderGlossaryModal() {
  const glossary = JSON.parse(localStorage.getItem('readem_word_glossary') || '[]');
  if (glossary.length === 0) {
    doc.glossaryBody.innerHTML = `<p class="table-empty" style="padding: 32px;">No words saved yet. Click any word while reading, then tap Save.</p>`;
  } else {
    doc.glossaryBody.innerHTML = glossary.slice().reverse().map(entry => `
      <div class="glossary-item">
        <span class="glossary-word">${entry.word}</span>
        <span class="glossary-phonetics">${entry.phonetics || ''}</span>
        <span class="glossary-definition">${entry.definition || ''}</span>
      </div>
    `).join('');
  }
  doc.glossaryModal.style.display = 'flex';
}

/* ==================== COMPREHENSION CHECK ==================== */
async function openComprehensionCheck() {
  const snapSessionId = appState.sessionId || `session-${Date.now()}`;
  doc.comprehensionModal.style.display = 'flex';
  doc.comprehensionBody.innerHTML = '<div class="vocab-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Generating questions...</div>';
  doc.comprehensionDoneBtn.style.display = 'none';
  doc.comprehensionAnswerCount.textContent = '';

  try {
    const questions = await AIService.generateComprehensionQuestions(appState.rawText, appState.subject);
    const total = questions.length;
    let answeredCount = 0;

    const updateCount = () => {
      answeredCount++;
      doc.comprehensionAnswerCount.textContent = `${answeredCount} / ${total} answered`;
      if (answeredCount >= total) doc.comprehensionDoneBtn.style.display = 'inline-flex';
    };

    doc.comprehensionBody.innerHTML = questions.map((q, i) => `
      <div class="comprehension-question-item" data-q-idx="${i}">
        <div class="comprehension-q-num">Question ${i + 1}</div>
        <div class="comprehension-q-text">${q.q}</div>
        <div class="comprehension-hint"><i class="fa-solid fa-lightbulb"></i>&nbsp;Hint: ${q.hint}</div>
        <button class="comprehension-answer-btn" data-q-idx="${i}"><i class="fa-solid fa-check"></i> Got it</button>
      </div>
    `).join('');

    doc.comprehensionBody.querySelectorAll('.comprehension-answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!btn.classList.contains('answered')) {
          btn.classList.add('answered');
          btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Done';
          updateCount();
        }
      });
    });

    doc.comprehensionDoneBtn.setAttribute('data-session-id', snapSessionId);
    doc.comprehensionDoneBtn.setAttribute('data-total', total);
    if (total > 0) doc.comprehensionAnswerCount.textContent = `0 / ${total} answered`;
  } catch (e) {
    doc.comprehensionBody.innerHTML = '<div class="vocab-empty">Could not generate questions. Try again.</div>';
  }
}

/* ==================== PROVIDER BADGE ==================== */
function updateProviderBadge() {
  if (!doc.providerPill) return;
  if (AIService.isUsingHuawei()) {
    doc.providerPill.textContent = 'Huawei Cloud';
    doc.providerPill.classList.add('provider-huawei');
  } else {
    doc.providerPill.textContent = 'OpenAI';
    doc.providerPill.classList.remove('provider-huawei');
  }
}

/* ==================== AI STATUS BADGE ==================== */
function updateAIStatusBadge() {
  if (!doc.aiStatusBadge) return;
  const hasAI = AIService.hasKeys();
  doc.aiStatusBadge.textContent = hasAI ? 'AI Active' : 'Offline Mode';
  doc.aiStatusBadge.className = `ai-status-badge ${hasAI ? 'ai-status-active' : 'ai-status-offline'}`;
}

/* ==================== ORAL FLUENCY ASSESSMENT (Huawei SIS) ==================== */

// Minimal PCM recorder using Web Audio API — produces 16kHz mono PCM
// which Huawei SIS accepts directly as pcm16k16bit, avoiding browser MIME issues.
class PcmRecorder {
  constructor() { this.ctx = null; this.processor = null; this.stream = null; this.chunks = []; }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
    this.ctx = new AudioContext({ sampleRate: 16000 });
    const src = this.ctx.createMediaStreamSource(this.stream);
    // ScriptProcessor is deprecated but universally supported — sufficient for demo
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.processor.onaudioprocess = e => {
      const f32 = e.inputBuffer.getChannelData(0);
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
      this.chunks.push(i16);
    };
    src.connect(this.processor);
    this.processor.connect(this.ctx.destination);
  }
  stop() {
    this.processor?.disconnect();
    this.ctx?.close();
    this.stream?.getTracks().forEach(t => t.stop());
    const total = this.chunks.reduce((s, c) => s + c.length, 0);
    const out = new Int16Array(total);
    let off = 0;
    for (const c of this.chunks) { out.set(c, off); off += c.length; }
    this.chunks = [];
    return out;
  }
  static toBase64(i16) {
    const u8 = new Uint8Array(i16.buffer);
    let s = '';
    // Process in chunks to avoid call stack overflow on large buffers
    const CHUNK = 8192;
    for (let i = 0; i < u8.length; i += CHUNK) {
      s += String.fromCharCode(...u8.subarray(i, i + CHUNK));
    }
    return btoa(s);
  }
}

async function startOralAssessment() {
  if (!appState.parsedData) { showToast('Load a passage first before starting the fluency check.', 'info'); return; }
  try {
    appState.pcmRecorder = new PcmRecorder();
    await appState.pcmRecorder.start();
    appState.assessmentMode = true;
    appState.assessmentStartTime = Date.now();
    doc.btnStartAssess.style.display = 'none';
    doc.btnStopAssess.style.display = 'inline-flex';
    showToast('Recording started — read the passage aloud, then click Stop & Score.', 'info', 6000);
  } catch (err) {
    appState.pcmRecorder = null;
    showToast('Microphone access denied. Enable mic permissions to use Read Aloud Check.', 'error');
  }
}

async function stopOralAssessment() {
  if (!appState.pcmRecorder || !appState.assessmentMode) return;
  const durationMs = Date.now() - (appState.assessmentStartTime || Date.now());

  doc.btnStopAssess.disabled = true;
  doc.btnStopAssess.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Scoring...';

  try {
    const pcmData = appState.pcmRecorder.stop();
    appState.pcmRecorder = null;
    const audioBase64 = PcmRecorder.toBase64(pcmData);

    const transcript = await AIService.transcribeAudio(audioBase64, 'pcm16k16bit');
    const { accuracy, misread, totalWords } = computeFluencyScore(transcript, appState.rawText);
    const wpm = durationMs > 5000 ? Math.round((totalWords / (durationMs / 60000))) : 0;

    markFluencyResults(new Set(misread));

    const accuracyClass = accuracy >= 90 ? 'fluency-accuracy-high' : 'fluency-accuracy-low';
    doc.fluencyResult.style.display = 'flex';
    doc.fluencyResult.innerHTML = `
      <div class="fluency-score-row">
        <span class="fluency-stat ${accuracyClass}"><strong>${accuracy}%</strong> accuracy</span>
        ${wpm > 0 ? `<span class="fluency-stat"><strong>${wpm}</strong> WPM</span>` : ''}
        <span class="fluency-stat"><strong>${misread.length}</strong> word${misread.length !== 1 ? 's' : ''} missed</span>
        ${misread.length > 0 ? `<span class="fluency-stat" style="font-size:0.78rem; color:var(--text-muted);">Missed: ${misread.slice(0, 6).join(', ')}${misread.length > 6 ? '…' : ''}</span>` : ''}
        <button id="fluency-clear-btn" class="secondary-btn btn-sm" style="margin-left:auto;"><i class="fa-solid fa-xmark"></i> Clear</button>
      </div>
    `;
    document.getElementById('fluency-clear-btn')?.addEventListener('click', () => {
      doc.fluencyResult.style.display = 'none';
      clearFluencyMarks();
    });

    showToast(`Fluency scored: ${accuracy}% accuracy${wpm > 0 ? `, ${wpm} WPM` : ''}.`, accuracy >= 90 ? 'success' : 'info');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    appState.assessmentMode = false;
    appState.assessmentStartTime = null;
    doc.btnStartAssess.style.display = 'inline-flex';
    doc.btnStopAssess.style.display = 'none';
    doc.btnStopAssess.disabled = false;
    doc.btnStopAssess.innerHTML = '<i class="fa-solid fa-microphone-slash"></i> Stop &amp; Score';
  }
}

function computeFluencyScore(transcript, originalText) {
  const normalize = s => s.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
  const origWords = normalize(originalText);
  const readSet = new Set(normalize(transcript));
  // Words not spoken (or misread) — only flag substantive words (len ≥ 3)
  const misread = origWords.filter(w => w.length >= 3 && !readSet.has(w));
  const correct = origWords.length - misread.length;
  const accuracy = origWords.length > 0 ? Math.round((correct / origWords.length) * 100) : 100;
  return { accuracy, misread: [...new Set(misread)], totalWords: origWords.length };
}

function markFluencyResults(misreadSet) {
  doc.readerContent.querySelectorAll('.word').forEach(span => {
    const clean = (span.getAttribute('data-clean-word') || '').toLowerCase();
    span.classList.remove('word-misread', 'word-read-correct');
    if (clean.length < 3) return;
    span.classList.add(misreadSet.has(clean) ? 'word-misread' : 'word-read-correct');
  });
}

function clearFluencyMarks() {
  doc.readerContent.querySelectorAll('.word').forEach(s => s.classList.remove('word-misread', 'word-read-correct'));
}

/* ==================== HARD WORD PRE-FLAGGING (Huawei NLP Keywords) ==================== */
function colorParagraphsByDifficulty() {
  doc.readerContent.querySelectorAll('.reader-para').forEach(para => {
    const words = para.textContent.trim().split(/\s+/).filter(w => /[a-z]/i.test(w));
    if (words.length < 4) return;
    const hardRatio = words.filter(w => w.replace(/[^a-z]/gi, '').length >= 7).length / words.length;
    const sentences = para.textContent.match(/[^.!?]+[.!?]+/g) || [para.textContent];
    const avgSentLen = words.length / sentences.length;
    const score = hardRatio * 60 + avgSentLen * 0.8;
    para.classList.remove('para-diff-easy', 'para-diff-medium', 'para-diff-hard');
    if (score > 14) para.classList.add('para-diff-hard');
    else if (score > 7) para.classList.add('para-diff-medium');
    else para.classList.add('para-diff-easy');
  });
}

async function preflightHardWords(text) {
  try {
    const hardWords = await AIService.extractHardWords(text, appState.subject);
    if (!hardWords || hardWords.length === 0) return;
    const hardSet = new Set(hardWords.map(w => w.toLowerCase()));
    doc.readerContent.querySelectorAll('.word').forEach(span => {
      const clean = (span.getAttribute('data-clean-word') || '').toLowerCase();
      if (hardSet.has(clean)) span.classList.add('word-preflagged');
    });
  } catch (e) { /* silent — non-blocking */ }
}

/* ==================== MOTHER-TONGUE BRIDGE (Huawei MT) ==================== */
function setLanguageBridge(lang) {
  appState.bridgeLang = lang;
  localStorage.setItem('readem_bridge_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
  if (lang && doc.targetWord.textContent && doc.aiDictContent.style.display !== 'none') {
    translateCurrentWord(doc.targetWord.textContent, doc.wordDefinition.textContent);
  } else {
    doc.wordTranslation.style.display = 'none';
  }
}

async function translateCurrentWord(word, definition) {
  if (!appState.bridgeLang || !word) return;
  const textToTranslate = definition ? `${word}: ${definition}` : word;
  doc.wordTranslation.style.display = 'block';
  doc.wordTranslation.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Translating...';

  const langNames = { zh: '中文 (Mandarin)', ms: 'Melayu', ta: 'தமிழ் (Tamil)' };
  const translation = await AIService.translateWord(textToTranslate, appState.bridgeLang);

  if (translation) {
    doc.wordTranslation.innerHTML = `
      <span class="translation-label">${langNames[appState.bridgeLang] || appState.bridgeLang}</span>
      <span class="translation-text">${translation}</span>
    `;
  } else {
    doc.wordTranslation.innerHTML = `<span style="color:var(--text-muted);font-size:0.78rem;">Mother-tongue translation requires Huawei Cloud proxy. <a href="#" style="color:var(--primary-color);" onclick="return false;">Configure it</a> to enable.</span>`;
  }
}

/* ==================== SESSION TRACKING ==================== */
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function startReadingSession() {
  appState.sessionId = generateSessionId();
  appState.sessionStartTime = Date.now();
  appState.sessionWordDecodes = 0;
  appState.sessionSimplifications = 0;
}

async function endReadingSession(showSummary) {
  if (!appState.sessionId || !appState.sessionStartTime) return;
  const durationMs = Date.now() - appState.sessionStartTime;
  const wordCount = appState.parsedData ? appState.parsedData.ranges.length : 0;
  // Only compute wpm for sessions that lasted at least 10s and had words
  const wpm = (durationMs > 10000 && wordCount > 0) ? Math.round(wordCount / (durationMs / 60000)) : 0;

  const data = {
    sessionId: appState.sessionId,
    subject: appState.subject,
    passagePreview: appState.rawText,
    wordsRead: wordCount,
    wordsDecoded: appState.sessionWordDecodes,
    durationMs,
    simplifications: appState.sessionSimplifications,
    readingSpeedWpm: wpm,
    comprehensionCompleted: false,
  };

  await Tracker.logSessionSummary(data);

  if (showSummary && durationMs > 8000) {
    showSessionSummary(data);
  }

  appState.sessionId = null;
  appState.sessionStartTime = null;
  appState.sessionWordDecodes = 0;
  appState.sessionSimplifications = 0;
}

function showSessionSummary(data) {
  const minutes = Math.floor(data.durationMs / 60000);
  const seconds = Math.floor((data.durationMs % 60000) / 1000);
  const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const decodeRate = data.wordsRead > 0 ? Math.round((data.wordsDecoded / data.wordsRead) * 100) : 0;

  doc.sessionSummaryBody.innerHTML = `
    <p style="color:var(--text-muted); margin-bottom:14px; font-size:0.9rem;">Here is what happened this session.</p>
    <div class="session-summary-grid">
      <div class="session-summary-stat">
        <span class="stat-num">${data.wordsRead}</span>
        <span class="stat-label">Words Read</span>
      </div>
      <div class="session-summary-stat">
        <span class="stat-num">${durationText}</span>
        <span class="stat-label">Time Spent</span>
      </div>
      <div class="session-summary-stat">
        <span class="stat-num">${data.wordsDecoded}</span>
        <span class="stat-label">Words Decoded</span>
      </div>
      <div class="session-summary-stat">
        <span class="stat-num">${data.simplifications}</span>
        <span class="stat-label">Simplifications Used</span>
      </div>
    </div>
    ${decodeRate > 0 ? `<p style="color:var(--text-muted); font-size:0.8rem; margin-top:8px; text-align:center;">Decode rate this session: <strong>${decodeRate}%</strong></p>` : ''}
  `;
  doc.sessionSummaryModal.style.display = 'flex';
}

/* ==================== FIRST LOGIN ==================== */
function checkFirstLogin() {
  const sessions = JSON.parse(localStorage.getItem('readem_session_history') || '[]');
  if (sessions.length === 0 && !localStorage.getItem('readem_demo_loaded')) {
    localStorage.setItem('readem_demo_loaded', '1');
    const demo = DEMO_MATERIALS['sg-psle-science'];
    doc.textInput.value = demo.text;
    appState.subject = demo.subject;
    doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${demo.subject}`;
    doc.textStatsRow.style.display = 'flex';
    updateTextStats(demo.text);
  }
}

/* ==================== STUDENT PROGRESS SPARKLINES ==================== */
function sparklineSvg(values, width, height) {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const [lx, ly] = pts[pts.length - 1].split(',');
  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polyline points="${pts.join(' ')}"/><circle cx="${lx}" cy="${ly}" r="3"/></svg>`;
}

async function renderStudentProgress() {
  const students = await Tracker.getStudentList();
  if (students.length === 0) {
    doc.studentProgressSection.style.display = 'none';
    return;
  }
  doc.studentProgressSection.style.display = 'block';

  const studentData = await Promise.all(
    students.map(async s => {
      const progress = await Tracker.getStudentProgress(s.uid);
      const displayName = await Auth.getUserDisplayName(s.uid);
      return { ...s, progress, displayName };
    })
  );

  doc.studentProgressList.innerHTML = studentData.map(s => {
    const wpmValues = s.progress.map(p => p.wpm).filter(v => v > 0);
    const svgEl = wpmValues.length >= 2 ? sparklineSvg(wpmValues, 120, 36) : '';
    const lastWpm = wpmValues.length > 0 ? wpmValues[wpmValues.length - 1] : 0;
    return `
      <div class="student-progress-item">
        <span class="student-progress-label">${s.displayName}</span>
        ${svgEl || '<span style="color:var(--text-muted);font-size:0.7rem;">Not enough data</span>'}
        <span class="student-progress-meta">${lastWpm > 0 ? lastWpm + ' WPM' : '—'} &bull; ${s.sessionCount} session${s.sessionCount !== 1 ? 's' : ''}</span>
      </div>
    `;
  }).join('');
}

/* ==================== ONBOARDING ==================== */
function checkOnboarding() {
  if (!localStorage.getItem('readem_onboarded')) {
    doc.onboardingModal.style.display = 'flex';
  }
}

function applyOnboardingSettings() {
  const activeFont = doc.onboardStep1.querySelector('.font-pick-btn.active');
  if (activeFont) {
    doc.fontFamily.value = activeFont.getAttribute('data-font');
    applyTypographyStyles();
    applyContentOverlays();
  }

  const activeSubject = doc.onboardStep2.querySelector('.subject-pick-btn.active');
  const subject = activeSubject ? activeSubject.getAttribute('data-subject') : 'General';
  if (activeSubject) {
    appState.subject = subject;
    doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${subject}`;
  }

  const activeDiff = doc.onboardStep3.querySelector('.difficulty-pick-btn.active');
  const difficulty = activeDiff ? activeDiff.getAttribute('data-level') : 'medium';

  if (difficulty === 'hard') {
    doc.fontSize.value = Math.min(parseInt(doc.fontSize.value) + 4, 36);
    doc.fontSizeVal.textContent = `${doc.fontSize.value}px`;
    applyTypographyStyles();
  }

  // Adult / work path: no phonics overlays, larger spacing
  if (subject === 'Work') {
    doc.lineHeight.value = 2.0; doc.lineHeightVal.textContent = '2.0';
    doc.wordSpacing.value = 0.3; doc.wordSpacingVal.textContent = '0.3em';
    applyTypographyStyles();
  } else if (difficulty === 'hard') {
    // School subject + hard difficulty → enable phonics to support decoding
    applyPreset('phonics');
  }
}

/* ==================== QUICK PRESETS ==================== */
function applyPreset(name) {
  switch (name) {
    case 'dyslexia':
      doc.fontFamily.value = 'font-opendyslexic';
      doc.fontSize.value = 24; doc.fontSizeVal.textContent = '24px';
      doc.lineHeight.value = 2.0; doc.lineHeightVal.textContent = '2.0';
      doc.letterSpacing.value = 0.15; doc.letterSpacingVal.textContent = '0.15em';
      doc.wordSpacing.value = 0.3; doc.wordSpacingVal.textContent = '0.3em';
      doc.toggleBionic.checked = false; appState.overlays.bionic = false;
      doc.bionicRatioRow.style.display = 'none';
      doc.toggleIrlen.checked = true;
      doc.irlenControls.style.display = 'block';
      doc.irlenOverlay.style.display = 'block';
      doc.irlenColor.value = '#ffeb99';
      doc.irlenOpacity.value = 20; doc.irlenOpacityValue.textContent = '20%';
      updateIrlenOverlay();
      applyTypographyStyles();
      applyContentOverlays();
      showToast('Dyslexia Pack applied.', 'success');
      break;
    case 'focus':
      doc.toggleLineFocus.checked = true;
      doc.readerContent.classList.add('line-focus-active');
      doc.toggleFocusMode.checked = true;
      appState.focusMode = true;
      doc.readerWorkspace.classList.add('focus-mode-active');
      doc.toggleIrlen.checked = true;
      doc.irlenControls.style.display = 'block';
      doc.irlenOverlay.style.display = 'block';
      doc.irlenColor.value = '#e0f0ff';
      doc.irlenOpacity.value = 18; doc.irlenOpacityValue.textContent = '18%';
      updateIrlenOverlay();
      showToast('Focus Mode applied.', 'success');
      break;
    case 'phonics':
      doc.toggleSyllable.checked = true;
      doc.togglePhonicsVowels.checked = true;
      doc.togglePhonicsDigraphs.checked = true;
      doc.toggleMorpheme.checked = true;
      appState.overlays.syllable = true;
      appState.overlays.phonicsVowels = true;
      appState.overlays.phonicsDigraphs = true;
      appState.overlays.morpheme = true;
      applyContentOverlays();
      showToast('Phonics Mode applied.', 'success');
      break;
    case 'reset':
      doc.fontFamily.value = 'font-lexend';
      doc.fontSize.value = 22; doc.fontSizeVal.textContent = '22px';
      doc.lineHeight.value = 1.8; doc.lineHeightVal.textContent = '1.8';
      doc.letterSpacing.value = 0.12; doc.letterSpacingVal.textContent = '0.12em';
      doc.wordSpacing.value = 0.25; doc.wordSpacingVal.textContent = '0.25em';
      doc.toggleBionic.checked = false;
      doc.toggleSyllable.checked = false;
      doc.togglePhonicsVowels.checked = false;
      doc.togglePhonicsDigraphs.checked = false;
      doc.toggleMorpheme.checked = false;
      doc.toggleLineFocus.checked = false;
      doc.toggleFocusMode.checked = false;
      doc.toggleIrlen.checked = false;
      doc.irlenControls.style.display = 'none';
      doc.irlenOverlay.style.display = 'none';
      doc.toggleProgressive.checked = false;
      doc.bionicRatioRow.style.display = 'none';
      doc.readerContent.classList.remove('line-focus-active', 'show-chunking');
      doc.readerWorkspace.classList.remove('focus-mode-active');
      appState.overlays = { syllable: false, phonicsVowels: false, phonicsDigraphs: false, morpheme: false, bionic: false, bionicRatio: 0.45 };
      appState.focusMode = false;
      if (appState.progressiveReveal) { appState.progressiveReveal = false; endProgressiveReveal(); }
      applyTypographyStyles();
      applyContentOverlays();
      showToast('All settings reset to defaults.', 'info');
      break;
  }
}

/* ==================== SESSION HISTORY ==================== */
function saveSessionToHistory(text, subject) {
  const sessions = JSON.parse(localStorage.getItem('readem_session_history') || '[]');
  const preview = text.slice(0, 80).replace(/\s+/g, ' ').trim();
  const wordCount = text.trim().split(/\s+/).length;
  sessions.unshift({ preview, subject, wordCount, timestamp: new Date().toISOString(), fullText: text });
  sessions.splice(5);
  localStorage.setItem('readem_session_history', JSON.stringify(sessions));
  renderSessionHistory();
}

function renderSessionHistory() {
  const sessions = JSON.parse(localStorage.getItem('readem_session_history') || '[]');
  if (sessions.length === 0) { doc.sessionHistorySection.style.display = 'none'; return; }
  doc.sessionHistorySection.style.display = 'block';
  doc.sessionHistoryList.innerHTML = sessions.map((s, idx) => `
    <div class="session-card">
      <div class="session-card-info">
        <div class="session-preview">${s.preview}…</div>
        <div class="session-meta">
          <span class="session-subject">${s.subject}</span>
          <span>${s.wordCount} words</span>
          <span>${formatRelativeTime(s.timestamp)}</span>
        </div>
      </div>
      <button class="session-reload-btn" data-idx="${idx}"><i class="fa-solid fa-rotate-right"></i> Load</button>
    </div>
  `).join('');
}

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ==================== TEXT DIFFICULTY & STATS ==================== */
function classifyTextDifficulty(text) {
  const words = text.trim().split(/\s+/).filter(w => /[a-z]/i.test(w));
  if (words.length < 10) return 'Easy';
  const hardWords = words.filter(w => w.replace(/[^a-z]/gi, '').length >= 7).length;
  const ratio = hardWords / words.length;
  if (ratio > 0.28) return 'Hard';
  if (ratio > 0.14) return 'Medium';
  return 'Easy';
}

function updateTextStats(text) {
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  const difficulty = classifyTextDifficulty(text);
  doc.wordCountDisplay.innerHTML = `<i class="fa-solid fa-font"></i> ${wordCount} words`;
  doc.readingTimeBadge.innerHTML = `<i class="fa-regular fa-clock"></i> ~${minutes} min read`;
  const classMap = { Easy: 'difficulty-low', Medium: 'difficulty-medium', Hard: 'difficulty-high' };
  doc.textDifficultyBadge.textContent = difficulty;
  doc.textDifficultyBadge.className = `difficulty-badge ${classMap[difficulty]}`;
  doc.textDifficultyBadge.style.display = 'inline-block';
}

/* ==================== KEYBOARD NAVIGATION ==================== */
function adjustFontSize(delta) {
  const next = Math.max(14, Math.min(40, parseInt(doc.fontSize.value) + delta));
  doc.fontSize.value = next;
  doc.fontSizeVal.textContent = `${next}px`;
  applyTypographyStyles();
}

function navigateWord(delta) {
  if (!appState.parsedData) return;
  const total = appState.parsedData.ranges.length;
  if (total === 0) return;
  const next = Math.max(0, Math.min(total - 1, appState.activeWordIdx + delta));
  highlightWordInReader(next);
  updateProgressFromWord(next);
}

function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      for (const modal of [doc.shortcutHelpModal, doc.comprehensionModal, doc.glossaryModal, doc.vocabModal, doc.onboardingModal, doc.plansModal, doc.sessionSummaryModal]) {
        if (modal && modal.style.display !== 'none') { modal.style.display = 'none'; return; }
      }
      if (appState.isPlaying) { handleSpeechStop(); return; }
    }

    if (e.key === '?' && !inInput) {
      e.preventDefault();
      doc.shortcutHelpModal.style.display = 'flex';
      return;
    }

    if (doc.panelReader.style.display === 'none' || appState.role !== 'reader' || inInput) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (appState.isPlaying && !appState.isPaused) handleSpeechPause();
        else if (appState.isPaused) { TTS.resume(); appState.isPaused = false; toggleSpeechButtons(true); }
        else handleSpeechPlay();
        break;
      case 'ArrowRight': e.preventDefault(); navigateWord(1); break;
      case 'ArrowLeft': e.preventDefault(); navigateWord(-1); break;
      case 'Enter':
        if (appState.activeWordIdx >= 0 && appState.parsedData) {
          const range = appState.parsedData.ranges.find(r => r.index === appState.activeWordIdx);
          if (range) openWordDecoder(range.word);
        }
        break;
      case 'b': case 'B':
        doc.toggleBionic.checked = !doc.toggleBionic.checked;
        appState.overlays.bionic = doc.toggleBionic.checked;
        doc.bionicRatioRow.style.display = doc.toggleBionic.checked ? 'block' : 'none';
        applyContentOverlays();
        break;
      case 'f': case 'F':
        doc.toggleFocusMode.checked = !doc.toggleFocusMode.checked;
        appState.focusMode = doc.toggleFocusMode.checked;
        doc.readerWorkspace.classList.toggle('focus-mode-active', appState.focusMode);
        break;
      case '+': case '=': e.preventDefault(); adjustFontSize(2); break;
      case '-': case '_': e.preventDefault(); adjustFontSize(-2); break;
    }
  });
}

/* ==================== TEACHER VIEW ==================== */
async function refreshTeacherDigest() {
  const [stats, words, sentences] = await Promise.all([
    Tracker.getStats(),
    Tracker.getWordDigest(),
    Tracker.getSentenceDigest(),
  ]);

  doc.statWordsCount.textContent = stats.totalStruggledWords;
  doc.statSimplifications.textContent = stats.totalSimplifications;
  doc.statAvgSpeed.textContent = stats.avgSpeed;
  doc.statTotalSessions.textContent = stats.totalSessions;
  doc.statAvgDecodeRate.textContent = stats.avgDecodeRate;

  if (words.length === 0) {
    doc.struggledWordsTbody.innerHTML = `<tr><td colspan="5" class="table-empty">No reading sessions recorded yet. Student struggles will show here.</td></tr>`;
  } else {
    // Build uid → display name map
    const nameMap = {};
    for (const w of words) {
      if (w.uid && !nameMap[w.uid]) {
        nameMap[w.uid] = await Auth.getUserDisplayName(w.uid);
      }
    }
    doc.struggledWordsTbody.innerHTML = words.map(w => `
      <tr>
        <td><strong>${w.word}</strong></td>
        <td><span class="reader-mode-indicator">${w.subject}</span></td>
        <td><span class="student-label">${nameMap[w.uid] || w.uid}</span></td>
        <td>${w.actionsTriggered}</td>
        <td><span class="difficulty-badge difficulty-${w.difficulty}">${w.difficulty}</span></td>
      </tr>
    `).join('');
  }

  if (sentences.length === 0) {
    doc.simplifiedSentencesList.innerHTML = `<p class="table-empty">No sentences simplified yet. Areas of reading fatigue will register here.</p>`;
  } else {
    doc.simplifiedSentencesList.innerHTML = sentences.map(s => {
      const time = s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : 'just now';
      return `
        <div class="sentence-digest-item">
          <div class="sentence-digest-original"><strong>Original:</strong> "${s.original}"</div>
          <div class="sentence-digest-simplified"><strong>Simplified:</strong> "${s.simplified}"</div>
          <div class="sentence-digest-meta"><i class="fa-solid fa-tag"></i> ${s.subject} &bull; <i class="fa-regular fa-clock"></i> ${time}</div>
        </div>
      `;
    }).join('');
  }

  renderStudentProgress();
  renderTeacherInsights(stats, words, sentences);
}

function renderTeacherInsights(stats, words, sentences) {
  if (!doc.aiInsightsBody) return;

  if (stats.totalSessions === 0) {
    doc.aiInsightsBody.innerHTML = '<p class="table-empty">No reading sessions yet. Insights will appear here once students start using Read\'Em.</p>';
    return;
  }

  const points = [];

  // Subject breakdown
  const subjectTotals = {};
  words.forEach(w => { subjectTotals[w.subject] = (subjectTotals[w.subject] || 0) + w.weight; });
  const topSubject = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])[0];
  if (topSubject) {
    points.push(`Students are spending the most decoding effort on <strong>${topSubject[0]}</strong> vocabulary.`);
  }

  // Hard words callout
  const hardWords = words.filter(w => w.difficulty === 'high').slice(0, 3);
  if (hardWords.length > 0) {
    const list = hardWords.map(w => `"${w.word}"`).join(', ');
    points.push(`Highest-difficulty words this week: ${list}. Pre-teaching these before your next lesson may reduce decode interruptions.`);
  }

  // Simplification frequency
  const simpRate = stats.totalSessions > 0
    ? (stats.totalSimplifications / stats.totalSessions).toFixed(1)
    : 0;
  if (parseFloat(simpRate) >= 1) {
    points.push(`Students are requesting paragraph simplification <strong>${simpRate}× per session</strong> on average — the source texts may be above their comfortable reading level.`);
  } else if (stats.totalSimplifications > 0) {
    points.push(`Paragraph simplification has been used <strong>${stats.totalSimplifications} time${stats.totalSimplifications !== 1 ? 's' : ''}</strong> across ${stats.totalSessions} session${stats.totalSessions !== 1 ? 's' : ''} — occasional support, not a persistent barrier.`);
  }

  // Sentence subject spread
  if (sentences.length > 0) {
    const subjectsNeedingHelp = [...new Set(sentences.map(s => s.subject))];
    points.push(`Passages from <strong>${subjectsNeedingHelp.join(', ')}</strong> generated the most simplification requests.`);
  }

  // Decode rate guidance
  const decodeNum = parseInt(stats.avgDecodeRate);
  if (decodeNum >= 25) {
    points.push(`Average decode rate is <strong>${stats.avgDecodeRate}</strong> — students are actively using the word decoder. Consider reviewing flagged words as a class.`);
  } else if (decodeNum > 0 && decodeNum < 10) {
    points.push(`Average decode rate is <strong>${stats.avgDecodeRate}</strong> — students may not be aware of the word decoder, or the current passages are at a comfortable level.`);
  }

  doc.aiInsightsBody.innerHTML = points.length > 0
    ? `<div class="insights-list">${points.map(p => `<div class="insight-item"><i class="fa-solid fa-circle-dot" style="color:var(--color-primary);margin-right:8px;font-size:0.7rem;"></i>${p}</div>`).join('')}</div>`
    : '<p class="table-empty">Keep collecting data — insights appear after a few sessions.</p>';
}
