const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const cors = require('cors');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const app = express();
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(UPLOAD_DIR));

const dbPath = path.join(__dirname, 'uploads.db');
const db = new Database(dbPath);
db.exec(`
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  filename TEXT,
  originalName TEXT,
  mime TEXT,
  size INTEGER,
  uploadedAt TEXT,
  uploader TEXT,
  ctx TEXT
);
`);

// NOTE: add mapping column if not exists (simple migration)
try {
  db.exec(`ALTER TABLE uploads ADD COLUMN mapping TEXT;`);
} catch (e) {
  // ignore if column exists
}
// NOTE: add extraction column if not exists
try {
  db.exec(`ALTER TABLE uploads ADD COLUMN extraction TEXT;`);
} catch (e) {
  // ignore if column exists
}
// NOTE: add mappingAccepted columns
try {
  db.exec(`ALTER TABLE uploads ADD COLUMN mappingAccepted INTEGER DEFAULT 0;`);
  db.exec(`ALTER TABLE uploads ADD COLUMN mappingAcceptedAt TEXT;`);
} catch (e) {
  // ignore
}

// mappings audit table for history and indexing
try {
  db.exec(`CREATE TABLE IF NOT EXISTS mappings (
    mapping_id TEXT PRIMARY KEY,
    upload_id TEXT,
    mapping_json TEXT,
    extraction_json TEXT,
    error TEXT,
    preview TEXT,
    created_at TEXT,
    method TEXT,
    accepted_by_user TEXT
  );`);
} catch (e) {
  // ignore
}

// Add processing/status columns if missing
try {
  db.exec(`ALTER TABLE uploads ADD COLUMN status TEXT DEFAULT 'ready';`);
  db.exec(`ALTER TABLE uploads ADD COLUMN processingStartedAt TEXT;`);
  db.exec(`ALTER TABLE uploads ADD COLUMN processingFinishedAt TEXT;`);
  db.exec(`ALTER TABLE uploads ADD COLUMN processingError TEXT;`);
} catch (e) {
  // ignore
}

const { normalizeMapping } = require('./lib/normalizer');

// Execution model & performance settings
const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024; // 20MB multer already enforces
const LARGE_PDF_BYTES = 2 * 1024 * 1024; // >2MB -> background processing
const EXTRACTION_TIMEOUT_MS = 30 * 1000; // 30s extraction timeout

// In-memory queue and SSE subscribers
const processingQueue = [];
let workerRunning = false;
const sseSubscribers = new Map(); // id -> Set of res

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);
}

async function processOneJob() {
  const job = processingQueue.shift();
  if (!job) {
    workerRunning = false;
    return;
  }
  workerRunning = true;
  const { id, filePath } = job;
  try {
    db.prepare('UPDATE uploads SET status = ?, processingStartedAt = ? WHERE id = ?').run('processing', new Date().toISOString(), id);
    broadcastStatus(id, { status: 'processing' });
    const extraction = await withTimeout(extractPdf(filePath), EXTRACTION_TIMEOUT_MS);
      try { db.prepare('UPDATE uploads SET extraction = ? WHERE id = ?').run(JSON.stringify(extraction), id); } catch (e) { console.warn('persist extraction failed', e.message); }
      const rawMapping = mapExtraction(extraction);
      const mapping = normalizeMapping(rawMapping) || null;
    // check whether user already accepted mapping; if so, skip overwrite and audit
    try {
      const acceptRow = db.prepare('SELECT mappingAccepted FROM uploads WHERE id = ?').get(id) || {};
      if (acceptRow.mappingAccepted) {
        persistMappingAudit(id, mapping, 'heuristic', null, extraction, 'skipped: mappingAccepted');
        db.prepare('UPDATE uploads SET status = ?, processingFinishedAt = ? WHERE id = ?').run('skipped', new Date().toISOString(), id);
        broadcastStatus(id, { status: 'skipped', reason: 'mappingAccepted' });
      } else {
        try { db.prepare('UPDATE uploads SET mapping = ?, status = ?, processingFinishedAt = ? WHERE id = ?').run(JSON.stringify(mapping), 'done', new Date().toISOString(), id); } catch (e) { console.warn('persist mapping failed', e.message); }
        // audit (include extraction for failed reproduction)
        persistMappingAudit(id, mapping, 'heuristic', null, extraction, null);
        broadcastStatus(id, { status: 'done', mapping });
      }
    } catch (e) {
      console.warn('post-process accept check failed', e && e.message);
    }
  } catch (err) {
    console.error('background extract/map failed', err && err.message);
    try { db.prepare('UPDATE uploads SET status = ?, processingError = ? WHERE id = ?').run('error', String(err && err.message), id); } catch (e) { /* ignore */ }
    broadcastStatus(id, { status: 'error', error: String(err && err.message) });
  } finally {
    // process next
    setImmediate(processOneJob);
  }
}

function enqueueProcessing(id, filePath) {
  processingQueue.push({ id, filePath });
  if (!workerRunning) setImmediate(processOneJob);
}

function broadcastStatus(id, payload) {
  const subs = sseSubscribers.get(id);
  if (!subs) return;
  const data = JSON.stringify(payload);
  for (const res of subs) {
    try {
      res.write(`event: status\n`);
      res.write(`data: ${data}\n\n`);
    } catch (e) { /* ignore */ }
  }
}

function truncateString(s, n = 300) {
  if (s == null) return null;
  const str = typeof s === 'string' ? s : JSON.stringify(s);
  if (str.length <= n) return str;
  return str.slice(0, n) + '...';
}

function mappingSummary(mappingObj, maxLen = 200) {
  if (!mappingObj || typeof mappingObj !== 'object') return null;
  const out = {};
  for (const k of Object.keys(mappingObj)) {
    try {
      const v = mappingObj[k];
      if (v && typeof v === 'object' && 'value' in v) {
        if (Array.isArray(v.value)) out[k] = truncateString(v.value.join(', '), maxLen);
        else out[k] = truncateString(String(v.value), maxLen);
      } else {
        out[k] = truncateString(v, maxLen);
      }
    } catch (e) {
      out[k] = '[error]';
    }
  }
  return out;
}

function persistMappingAudit(uploadId, mappingObj, method = 'heuristic', acceptedByUser = null, extractionObj = null, errorText = null) {
  try {
    const mappingId = uuidv4();
    const preview = mappingObj ? JSON.stringify(mappingSummary(mappingObj)) : null;
    const stmt = db.prepare('INSERT INTO mappings (mapping_id, upload_id, mapping_json, extraction_json, error, preview, created_at, method, accepted_by_user) VALUES (?,?,?,?,?,?,?,?,?)');
    stmt.run(mappingId, uploadId, mappingObj ? JSON.stringify(mappingObj) : null, extractionObj ? JSON.stringify(extractionObj) : null, errorText || null, preview, new Date().toISOString(), method, acceptedByUser || null);
    // Log a short summary to aid observability
    console.info('mapping_audit', { uploadId, mappingPreview: preview, method, acceptedByUser, error: errorText ? truncateString(errorText, 200) : null });
  } catch (e) {
    console.warn('persistMappingAudit failed', e && e.message);
  }
}

// SSE subscribe endpoint will be added later

app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  const uploader = req.body.uploader || null;
  const ctx = req.body.ctx || null;
  const records = [];

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const insert = db.prepare('INSERT INTO uploads (id, filename, originalName, mime, size, uploadedAt, uploader, ctx) VALUES (@id,@filename,@originalName,@mime,@size,@uploadedAt,@uploader,@ctx)');

  for (const f of req.files) {
    const id = path.parse(f.filename).name;
    const row = {
      id,
      filename: f.filename,
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
      uploadedAt: new Date().toISOString(),
      uploader,
      ctx
    };
    insert.run(row);
    // If it's a PDF, decide sync vs background based on size
    if ((row.mime && row.mime.includes('pdf')) || path.extname(row.filename).toLowerCase() === '.pdf') {
      const filePath = path.join(UPLOAD_DIR, row.filename);
      // small PDFs: attempt synchronous extraction with timeout
      if (row.size <= LARGE_PDF_BYTES) {
        try {
          const extraction = await withTimeout(extractPdf(filePath), EXTRACTION_TIMEOUT_MS);
          try { db.prepare('UPDATE uploads SET extraction = ? WHERE id = ?').run(JSON.stringify(extraction), id); } catch (e) { console.warn('persist extraction failed', e.message); }
          const rawMapping = mapExtraction(extraction);
          const mapping = normalizeMapping(rawMapping) || null;
          // respect user-accepted mapping: do not overwrite if mappingAccepted
          try {
            const acceptRow = db.prepare('SELECT mappingAccepted FROM uploads WHERE id = ?').get(id) || {};
            if (acceptRow.mappingAccepted) {
              persistMappingAudit(id, mapping, 'heuristic', null, extraction, 'skipped: mappingAccepted');
              try { db.prepare('UPDATE uploads SET status = ? WHERE id = ?').run('skipped', id); } catch (e) { /* ignore */ }
            } else {
              try { db.prepare('UPDATE uploads SET mapping = ?, status = ? WHERE id = ?').run(JSON.stringify(mapping), 'done', id); } catch (e) { console.warn('persist mapping failed', e.message); }
              // audit
              persistMappingAudit(id, mapping, 'heuristic', null, extraction, null);
            }
          } catch (e) {
            console.warn('accept check failed', e && e.message);
          }
          row.extraction = extraction;
          row.mapping = mapping;
        } catch (e) {
          console.warn('post-upload extract/map failed (small pdf)', e && e.message);
          // mark as error but keep file
          try { db.prepare('UPDATE uploads SET status = ?, processingError = ? WHERE id = ?').run('error', String(e && e.message), id); } catch (err) { /* ignore */ }
        }
      } else {
        // large PDF: background processing
        try {
          db.prepare('UPDATE uploads SET status = ?, processingStartedAt = ? WHERE id = ?').run('queued', null, id);
        } catch (e) { /* ignore */ }
        enqueueProcessing(id, filePath);
        // return metadata with processing status; mapping will be available later
        row.status = 'queued';
      }
    }
    records.push(row);
  }

  res.json({ ok: true, files: records });
});

app.get('/api/upload/:id', (req, res) => {
  const id = req.params.id;
  const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ file: row });
});

// PDF extraction endpoint - returns pages[] and plainText
const { extractPdf } = require('./lib/pdfExtractor');
const { mapExtraction } = require('./lib/mapper');

app.get('/api/extract/:id', async (req, res) => {
  const id = req.params.id;
  const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });

  const filePath = path.join(UPLOAD_DIR, row.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file missing' });

  // Only attempt extraction for PDFs
  const isPdf = (row.mime && row.mime.includes('pdf')) || path.extname(row.filename).toLowerCase() === '.pdf';
  if (!isPdf) return res.status(400).json({ error: 'not a pdf' });

  try {
    const result = await extractPdf(filePath);
    // persist extraction JSON
    try {
      const stmt = db.prepare('UPDATE uploads SET extraction = ? WHERE id = ?');
      stmt.run(JSON.stringify(result), id);
    } catch (e) {
      console.warn('failed to persist extraction', e.message);
    }
    res.json({ ok: true, id, file: row, result });
  } catch (err) {
    console.error('extract error', err);
    res.status(500).json({ error: 'extraction_failed', message: err.message });
  }
});

// Return cached extraction if present
app.get('/api/extraction/:id', (req, res) => {
  const id = req.params.id;
  const row = db.prepare('SELECT extraction FROM uploads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (!row.extraction) return res.status(404).json({ error: 'extraction_not_found' });
  try {
    const parsed = JSON.parse(row.extraction);
    res.json({ ok: true, id, extraction: parsed });
  } catch (e) {
    res.status(500).json({ error: 'invalid_extraction_data' });
  }
});

// Return cached mapping if present
app.get('/api/mapping/:id', (req, res) => {
  const id = req.params.id;
  const row = db.prepare('SELECT mapping FROM uploads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (!row.mapping) {
    // check status
    const statusRow = db.prepare('SELECT status, processingError FROM uploads WHERE id = ?').get(id) || {};
    if (statusRow.status === 'processing' || statusRow.status === 'queued') {
      return res.status(202).json({ ok: true, status: statusRow.status });
    }
    if (statusRow.status === 'error') return res.status(500).json({ error: 'processing_error', message: statusRow.processingError });
    return res.status(404).json({ error: 'mapping_not_found' });
  }
  try {
    const parsed = JSON.parse(row.mapping);
    // normalize before returning (idempotent)
    const normalized = normalizeMapping(parsed) || parsed;
    res.json({ ok: true, id, mapping: normalized });
  } catch (e) {
    res.status(500).json({ error: 'invalid_mapping_data' });
  }
});

// Mapping preview for debugging: returns last few audit entries and the current mapping preview
app.get('/api/mapping/:id/preview', (req, res) => {
  const id = req.params.id;
  const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  try {
    const audits = db.prepare('SELECT mapping_id, created_at, method, accepted_by_user, preview, error FROM mappings WHERE upload_id = ? ORDER BY created_at DESC LIMIT 5').all(id);
    const current = row.mapping ? ((() => { try { return JSON.parse(row.mapping); } catch (e) { return null; } })()) : null;
    res.json({ ok: true, id, status: row.status || 'unknown', mappingPreview: current ? mappingSummary(current) : null, audits });
  } catch (e) {
    res.status(500).json({ error: 'preview_failed', message: e.message });
  }
});

// SSE subscribe for mapping status updates
app.get('/api/subscribe/:id', (req, res) => {
  const id = req.params.id;
  req.socket.setTimeout(0);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  let subs = sseSubscribers.get(id);
  if (!subs) { subs = new Set(); sseSubscribers.set(id, subs); }
  subs.add(res);
  // send initial status
  try {
    const row = db.prepare('SELECT status FROM uploads WHERE id = ?').get(id) || {};
    res.write(`event: status\n`);
    res.write(`data: ${JSON.stringify({ status: row.status || 'unknown' })}\n\n`);
  } catch (e) { /* ignore */ }
  req.on('close', () => {
    subs.delete(res);
  });
});

// Mapping endpoint: accept { id } OR { extraction } in body
app.post('/api/map', express.json(), async (req, res) => {
  let id = null;
  try {
    let extraction = null;
    id = req.body && req.body.id;
    if (id) {
      const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id);
      if (!row) return res.status(404).json({ error: 'upload_not_found' });
      // if mapping already exists, return it
  if (row.mappingAccepted) return res.status(409).json({ error: 'mapping_accepted', message: 'This mapping was accepted by the user and cannot be re-generated.' });
  if (row.mapping) {
        try {
          const parsed = JSON.parse(row.mapping);
          const normalizedExisting = normalizeMapping(parsed) || parsed;
          return res.json({ ok: true, mapping: normalizedExisting });
        } catch (e) {
          // fallthrough to remap
        }
      }
      // if processing already queued/ongoing, tell client to wait
      if (row.status === 'queued' || row.status === 'processing') {
        return res.status(202).json({ ok: true, status: row.status });
      }

      // attempt to fetch extraction by running extractor (fast for small PDFs)
      const filePath = path.join(UPLOAD_DIR, row.filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file_missing' });
      // mark as processing
      try { db.prepare('UPDATE uploads SET status = ?, processingStartedAt = ? WHERE id = ?').run('processing', new Date().toISOString(), id); } catch (e) { /* ignore */ }
      broadcastStatus(id, { status: 'processing' });

      extraction = await withTimeout(extractPdf(filePath), EXTRACTION_TIMEOUT_MS);
    } else if (req.body && req.body.extraction) {
      extraction = req.body.extraction;
    } else {
      return res.status(400).json({ error: 'missing id or extraction in body' });
    }

    const mapping = mapExtraction(extraction);
    const normalized = normalizeMapping(mapping) || null;

    // If id provided, persist extraction+mapping JSON into uploads.mapping
    if (id) {
      try {
        const stmt = db.prepare('UPDATE uploads SET extraction = ?, mapping = ?, status = ?, processingFinishedAt = ? WHERE id = ?');
        stmt.run(JSON.stringify(extraction), JSON.stringify(normalized), 'done', new Date().toISOString(), id);
      } catch (e) {
        console.warn('failed to persist mapping', e.message);
      }
      // audit with extraction for debugging
      persistMappingAudit(id, normalized, 'heuristic', null, extraction, null);
      broadcastStatus(id, { status: 'done', mapping: normalized });
    }

    res.json({ ok: true, mapping: normalized });
  } catch (err) {
    console.error('map error', err);
    if (id) {
      try { db.prepare('UPDATE uploads SET status = ?, processingError = ? WHERE id = ?').run('error', String(err && err.message), id); } catch (e) { /* ignore */ }
      broadcastStatus(id, { status: 'error', error: String(err && err.message) });
    }
    res.status(500).json({ error: 'mapping_failed', message: err.message });
  }
});

// Accept mapping: persist user-accepted mapping into uploads and mark accepted
app.post('/api/mapping/:id/accept', express.json(), (req, res) => {
  const id = req.params.id;
  const mapping = req.body && req.body.mapping;
  if (!mapping) return res.status(400).json({ error: 'missing mapping' });
  try {
    const normalized = normalizeMapping(mapping) || mapping;
    const stmt = db.prepare('UPDATE uploads SET mapping = ?, mappingAccepted = 1, mappingAcceptedAt = ? WHERE id = ?');
    stmt.run(JSON.stringify(normalized), new Date().toISOString(), id);
  // audit: record accepted mapping with user
  const user = req.body && req.body.user ? req.body.user : null;
  persistMappingAudit(id, normalized, 'heuristic', user, null, null);
    res.json({ ok: true });
  } catch (e) {
    console.error('accept mapping failed', e);
    res.status(500).json({ error: 'accept_failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Upload service listening on http://localhost:${PORT}`));
