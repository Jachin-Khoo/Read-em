/* ==========================================================================
   Sup' Read With Me Main Orchestrator (src/main.js)
   ========================================================================== */

import { TTS } from './tts.js';
import { AIService } from './ai-service.js';
import { Tracker } from './tracker.js';
import { extractTextFromPDF, readTextFile } from './pdf-handler.js';

// Global application state
let appState = {
  rawText: '',
  subject: 'General',
  parsedData: null,
  activeVoice: '',
  isPlaying: false,
  isPaused: false,
  activeWordIdx: -1,
  rulerActive: false
};

// Curriculum Demo Materials
const DEMO_MATERIALS = {
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

// DOM Elements
const doc = {
  // Navigation & Role Layouts
  viewLandingPortal: document.getElementById('view-landing-portal'),
  cardEnterReader: document.getElementById('card-enter-reader'),
  cardEnterTeacher: document.getElementById('card-enter-teacher'),
  teacherPin: document.getElementById('teacher-pin'),
  btnSubmitTeacher: document.getElementById('btn-submit-teacher'),
  btnLogout: document.getElementById('btn-logout'),
  
  readerWorkspace: document.getElementById('reader-workspace'),
  teacherWorkspace: document.getElementById('teacher-workspace'),
  
  // Settings Panel Inputs
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
  
  // Visual Aids Toggles
  toggleRuler: document.getElementById('toggle-ruler'),
  rulerControls: document.querySelector('.ruler-control'),
  rulerHeight: document.getElementById('ruler-height-slider'),
  rulerHeightVal: document.getElementById('ruler-height-value'),
  toggleChunking: document.getElementById('toggle-chunking'),
  toggleBionic: document.getElementById('toggle-bionic'),
  
  // Audio Panel
  voiceSelect: document.getElementById('voice-select'),
  voiceSpeed: document.getElementById('voice-speed-slider'),
  voiceSpeedVal: document.getElementById('voice-speed-value'),

  // Upload Panel Views
  panelUpload: document.getElementById('panel-upload'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  btnBrowseFile: document.getElementById('btn-browse-file'),
  textInput: document.getElementById('text-input'),
  demoSelect: document.getElementById('demo-select'),
  subjectBadge: document.getElementById('subject-badge'),
  btnLoadText: document.getElementById('btn-load-text'),

  // Active Reader View
  panelReader: document.getElementById('panel-reader'),
  btnViewReflowed: document.getElementById('btn-view-reflowed'),
  btnViewPdf: document.getElementById('btn-view-pdf'),
  pdfCanvasContainer: document.getElementById('pdf-canvas-container'),
  readerContent: document.getElementById('reader-content'),
  readerRuler: document.getElementById('reading-ruler'),
  scrollContainer: document.querySelector('.reader-content-scroll'),
  readerSubject: document.getElementById('reader-subject-indicator'),
  btnBackUpload: document.getElementById('btn-back-upload'),
  
  // Reader Audio Controls
  btnPlay: document.getElementById('btn-play-speech'),
  btnPause: document.getElementById('btn-pause-speech'),
  btnStop: document.getElementById('btn-stop-speech'),

  // AI Helper Panel (Right)
  aiDictEmpty: document.getElementById('ai-dict-empty'),
  aiDictContent: document.getElementById('ai-dict-content'),
  targetWord: document.getElementById('target-word'),
  btnSpeakTarget: document.getElementById('btn-speak-target'),
  syllablesChunked: document.getElementById('syllables-chunked'),
  phoneticGuide: document.getElementById('phonetic-guide'),
  wordDefinition: document.getElementById('word-definition'),
  exaAnalogy: document.getElementById('exa-analogy'),
  exaCitations: document.getElementById('exa-citations'),

  aiSimplifierEmpty: document.getElementById('ai-simplifier-empty'),
  aiSimplifierContent: document.getElementById('ai-simplifier-content'),
  simplifiedOriginal: document.getElementById('simplified-original'),
  simplifiedResult: document.getElementById('simplified-result'),
  btnReplaceOriginal: document.getElementById('btn-replace-original'),

  // Teacher Dashboard Panels
  statWordsCount: document.getElementById('stat-words-count'),
  statSimplifications: document.getElementById('stat-simplifications'),
  statAvgSpeed: document.getElementById('stat-avg-speed'),
  btnRefreshDigest: document.getElementById('btn-refresh-digest'),
  btnExportDigest: document.getElementById('btn-export-digest'),
  btnClearDigest: document.getElementById('btn-clear-digest'),
  struggledWordsTbody: document.getElementById('struggled-words-tbody'),
  simplifiedSentencesList: document.getElementById('simplified-sentences-list'),

  // API Modal Settings Drawer
  btnApiSettings: document.getElementById('btn-api-settings'),
  modalApiSettings: document.getElementById('modal-api-settings'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnSaveKeys: document.getElementById('btn-save-keys'),
  inputOpenAIKey: document.getElementById('input-openai-key'),
  inputExaKey: document.getElementById('input-exa-key'),
  inputElevenLabsKey: document.getElementById('input-elevenlabs-key'),
  selectElevenLabsModel: document.getElementById('select-elevenlabs-model'),
  apiStatusIndicator: document.getElementById('api-status-indicator')
};

// Keep tracking variables
let lastSimplifiedParagraphIdx = -1;

/* ==================== INITIALIZATION ==================== */
document.addEventListener('DOMContentLoaded', () => {
  initUIPreferences();
  initVoiceList();
  initEventListeners();
  updateApiStatusIndicator();
});

// Configure UI inputs from stylesheet variables
function initUIPreferences() {
  // Populate typography settings from current layout defaults
  doc.fontSizeVal.textContent = `${doc.fontSize.value}px`;
  doc.lineHeightVal.textContent = doc.lineHeight.value;
  doc.letterSpacingVal.textContent = `${doc.letterSpacing.value}em`;
  doc.wordSpacingVal.textContent = `${doc.wordSpacing.value}em`;
  doc.voiceSpeedVal.textContent = `${doc.voiceSpeed.value}x`;

  applyTypographyStyles();
}

// Populate system voices inside select input
function initVoiceList() {
  TTS.initVoices((voices) => {
    doc.voiceSelect.innerHTML = voices.map(v => 
      `<option value="${v.value || v.name}" ${v.default ? 'selected' : ''}>${v.name} (${v.lang})</option>`
    ).join('');
    
    // Choose first standard voice if none selected
    if (voices.length > 0 && !doc.voiceSelect.value) {
      doc.voiceSelect.value = voices[0].value || voices[0].name;
    }
  });
}

// Bind interactive event actions
function initEventListeners() {
  // Landing Portal Navigation Toggles
  doc.cardEnterReader.addEventListener('click', () => switchRole('reader'));
  doc.btnSubmitTeacher.addEventListener('click', () => handleTeacherLogin());
  doc.teacherPin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTeacherLogin();
  });
  doc.btnLogout.addEventListener('click', logOut);

  // PDF Original Layout View Toggles
  doc.btnViewReflowed.addEventListener('click', () => switchLayoutView('reflowed'));
  doc.btnViewPdf.addEventListener('click', () => switchLayoutView('pdf'));

  // Settings Drawer Modal Toggle
  doc.btnApiSettings.addEventListener('click', openApiModal);
  doc.btnCloseModal.addEventListener('click', closeApiModal);
  doc.btnSaveKeys.addEventListener('click', saveApiKeys);
  window.addEventListener('click', (e) => {
    if (e.target === doc.modalApiSettings) closeApiModal();
  });

  // Typography Settings Changes
  doc.fontFamily.addEventListener('change', () => {
    applyTypographyStyles();
    // Reapply bionic format if active
    if (doc.toggleBionic.checked) applyBionicFormatting(true);
  });
  
  doc.fontSize.addEventListener('input', (e) => {
    doc.fontSizeVal.textContent = `${e.target.value}px`;
    applyTypographyStyles();
  });
  
  doc.lineHeight.addEventListener('input', (e) => {
    doc.lineHeightVal.textContent = e.target.value;
    applyTypographyStyles();
  });
  
  doc.letterSpacing.addEventListener('input', (e) => {
    doc.letterSpacingVal.textContent = `${e.target.value}em`;
    applyTypographyStyles();
  });
  
  doc.wordSpacing.addEventListener('input', (e) => {
    doc.wordSpacingVal.textContent = `${e.target.value}em`;
    applyTypographyStyles();
  });

  // Background Theme Selection
  doc.themeSwatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      doc.themeSwatches.forEach(s => s.classList.remove('active'));
      const swatchBtn = e.target;
      swatchBtn.classList.add('active');
      
      const themeClass = swatchBtn.getAttribute('data-theme');
      
      // Clear body theme classes
      document.body.className = '';
      document.body.classList.add(themeClass);
    });
  });

  // Visual Guides
  doc.toggleRuler.addEventListener('change', (e) => {
    appState.rulerActive = e.target.checked;
    if (appState.rulerActive) {
      doc.rulerControls.style.display = 'block';
      doc.readerRuler.style.display = 'block';
      doc.readerRuler.style.height = `${doc.rulerHeight.value}px`;
    } else {
      doc.rulerControls.style.display = 'none';
      doc.readerRuler.style.display = 'none';
    }
  });

  doc.rulerHeight.addEventListener('input', (e) => {
    doc.rulerHeightVal.textContent = `${e.target.value}px`;
    if (appState.rulerActive) {
      doc.readerRuler.style.height = `${e.target.value}px`;
    }
  });

  doc.toggleChunking.addEventListener('change', (e) => {
    if (e.target.checked) {
      doc.readerContent.classList.add('show-chunking');
    } else {
      doc.readerContent.classList.remove('show-chunking');
    }
  });

  doc.toggleBionic.addEventListener('change', (e) => {
    applyBionicFormatting(e.target.checked);
  });

  // Reading Ruler cursor-follow mechanics
  doc.scrollContainer.addEventListener('mousemove', (e) => {
    if (!appState.rulerActive) return;
    const rect = doc.scrollContainer.getBoundingClientRect();
    const relativeY = e.clientY - rect.top + doc.scrollContainer.scrollTop;
    const rulerHeight = parseInt(doc.rulerHeight.value);
    
    // Position ruler element inside coordinates relative to the text body container
    doc.readerRuler.style.top = `${relativeY - (rulerHeight / 2)}px`;
  });

  // Ingestion: Demo Curriculum Dropdown selection
  doc.demoSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (DEMO_MATERIALS[key]) {
      const material = DEMO_MATERIALS[key];
      doc.textInput.value = material.text;
      appState.subject = material.subject;
      
      // Update badge tag
      doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${material.subject}`;

      // Reset PDF document variables
      appState.pdfDoc = null;
      doc.btnViewPdf.disabled = true;
      switchLayoutView('reflowed');
    }
  });

  // Ingestion: Browse file button click handler
  doc.btnBrowseFile.addEventListener('click', () => doc.fileInput.click());
  
  // Ingestion: Drag/Drop visual feedback hooks
  doc.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    doc.dropzone.classList.add('dragover');
  });
  
  doc.dropzone.addEventListener('dragleave', () => {
    doc.dropzone.classList.remove('dragover');
  });
  
  doc.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    doc.dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleIngestedFile(files[0]);
    }
  });

  doc.fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleIngestedFile(files[0]);
    }
  });

  // Ingestion: Adapt text loading triggers
  doc.btnLoadText.addEventListener('click', () => {
    const text = doc.textInput.value.trim();
    if (!text) {
      alert('Please paste some text, load a demo, or drag a document file to adapt.');
      return;
    }
    loadTextIntoReader(text);
  });

  // Reader Toolbar Navigation
  doc.btnBackUpload.addEventListener('click', () => {
    TTS.stop();
    resetSpeechButtons();
    doc.panelReader.style.display = 'none';
    doc.panelUpload.style.display = 'block';
    doc.readerWorkspace.classList.add('show-upload');
    
    // Reset PDF document layouts
    appState.pdfDoc = null;
    doc.btnViewPdf.disabled = true;
    doc.pdfCanvasContainer.innerHTML = '';
    switchLayoutView('reflowed');
  });

  // Synchronized TTS triggers
  doc.btnPlay.addEventListener('click', handleSpeechPlay);
  doc.btnPause.addEventListener('click', handleSpeechPause);
  doc.btnStop.addEventListener('click', handleSpeechStop);
  doc.voiceSpeed.addEventListener('input', (e) => {
    doc.voiceSpeedVal.textContent = `${e.target.value}x`;
    Tracker.logReadingSpeed(e.target.value);
    
    // If speaking, restart live audio using current speed settings
    if (appState.isPlaying && !appState.isPaused) {
      handleSpeechPlay();
    }
  });

  // Clicking single words inside reader content
  doc.readerContent.addEventListener('click', (e) => {
    const target = e.target.closest('.word');
    if (target) {
      const wordText = target.getAttribute('data-clean-word');
      const wordIdx = parseInt(target.getAttribute('data-word-idx'));
      
      // Speak the selected word immediately
      speakSingleWord(wordText);
      
      // Trigger Decoder API details
      openWordDecoder(wordText, wordIdx);
    }

    // Handle paragraph-level simplify trigger buttons
    const simplifyBtn = e.target.closest('.para-action-btn');
    if (simplifyBtn) {
      const paraIdx = parseInt(simplifyBtn.getAttribute('data-para-idx'));
      const paragraphs = doc.readerContent.querySelectorAll('.reader-para');
      if (paragraphs[paraIdx]) {
        // Strip out actions button content from the HTML representation to get clean text
        const paraText = Array.from(paragraphs[paraIdx].querySelectorAll('.word'))
          .map(el => el.textContent)
          .join(' ');
        
        openTextSimplifier(paraText, paraIdx);
      }
    }
  });

  // Highlight/selection text simplification support
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

  // Word Decoder pronounce button
  doc.btnSpeakTarget.addEventListener('click', () => {
    if (doc.targetWord.textContent) {
      speakSingleWord(doc.targetWord.textContent);
    }
  });

  // Text Simplifier: Replace inside Reader view
  doc.btnReplaceOriginal.addEventListener('click', () => {
    if (lastSimplifiedParagraphIdx !== -1 && doc.simplifiedResult.textContent) {
      replaceParagraphWithSimplified(lastSimplifiedParagraphIdx, doc.simplifiedResult.textContent);
    }
  });

  // Teacher Digest Dashboard
  doc.btnRefreshDigest.addEventListener('click', refreshTeacherDigest);
  doc.btnClearDigest.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all logged telemetry charts and difficulty lists?')) {
      Tracker.clearLogs();
      refreshTeacherDigest();
    }
  });
  doc.btnExportDigest.addEventListener('click', () => {
    const reportText = Tracker.exportDigestReport();
    
    // Create text file download stream
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Read'Em_Weekly_Literacy_Digest_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  });
}

/* ==================== WORKSPACE NAVIGATION ==================== */
function switchRole(role) {
  // Hide landing portal
  doc.viewLandingPortal.classList.remove('active');
  doc.readerWorkspace.classList.remove('active');
  doc.teacherWorkspace.classList.remove('active');

  // Show header logout button
  doc.btnLogout.style.display = 'block';

  if (role === 'reader') {
    doc.readerWorkspace.classList.add('active');
    appState.role = 'reader';
  } else if (role === 'teacher') {
    doc.teacherWorkspace.classList.add('active');
    appState.role = 'teacher';
    refreshTeacherDigest();
  }
}

function handleTeacherLogin() {
  const pin = doc.teacherPin.value;
  if (pin === 'teacher123') {
    doc.teacherPin.value = ''; // clear PIN
    switchRole('teacher');
  } else {
    alert('Access Denied: Invalid Teacher PIN.');
  }
}

function logOut() {
  // Hide workspaces
  doc.readerWorkspace.classList.remove('active');
  doc.teacherWorkspace.classList.remove('active');
  doc.btnLogout.style.display = 'none';

  // Show landing view
  doc.viewLandingPortal.classList.add('active');
  appState.role = null;
}

function switchLayoutView(view) {
  doc.btnViewReflowed.classList.remove('active');
  doc.btnViewPdf.classList.remove('active');

  if (view === 'reflowed') {
    doc.btnViewReflowed.classList.add('active');
    doc.readerContent.style.display = 'block';
    doc.pdfCanvasContainer.style.display = 'none';
    
    // Show visual aid ruler if active
    if (appState.rulerActive) {
      doc.readerRuler.style.display = 'block';
    }
  } else if (view === 'pdf') {
    doc.btnViewPdf.classList.add('active');
    doc.readerContent.style.display = 'none';
    doc.pdfCanvasContainer.style.display = 'flex';
    doc.readerRuler.style.display = 'none'; // hide ruler in raw PDF layout
    
    // Trigger PDF rendering if not already rendered
    if (appState.pdfDoc) {
      renderPDFCanvasPages(appState.pdfDoc);
    }
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
      const viewport = page.getViewport({ scale: 1.5 }); // High-DPI scale render
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
    }
  } catch (err) {
    console.error('PDF rendering failed:', err);
    doc.pdfCanvasContainer.innerHTML = `<span style="color:var(--color-danger)">Failed to render original PDF: ${err.message}</span>`;
  }
}

/* ==================== API CREDENTIAL DRAWER ==================== */
function openApiModal() {
  const keys = AIService.getKeys();
  doc.inputOpenAIKey.value = keys.openai;
  doc.inputExaKey.value = keys.exa;
  doc.inputElevenLabsKey.value = keys.elevenlabs;
  doc.selectElevenLabsModel.value = keys.elevenlabsModel || 'eleven_turbo_v2_5';
  doc.modalApiSettings.style.display = 'flex';
}

function closeApiModal() {
  doc.modalApiSettings.style.display = 'none';
}

function saveApiKeys() {
  const openai = doc.inputOpenAIKey.value.trim();
  const exa = doc.inputExaKey.value.trim();
  const elevenlabs = doc.inputElevenLabsKey.value.trim();
  const elevenlabsModel = doc.selectElevenLabsModel.value;
  
  AIService.saveKeys(openai, exa, elevenlabs, elevenlabsModel);
  updateApiStatusIndicator();
  initVoiceList();
  closeApiModal();
}

function updateApiStatusIndicator() {
  if (AIService.hasKeys()) {
    doc.apiStatusIndicator.className = 'mode-indicator-box success-banner';
    doc.apiStatusIndicator.innerHTML = '<i class="fa-solid fa-toggle-on"></i> Running in: <strong>Live Intelligent AI Mode (OpenAI / ElevenLabs)</strong>';
  } else {
    doc.apiStatusIndicator.className = 'mode-indicator-box';
    doc.apiStatusIndicator.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Running in: <strong>Simulation & Demo Mode (High Fidelity)</strong>';
  }
}

/* ==================== DOCUMENT INGESTION LOGIC ==================== */
async function handleIngestedFile(file) {
  // Update UI loading states inside the dropzone
  const oldText = doc.dropzone.innerHTML;
  doc.dropzone.innerHTML = `
    <i class="fa-solid fa-circle-notch fa-spin dropzone-icon"></i>
    <p>Ingesting <strong>${file.name}</strong>...</p>
    <span>Extracting raw content automatically</span>
  `;
  
  try {
    let rawContent = '';
    
    // Deduce subject from file name hints
    if (file.name.toLowerCase().includes('math')) {
      appState.subject = 'Mathematics';
    } else if (file.name.toLowerCase().includes('sci') || file.name.toLowerCase().includes('bio')) {
      appState.subject = 'Science';
    } else if (file.name.toLowerCase().includes('hist') || file.name.toLowerCase().includes('roman')) {
      appState.subject = 'History';
    } else {
      appState.subject = 'General';
    }
    
    doc.subjectBadge.innerHTML = `<i class="fa-solid fa-tag"></i> ${appState.subject}`;

    // Deduce file type
    if (file.name.endsWith('.pdf')) {
      rawContent = await extractTextFromPDF(file);
      
      // Load PDF document for original layout canvas rendering
      const reader = new FileReader();
      reader.onload = async function (e) {
        const typedarray = new Uint8Array(e.target.result);
        try {
          appState.pdfDoc = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
          doc.btnViewPdf.disabled = false;
        } catch (err) {
          console.error('Failed to load PDF doc for rendering:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      appState.pdfDoc = null;
      doc.btnViewPdf.disabled = true;
      
      if (file.name.endsWith('.txt')) {
        rawContent = await readTextFile(file);
      } else if (file.type.startsWith('image/')) {
        // OCR vision ingestion!
        if (!AIService.hasKeys()) {
          throw new Error('An OpenAI API Key is required to perform OCR image transcription. Please add your key in the settings drawer.');
        }
        rawContent = await AIService.transcribeImage(file);
      } else {
        throw new Error('Unsupported format. Please upload PDF, TXT or worksheet image.');
      }
    }

    doc.textInput.value = rawContent;
    loadTextIntoReader(rawContent);
  } catch (err) {
    alert(err.message);
  } finally {
    doc.dropzone.innerHTML = oldText;
  }
}

// Convert plain text, construct interactive DOM spans, and boot up the reading dashboard
function loadTextIntoReader(text) {
  appState.rawText = text;
  
  // Format into word boundaries
  appState.parsedData = TTS.parseText(text);
  
  // Populate reader DOM
  doc.readerContent.innerHTML = appState.parsedData.html;
  
  // Sync metadata
  doc.readerSubject.textContent = appState.subject;
  
  // Set formatting states
  doc.toggleChunking.checked = false;
  doc.toggleBionic.checked = false;
  doc.readerContent.className = 'font-lexend'; // Reset bionic formats
  
  doc.panelUpload.style.display = 'none';
  doc.panelReader.style.display = 'block';
  doc.readerWorkspace.classList.remove('show-upload');
  
  // Close any old AI panel states
  doc.aiDictContent.style.display = 'none';
  doc.aiDictEmpty.style.display = 'block';
  doc.aiSimplifierContent.style.display = 'none';
  doc.aiSimplifierEmpty.style.display = 'block';
}

/* ==================== FORMATTING LOGIC ==================== */
function applyTypographyStyles() {
  document.documentElement.style.setProperty('--user-font-size', `${doc.fontSize.value}px`);
  document.documentElement.style.setProperty('--user-line-height', doc.lineHeight.value);
  document.documentElement.style.setProperty('--user-letter-spacing', `${doc.letterSpacing.value}em`);
  document.documentElement.style.setProperty('--user-word-spacing', `${doc.wordSpacing.value}em`);
  
  // Clear font family selection classes
  doc.readerContent.classList.remove('font-lexend', 'font-opendyslexic', 'font-inter', 'font-system');
  doc.readerContent.classList.add(doc.fontFamily.value);
}

// Parse first letters of word elements to bold them
function applyBionicFormatting(active) {
  const words = doc.readerContent.querySelectorAll('.word');
  
  words.forEach(wordSpan => {
    if (active) {
      // Check if already formatted
      if (!wordSpan.hasAttribute('data-original-text')) {
        const text = wordSpan.textContent.trim();
        wordSpan.setAttribute('data-original-text', text);
        
        // Calculate fixation split (45%)
        const splitLen = Math.max(1, Math.ceil(text.length * 0.45));
        const boldPart = text.substring(0, splitLen);
        const lightPart = text.substring(splitLen);
        
        wordSpan.innerHTML = `<strong class="bionic-bold">${boldPart}</strong><span class="bionic-light">${lightPart}</span>`;
      }
    } else {
      if (wordSpan.hasAttribute('data-original-text')) {
        wordSpan.innerHTML = wordSpan.getAttribute('data-original-text');
        wordSpan.removeAttribute('data-original-text');
      }
    }
  });
}

/* ==================== SPEECH CONTROLLER LOGIC ==================== */
function handleSpeechPlay() {
  if (!appState.parsedData) return;
  
  if (appState.isPaused) {
    TTS.resume();
    appState.isPaused = false;
    toggleSpeechButtons(true);
    return;
  }

  const rate = parseFloat(doc.voiceSpeed.value);
  const voiceName = doc.voiceSelect.value;

  appState.isPlaying = true;
  appState.isPaused = false;
  toggleSpeechButtons(true);

  TTS.speak(
    appState.parsedData,
    { voiceName, rate },
    (wordIdx) => {
      // Word Highlight boundary sync event
      highlightWordInReader(wordIdx);
    },
    () => {
      // End of speech callback
      resetSpeechButtons();
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
  // Clean last highlighted span
  const oldHigh = doc.readerContent.querySelector('.word.highlighted');
  if (oldHigh) oldHigh.classList.remove('highlighted');
  
  const targetSpan = document.getElementById(`word-${wordIdx}`);
  if (targetSpan) {
    targetSpan.classList.add('highlighted');
    appState.activeWordIdx = wordIdx;
    
    // Automatically center text scrolling if line moves out of focus view
    targetSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Log audio repeat telemetry patterns passively if word is spoken again
    const wordText = targetSpan.getAttribute('data-clean-word');
    Tracker.logWordDifficulty(wordText, appState.subject, 'audio_repeat');
  }
}

function toggleSpeechButtons(playing) {
  if (playing) {
    doc.btnPlay.style.display = 'none';
    doc.btnPause.style.display = 'inline-flex';
  } else {
    doc.btnPlay.style.display = 'inline-flex';
    doc.btnPause.style.display = 'none';
  }
}

function resetSpeechButtons() {
  doc.btnPlay.style.display = 'inline-flex';
  doc.btnPause.style.display = 'none';
  
  appState.isPlaying = false;
  appState.isPaused = false;
  
  const highlighted = doc.readerContent.querySelector('.word.highlighted');
  if (highlighted) highlighted.classList.remove('highlighted');
}

/* ==================== AI DECODER PANEL (RIGHT DRAWER) ==================== */
async function openWordDecoder(wordText, wordIdx) {
  // Open loading layout
  doc.aiDictEmpty.style.display = 'none';
  doc.aiDictContent.style.display = 'block';
  
  doc.targetWord.textContent = wordText;
  doc.syllablesChunked.innerHTML = `<span><i class="fa-solid fa-spinner fa-spin"></i> Breaking syllables...</span>`;
  doc.phoneticGuide.innerHTML = `<i>Pronouncing...</i>`;
  doc.wordDefinition.innerHTML = `<span style="color:var(--text-muted)">Querying dictionary...</span>`;
  doc.exaAnalogy.innerHTML = `<span style="color:var(--text-muted)">Generating simple analogy...</span>`;
  doc.exaCitations.style.display = 'none';
  doc.exaCitations.innerHTML = '';

  try {
    const data = await AIService.decodeWord(wordText, appState.subject);
    
    // Syllables Chips
    doc.syllablesChunked.innerHTML = data.syllables.map(s => `<span>${s}</span>`).join('');
    
    // Phonetics
    doc.phoneticGuide.textContent = data.phonetics;
    
    // Definition
    doc.wordDefinition.textContent = data.definition;
    
    // Exa Analogy
    doc.exaAnalogy.textContent = data.analogy;
    
    // Exa Citations
    if (data.citations && data.citations.length > 0) {
      doc.exaCitations.style.display = 'block';
      doc.exaCitations.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px; font-weight: bold; border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 8px;">
          <i class="fa-solid fa-magnifying-glass" style="margin-right: 4px; color: var(--color-primary);"></i> Sources (via Exa Search):
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${data.citations.map(c => `
            <a href="${c.url}" target="_blank" class="citation-link" style="font-size: 0.8rem; color: var(--color-primary); text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.65rem;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${c.title || c.url}</span>
            </a>
          `).join('')}
        </div>
      `;
    }
    
    // Telemetry log details
    Tracker.logWordDifficulty(wordText, appState.subject, 'define');
    Tracker.logWordDifficulty(wordText, appState.subject, 'syllify');
  } catch (err) {
    doc.wordDefinition.textContent = 'Could not retrieve definition details.';
    doc.exaAnalogy.textContent = 'Analogy lookup error occurred.';
  }
}

async function openTextSimplifier(paraText, paraIdx) {
  doc.aiSimplifierEmpty.style.display = 'none';
  doc.aiSimplifierContent.style.display = 'block';
  doc.btnReplaceOriginal.disabled = true;

  doc.simplifiedOriginal.textContent = `"${paraText.substring(0, 100)}..."`;
  doc.simplifiedResult.innerHTML = `<span><i class="fa-solid fa-circle-notch fa-spin"></i> Rewriting complex sentences... preserving subject terminology...</span>`;

  lastSimplifiedParagraphIdx = paraIdx;

  try {
    const simplifiedText = await AIService.simplifyParagraph(paraText, appState.subject);
    
    doc.simplifiedResult.textContent = simplifiedText;
    doc.btnReplaceOriginal.disabled = false;
    
    // Passive telemetry log
    Tracker.logSentenceSimplification(paraText, simplifiedText, appState.subject);
  } catch (err) {
    doc.simplifiedResult.textContent = `Simplification failed: ${err.message}`;
  }
}

// Replace paragraph content with simplified text
function replaceParagraphWithSimplified(paraIdx, newText) {
  const paragraphs = doc.readerContent.querySelectorAll('.reader-para');
  if (paragraphs[paraIdx]) {
    // Generate new word spans and structures for the simplified text
    const reParsed = TTS.parseText(newText);
    
    // We want to replace the HTML of just this paragraph but keep paragraph boundaries
    // Extract paragraph inner HTML (without the trailing button)
    const container = document.createElement('div');
    container.innerHTML = reParsed.html;
    const innerContent = container.querySelector('.reader-para').innerHTML;
    
    paragraphs[paraIdx].innerHTML = innerContent;
    
    // Reapply bionic mapping if active
    if (doc.toggleBionic.checked) {
      applyBionicFormatting(true);
    }

    // Reapply font adjustments
    applyTypographyStyles();

    alert('Paragraph replaced inline with simplified structure!');
  }
}

/* ==================== TEACHER VIEW UPDATES ==================== */
function refreshTeacherDigest() {
  const stats = Tracker.getStats();
  const words = Tracker.getWordDigest();
  const sentences = Tracker.getSentenceDigest();

  // Populate counters
  doc.statWordsCount.textContent = stats.totalStruggledWords;
  doc.statSimplifications.textContent = stats.totalSimplifications;
  doc.statAvgSpeed.textContent = stats.avgSpeed;

  // Render Word list table
  if (words.length === 0) {
    doc.struggledWordsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="table-empty">No reading sessions recorded yet. Student struggles will show here.</td>
      </tr>
    `;
  } else {
    doc.struggledWordsTbody.innerHTML = words.map(w => {
      const badgeClass = `difficulty-${w.difficulty}`;
      return `
        <tr>
          <td><strong>${w.word}</strong></td>
          <td><span class="reader-mode-indicator">${w.subject}</span></td>
          <td>${w.actionsTriggered}</td>
          <td><span class="difficulty-badge ${badgeClass}">${w.difficulty}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Render Sentences Simplified list
  if (sentences.length === 0) {
    doc.simplifiedSentencesList.innerHTML = `
      <p class="table-empty">No sentences simplified yet. Areas of reading fatigue will register here.</p>
    `;
  } else {
    doc.simplifiedSentencesList.innerHTML = sentences.map(s => `
      <div class="sentence-digest-item">
        <div class="sentence-digest-original"><strong>Original textbook text:</strong> "${s.original}"</div>
        <div class="sentence-digest-simplified"><strong>AI Simplified text:</strong> "${s.simplified}"</div>
        <div class="sentence-digest-meta"><i class="fa-solid fa-tag"></i> ${s.subject} &bull; <i class="fa-regular fa-clock"></i> ${new Date(s.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');
  }
}
