// Normalize mapping objects: trim strings, normalize dates to YYYY-MM-DD when possible,
// clamp confidences to [0,1] with two decimals, normalize URLs and ETH addresses,
// and ensure arrays are arrays of trimmed unique strings.
const ethRegex = /^0x[a-fA-F0-9]{40}$/;
const urlRegex = /https?:\/\/[^\s)]+/gi;

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const MAX_FIELD_LENGTH = 1000; // truncate extremely long values

const LABELS_TO_STRIP = [/^issued by[:\-\s]*/i, /^issuer[:\-\s]*/i, /^title[:\-\s]*/i, /^certificate[:\-\s]*/i, /^recipient[:\-\s]*/i];

function clampConfidence(v) {
  let n = Number(v) || 0;
  if (!isFinite(n)) n = 0;
  n = Math.max(0, Math.min(1, n));
  return Math.round(n * 100) / 100;
}

function tryParseDateToISO(s) {
  if (!s) return null;
  const str = String(s).trim();
  // quick normalize whitespace and non-breaking spaces
  const norm = str.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  // first try native parse for unambiguous ISO-ish formats
  const parsed = Date.parse(norm);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // try numeric formats: DD . MM . YYYY or DD/MM/YYYY or D-M-YYYY (allow spaces around separators)
  const m = norm.match(/^(\d{1,2})\s*[\.\/\-]\s*(\d{1,2})\s*[\.\/\-]\s*(\d{2,4})$/);
  if (m) {
    let day = m[1];
    let month = m[2];
    let year = m[3];
    if (year.length === 2) {
      year = Number(year) > 50 ? `19${year}` : `20${year}`;
    }
    const yyyy = year;
    const mm = String(Number(month)).padStart(2, '0');
    const dd = String(Number(day)).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // handle written month names in English and German (e.g., "12 März 2024", "March 12, 2024")
  const months = {
    jan: '01', january: '01', januar: '01', feb: '02', february: '02', februar: '02', mar: '03', march: '03', märz: '03', marz: '03', april: '04', apr: '04', may: '05', mai: '05', jun: '06', june: '06', juni: '06', jul: '07', july: '07', juli: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09', oct: '10', october: '10', oktober: '10', nov: '11', november: '11', dec: '12', december: '12', dezember: '12'
  };

  // match patterns like '12 March 2024', 'March 12 2024', '12 März 2024', allowing punctuation
  const written1 = norm.match(/^(\d{1,2})[\s,\.\-]*(\p{L}+)[\s,\.\-]*(\d{4})$/u);
  const written2 = norm.match(/^(\p{L}+)[\s,\.\-]*(\d{1,2})[\s,\.\-]*(\d{4})$/u);
  if (written1) {
    const day = String(Number(written1[1])).padStart(2, '0');
    const monRaw = String(written1[2]).toLowerCase();
    const year = written1[3];
    const monKey = monRaw.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const mm = months[monKey] || months[monRaw.slice(0,3)] || null;
    if (mm) return `${year}-${mm}-${day}`;
  }
  if (written2) {
    const monRaw = String(written2[1]).toLowerCase();
    const day = String(Number(written2[2])).padStart(2, '0');
    const year = written2[3];
    const monKey = monRaw.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const mm = months[monKey] || months[monRaw.slice(0,3)] || null;
    if (mm) return `${year}-${mm}-${day}`;
  }
  return null;
}

function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  const out = arr.map(s => String(s || '').trim()).filter(Boolean);
  return Array.from(new Set(out));
}

function normalizeSource(src) {
  if (!src) return null;
  const out = {};
  if (typeof src.page === 'number') out.page = src.page;
  if (typeof src.itemIndex === 'number') out.itemIndex = src.itemIndex;
  if (src.bbox && typeof src.bbox === 'object') {
    const b = src.bbox;
    out.bbox = { x: Number(b.x || 0), y: Number(b.y || 0), w: Number(b.w || 0), h: Number(b.h || 0) };
  }
  if (typeof src.text === 'string') out.text = src.text.trim();
  return out;
}

function normalizeFieldString(field) {
  if (!field || typeof field !== 'object') return null;
  const raw = field.value != null ? String(field.value) : undefined;
  if (raw === undefined || raw === null) return null;
  // remove control characters and collapse whitespace
  let value = raw.replace(CONTROL_CHARS, '').trim().replace(/\s+/g, ' ');
  // truncate overly long values to a sane limit
  if (value.length > MAX_FIELD_LENGTH) value = value.slice(0, MAX_FIELD_LENGTH);
  // strip common leading labels
  for (const r of LABELS_TO_STRIP) {
    value = value.replace(r, '').trim();
  }
  if (value === '') return null;
  const conf = clampConfidence(field.confidence);
  const sources = Array.isArray(field.sources) ? field.sources.map(normalizeSource).filter(Boolean) : undefined;
  const out = { value, original: String(raw), confidence: conf };
  if (sources) out.sources = sources;
  return out;
}

function normalizeFieldArray(field) {
  if (!field || typeof field !== 'object') return null;
  const raw = field.value;
  // sanitize each element
  const arrInput = Array.isArray(raw) ? raw : [raw];
  const arr = normalizeStringArray(arrInput.map(s => String(s || '').replace(CONTROL_CHARS, '').trim().replace(/\s+/g, ' ')).filter(Boolean));
  if (arr.length === 0) return null;
  const conf = clampConfidence(field.confidence);
  const sources = Array.isArray(field.sources) ? field.sources.map(normalizeSource).filter(Boolean) : undefined;
  const out = { value: arr, original: Array.isArray(raw) ? raw.join(', ') : String(raw), confidence: conf };
  if (sources) out.sources = sources;
  return out;
}

function normalizeFieldDate(field) {
  const f = normalizeFieldString(field);
  if (!f) return null;
  const iso = tryParseDateToISO(f.value);
  const out = { value: iso || f.value, original: f.original, confidence: f.confidence };
  if (iso) out.format = 'YYYY-MM-DD';
  if (f.sources) out.sources = f.sources;
  return out;
}

function normalizeMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') return null;
  const out = {};
  try {
    if (mapping.title) {
      const v = normalizeFieldString(mapping.title);
      if (v) out.title = v;
    }
    if (mapping.issuer) {
      const v = normalizeFieldString(mapping.issuer);
      if (v) out.issuer = v;
    }
    if (mapping.usefulLinks) {
      const v = normalizeFieldArray(mapping.usefulLinks);
      if (v) out.usefulLinks = v;
    }
    // if not provided, try to extract URLs from mapping.description or from sources
    if (!out.usefulLinks) {
      // look for urls in description.original or description.value
      const textCandidates = [];
      if (mapping.description && mapping.description.value) textCandidates.push(mapping.description.value);
      if (mapping.description && mapping.description.original) textCandidates.push(mapping.description.original);
      const found = [];
      for (const t of textCandidates) {
        const matches = String(t).match(urlRegex) || [];
        for (let m of matches) {
          // normalize trailing slash
          m = m.replace(/\/?$/, '');
          // prefer https if present
          if (m.startsWith('http://')) {
            const https = m.replace(/^http:\/\//i, 'https://');
            // only convert if https resolves? can't check here; keep both representations trimmed
            m = https;
          }
          found.push(m);
        }
      }
      const uniq = Array.from(new Set(found));
      if (uniq.length > 0) {
        out.usefulLinks = { value: uniq, original: uniq.join(', '), confidence: 0.8 };
      }
    }
    if (mapping.startDate) {
      const v = normalizeFieldDate(mapping.startDate);
      if (v) out.startDate = v;
    }
    if (mapping.endDate) {
      const v = normalizeFieldDate(mapping.endDate);
      if (v) out.endDate = v;
    }
    if (mapping.issuedDate) {
      const v = normalizeFieldDate(mapping.issuedDate);
      if (v) out.issuedDate = v;
    }
    if (mapping.description) {
      const v = normalizeFieldString(mapping.description);
      if (v) out.description = v;
    }
    // category: preserve suggested category (string) with confidence and sources
    if (mapping.category) {
      const v = normalizeFieldString(mapping.category);
      if (v) out.category = v;
    }
    if (mapping.skills) {
      const v = normalizeFieldArray(mapping.skills);
      if (v) out.skills = v;
    }
    if (mapping.recipient) {
      const v = normalizeFieldString(mapping.recipient);
      if (v) out.recipient = v;
    }
    if (mapping.recipientAddress) {
      const v = normalizeFieldString(mapping.recipientAddress);
      if (v) {
        // validate eth address and normalize to lowercase when possible
        const addr = v.value.trim();
        if (ethRegex.test(addr)) {
          out.recipientAddress = { ...v, value: addr.toLowerCase() };
        } else {
          // not a strict eth address; keep sanitized value but do not coerce
          out.recipientAddress = v;
        }
      }
    }
  } catch (e) {
    // on normalization error, return a best-effort partial object
    console.warn('normalizeMapping error', e && e.message);
  }
  return Object.keys(out).length > 0 ? out : null;
}

module.exports = { normalizeMapping, tryParseDateToISO };
