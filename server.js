/* ==========================================================================
   Read'Em Server (server.js)
   - Serves the dist/ static build
   - Proxies AI calls to Huawei Cloud (OCR, NLP) with HMAC-SHA256 signing
   ========================================================================== */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'dist');

// Server-to-server API key that the browser sends to authenticate proxy calls
const SERVER_API_KEY = process.env.SERVER_API_KEY || 'readem-dev-key';

// Huawei Cloud credentials — never sent to the browser
const HUAWEI_AK = process.env.HUAWEI_AK || '';
const HUAWEI_SK = process.env.HUAWEI_SK || '';
const HUAWEI_PROJECT_ID = process.env.HUAWEI_PROJECT_ID || '';
const HUAWEI_REGION = process.env.HUAWEI_REGION || 'ap-southeast-1';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

/* ==================== HUAWEI CLOUD HMAC-SHA256 SIGNING ==================== */
// Implements Huawei Cloud's SDK-HMAC-SHA256 signature scheme.
// Docs: https://support.huaweicloud.com/intl/en-us/devg-apisign/api-sign-algorithm.html
function huaweiSignHeaders(method, host, urlPath, bodyStr, ak, sk) {
  // ISO 8601 UTC, no separators, no milliseconds: 20240101T120000Z
  const now = new Date();
  const xSdkDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const bodyHash = crypto.createHash('sha256').update(bodyStr || '', 'utf8').digest('hex');
  const signedHeaderNames = 'content-type;host;x-sdk-date';
  const canonicalHeaders =
    `content-type:application/json\nhost:${host}\nx-sdk-date:${xSdkDate}\n`;

  const canonicalRequest = [
    method.toUpperCase(),
    urlPath,
    '',               // query string (none)
    canonicalHeaders,
    signedHeaderNames,
    bodyHash,
  ].join('\n');

  const requestHash = crypto
    .createHash('sha256')
    .update(canonicalRequest, 'utf8')
    .digest('hex');

  const stringToSign = ['SDK-HMAC-SHA256', xSdkDate, requestHash].join('\n');
  const signature = crypto
    .createHmac('sha256', sk)
    .update(stringToSign, 'utf8')
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'Host': host,
    'X-Sdk-Date': xSdkDate,
    'Authorization': `SDK-HMAC-SHA256 Access=${ak}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`,
  };
}

/* ==================== HUAWEI CLOUD HTTPS POST ==================== */
function huaweiPost(host, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const authHeaders = huaweiSignHeaders('POST', host, urlPath, bodyStr, HUAWEI_AK, HUAWEI_SK);
    const reqHeaders = {
      ...authHeaders,
      'Content-Length': Buffer.byteLength(bodyStr),
    };

    const req = https.request({ hostname: host, path: urlPath, method: 'POST', headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error_msg || parsed.message || `Huawei API HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Huawei API returned non-JSON response'));
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

/* ==================== REQUEST HELPERS ==================== */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(new Error('Invalid JSON request body')); }
    });
    req.on('error', reject);
  });
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function validateKey(req) {
  return req.headers['x-api-key'] === SERVER_API_KEY;
}

/* ==================== HUAWEI PROXY ROUTE HANDLERS ==================== */

// POST /api/huawei/ocr
// Body: { image: "<base64>" }
// Calls Huawei Cloud General Text Recognition OCR
async function handleOCR(req, res) {
  if (!HUAWEI_AK || !HUAWEI_SK || !HUAWEI_PROJECT_ID) {
    return jsonResponse(res, 503, {
      error: 'Huawei OCR not configured on this server. Set HUAWEI_AK, HUAWEI_SK, and HUAWEI_PROJECT_ID.',
    });
  }
  try {
    const body = await readBody(req);
    if (!body.image) return jsonResponse(res, 400, { error: 'Missing image field (base64)' });

    const host = `ocr.${HUAWEI_REGION}.myhuaweicloud.com`;
    const urlPath = `/v2/${HUAWEI_PROJECT_ID}/ocr/general-text`;

    const result = await huaweiPost(host, urlPath, {
      image: body.image,
      detect_direction: false,
      quick_mode: false,
    });

    // Flatten word blocks into a single string
    const blocks = result.result?.words_block_list || [];
    const text = blocks.map(b => b.words).join('\n');
    jsonResponse(res, 200, { text, provider: 'huawei-ocr' });
  } catch (e) {
    console.error('[Huawei OCR]', e.message);
    jsonResponse(res, 500, { error: e.message });
  }
}

// POST /api/huawei/nlp/simplify
// Body: { text: "...", subject: "..." }
// Calls Huawei NLP text summarization as a simplification proxy.
// Note: For richer simplification aligned to dyslexia needs, route this
// to a Huawei ModelArts endpoint running a custom instruction-tuned model.
async function handleNLPSimplify(req, res) {
  if (!HUAWEI_AK || !HUAWEI_SK || !HUAWEI_PROJECT_ID) {
    return jsonResponse(res, 503, { error: 'Huawei NLP not configured on this server.' });
  }
  try {
    const body = await readBody(req);
    if (!body.text) return jsonResponse(res, 400, { error: 'Missing text field' });

    const host = `nlp.${HUAWEI_REGION}.myhuaweicloud.com`;
    const urlPath = `/v1/${HUAWEI_PROJECT_ID}/nlp/text-summarization`;

    const result = await huaweiPost(host, urlPath, {
      content: body.text,
      type: 0,
    });

    const simplified = result.result?.summary || result.summary || body.text;
    jsonResponse(res, 200, { simplified, provider: 'huawei-nlp' });
  } catch (e) {
    console.error('[Huawei NLP]', e.message);
    jsonResponse(res, 500, { error: e.message });
  }
}

// POST /api/huawei/asr
// Body: { audio: "<base64 pcm16k16bit>", format: "pcm16k16bit" }
// Calls Huawei SIS (Speech Interaction Service) for oral reading transcription.
// Used by the Read Aloud Fluency Check feature — browser sends PCM audio captured
// via Web Audio API; server returns transcript for word-level accuracy scoring.
async function handleASR(req, res) {
  if (!HUAWEI_AK || !HUAWEI_SK || !HUAWEI_PROJECT_ID) {
    return jsonResponse(res, 503, { error: 'Huawei SIS not configured on this server.' });
  }
  try {
    const body = await readBody(req);
    if (!body.audio) return jsonResponse(res, 400, { error: 'Missing audio field (base64)' });

    const host = `sis.${HUAWEI_REGION}.myhuaweicloud.com`;
    const urlPath = `/v1/${HUAWEI_PROJECT_ID}/asr/short-audio`;

    const result = await huaweiPost(host, urlPath, {
      config: {
        audio_format: body.format || 'pcm16k16bit',
        property: 'english_16k_general',
        add_punc: 'yes',
        digit_norm: 'no',
      },
      data: body.audio,
    });

    // Huawei SIS returns transcript at result.result.text
    const transcript = result.result?.text || result.transcript || '';
    jsonResponse(res, 200, { transcript, provider: 'huawei-sis' });
  } catch (e) {
    console.error('[Huawei SIS]', e.message);
    jsonResponse(res, 500, { error: e.message });
  }
}

// POST /api/huawei/nlp/keywords
// Body: { text: "...", limit: 20 }
// Calls Huawei NLP keyword extraction for intelligent hard-word pre-flagging.
// Returns domain-specific and complex vocabulary identified by NLP (not just word length).
async function handleKeywords(req, res) {
  if (!HUAWEI_AK || !HUAWEI_SK || !HUAWEI_PROJECT_ID) {
    return jsonResponse(res, 503, { error: 'Huawei NLP not configured on this server.' });
  }
  try {
    const body = await readBody(req);
    if (!body.text) return jsonResponse(res, 400, { error: 'Missing text field' });

    const host = `nlp.${HUAWEI_REGION}.myhuaweicloud.com`;
    const urlPath = `/v1/${HUAWEI_PROJECT_ID}/nlp/keyword`;

    const result = await huaweiPost(host, urlPath, {
      text: body.text.slice(0, 2000),
      limit: body.limit || 25,
    });

    // result.result is [{word, weight}, ...]
    const keywords = (result.result || []).map(k => (k.word || k).toLowerCase());
    jsonResponse(res, 200, { keywords, provider: 'huawei-nlp' });
  } catch (e) {
    console.error('[Huawei NLP Keywords]', e.message);
    jsonResponse(res, 500, { error: e.message });
  }
}

// POST /api/huawei/nlp/translate
// Body: { text: "...", from: "en", to: "zh"|"ms"|"ta" }
// Calls Huawei NLP Machine Translation for mother-tongue bridging.
// Singapore context: supports zh (Mandarin), ms (Malay), ta (Tamil).
async function handleTranslate(req, res) {
  if (!HUAWEI_AK || !HUAWEI_SK || !HUAWEI_PROJECT_ID) {
    return jsonResponse(res, 503, { error: 'Huawei NLP not configured on this server.' });
  }
  try {
    const body = await readBody(req);
    if (!body.text || !body.to) return jsonResponse(res, 400, { error: 'Missing text or target language' });

    const host = `nlp.${HUAWEI_REGION}.myhuaweicloud.com`;
    const urlPath = `/v1/${HUAWEI_PROJECT_ID}/nlp/machine-translation`;

    const result = await huaweiPost(host, urlPath, {
      text: body.text.slice(0, 500),
      from: body.from || 'en',
      to: body.to,
    });

    const translation = result.translate_result || result.result || '';
    jsonResponse(res, 200, { translation, provider: 'huawei-mt' });
  } catch (e) {
    console.error('[Huawei MT]', e.message);
    jsonResponse(res, 500, { error: e.message });
  }
}

/* ==================== MAIN HTTP SERVER ==================== */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    });
    res.end();
    return;
  }

  // ---- HUAWEI PROXY ROUTES (/api/huawei/*) ----
  if (pathname.startsWith('/api/huawei/')) {
    if (!validateKey(req)) return jsonResponse(res, 401, { error: 'Unauthorized' });
    if (pathname === '/api/huawei/ocr'              && req.method === 'POST') return handleOCR(req, res);
    if (pathname === '/api/huawei/nlp/simplify'     && req.method === 'POST') return handleNLPSimplify(req, res);
    if (pathname === '/api/huawei/asr'              && req.method === 'POST') return handleASR(req, res);
    if (pathname === '/api/huawei/nlp/keywords'     && req.method === 'POST') return handleKeywords(req, res);
    if (pathname === '/api/huawei/nlp/translate'    && req.method === 'POST') return handleTranslate(req, res);
    return jsonResponse(res, 404, { error: 'Unknown proxy route' });
  }

  // ---- STATIC FILE SERVING ----
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403; res.end('Access Denied'); return;
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, fallback) => {
          if (err) { res.writeHead(500); res.end('Server Error: run npm run build first.'); }
          else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fallback, 'utf-8'); }
        });
      } else {
        res.writeHead(500); res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Read'Em server running at http://localhost:${PORT}`);
  if (HUAWEI_AK && HUAWEI_SK && HUAWEI_PROJECT_ID) {
    console.log(`  Huawei Cloud proxy ACTIVE (region: ${HUAWEI_REGION}, project: ${HUAWEI_PROJECT_ID})`);
    console.log(`  Routes: OCR | NLP simplify | ASR (fluency) | NLP keywords | NLP translate`);
  } else {
    console.log(`  Huawei Cloud proxy: NOT configured`);
    console.log(`  Set HUAWEI_AK, HUAWEI_SK, HUAWEI_PROJECT_ID (and optionally HUAWEI_REGION) to enable.`);
  }
});
