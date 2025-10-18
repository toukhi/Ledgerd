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

app.post('/api/upload', upload.array('files', 10), (req, res) => {
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
    res.json({ ok: true, id, file: row, result });
  } catch (err) {
    console.error('extract error', err);
    res.status(500).json({ error: 'extraction_failed', message: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Upload service listening on http://localhost:${PORT}`));
