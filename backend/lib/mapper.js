// Deterministic heuristic mapper implementing Option A
// Input: extraction { pages: [ { pageNumber, items: [ { str, bbox } ] } ], plainText }
// Output: mapping { field: { value, confidence, sources: [...] } }

const urlRegex = /https?:\/\/[^\s)]+/gi;
const ethRegex = /0x[a-fA-F0-9]{40}/g;
const isoDateRegex = /\d{4}-\d{2}-\d{2}/g;
// common numeric dates allowing optional spaces around separators (e.g. "12.03.2024" or "12 . 03 . 2024")
const commonDateRegex = /\d{1,2}\s*[\.\/\-]\s*\d{1,2}\s*[\.\/\-]\s*\d{2,4}/g;
// month names (English + German short/long forms), allow optional punctuation and whitespace before the day and year
const monthDateRegex = /\b(?:Jan(?:uary|uar)?|Feb(?:ruary|ruar)?|Mar(?:ch|z)?|Apr(?:il)?|May|Mai|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober|t)?|Nov(?:ember)?|Dec(?:ember|z)?|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b[\s\.,\-]*\d{1,2}[,\s]*\d{4}/gi;

function avgItemHeight(extraction) {
  const heights = [];
  for (const p of extraction.pages || []) {
    for (const it of p.items || []) {
      if (it && it.bbox && typeof it.bbox.h === 'number') heights.push(it.bbox.h);
    }
  }
  if (heights.length === 0) return 10;
  const sum = heights.reduce((s, v) => s + v, 0);
  return sum / heights.length;
}

function bestLargeTextOnPage(page) {
  if (!page || !page.items) return null;
  let best = null;
  for (let i = 0; i < page.items.length; i++) {
    const it = page.items[i];
    if (!it || !it.bbox) continue;
    if (!best || (it.bbox.h || 0) > (best.item.bbox.h || 0)) best = { item: it, index: i };
  }
  return best;
}

function findSourceForText(extraction, snippet) {
  if (!extraction || !extraction.pages) return null;
  for (const p of extraction.pages) {
    if (!p.items) continue;
    for (let i = 0; i < p.items.length; i++) {
      const it = p.items[i];
      if (!it || !it.str) continue;
      if (snippet && String(it.str).toLowerCase().includes(String(snippet).toLowerCase())) {
        return { page: p.pageNumber, itemIndex: i, bbox: it.bbox || null, text: it.str };
      }
    }
  }
  return null;
}

function extractDates(plain) {
  if (!plain) return [];
  // normalize a few unicode/whitespace quirks that commonly appear in PDF-extracted text
  let p = String(plain).replace(/\u00A0/g, ' '); // non-breaking space -> space
  // replace various middle-dot / unicode dot chars with a normal dot for matching
  p = p.replace(/[\u00B7\u2024\uFF0E]/g, '.');

  const found = new Set();
  (p.match(isoDateRegex) || []).forEach(d => found.add(d));
  (p.match(commonDateRegex) || []).forEach(d => found.add(d));
  (p.match(monthDateRegex) || []).forEach(d => found.add(d));
  return Array.from(found);
}

function mapExtraction(extraction) {
  const plain = extraction?.plainText || '';
  const text = String(plain).replace(/\f/g, '\n');
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pages = extraction?.pages || [];
  const avgH = avgItemHeight(extraction);

  const mapping = {};

  // Title: largest text item on page 1 OR first non-empty reasonable line
  if (pages.length > 0) {
    const best = bestLargeTextOnPage(pages[0]);
    if (best && best.item && best.item.str && best.item.str.trim().length > 3) {
      const val = best.item.str.trim();
      const sizeScore = Math.min(0.4, (best.item.bbox && avgH ? (best.item.bbox.h / avgH) : 0.1));
      const confidence = Math.round((0.6 + sizeScore) * 100) / 100;
      mapping.title = { value: val, confidence, sources: [{ page: pages[0].pageNumber, itemIndex: best.index, bbox: best.item.bbox, text: best.item.str }] };
    }
  }
  if (!mapping.title && lines.length > 0) {
    const cand = lines.find(l => l.length >= 5 && l.length <= 200);
    if (cand) {
      const src = findSourceForText(extraction, cand);
      const confidence = src ? 0.6 : 0.45;
      mapping.title = { value: cand, confidence, sources: src ? [src] : [] };
    }
  }

  // Issuer: look for explicit 'issued by' lines, else second-largest text on page 1
  const issuerLine = lines.find(l => /issued by[:\-\s]|issuer[:\-\s]|presented by[:\-\s]/i.test(l));
  if (issuerLine) {
    const val = issuerLine.replace(/^(issued by[:\-\s]?|issuer[:\-\s]?|presented by[:\-\s]?)/i, '').trim();
    const src = findSourceForText(extraction, issuerLine);
    mapping.issuer = { value: val, confidence: src ? 0.75 : 0.6, sources: src ? [src] : [] };
  } else if (pages.length > 0) {
    const items = pages[0].items || [];
    if (items.length > 1) {
      const sorted = items.map((it, i) => ({ it, i })).sort((a, b) => (b.it.bbox?.h || 0) - (a.it.bbox?.h || 0));
      if (sorted.length > 1 && sorted[1].it && sorted[1].it.str && sorted[1].it.str.trim().length > 1) {
        const val = sorted[1].it.str.trim();
        mapping.issuer = { value: val, confidence: 0.6 + Math.min(0.35, (sorted[1].it.bbox?.h || 0) / (avgH || 10)), sources: [{ page: pages[0].pageNumber, itemIndex: sorted[1].i, bbox: sorted[1].it.bbox, text: sorted[1].it.str }] };
      }
    }
  }

  // Links: all unique URLs in plainText (prefer https) confidence 0.9 for https
  const rawUrls = Array.from(new Set((plain.match(urlRegex) || []).map(u => u.replace(/\/?$/, ''))));
  if (rawUrls.length > 0) {
    const normalized = rawUrls.map(u => u.startsWith('http://') ? u.replace(/^http:\/\//i, 'https://') : u);
    mapping.usefulLinks = { value: normalized, confidence: 0.9, sources: normalized.map(u => ({ page: null, itemIndex: null, bbox: null, text: u })) };
  }

  // Dates: extract patterns
  const foundDates = extractDates(plain);
  if (foundDates.length === 1) {
    const d = foundDates[0];
    const src = findSourceForText(extraction, d);
    mapping.issuedDate = { value: d, confidence: /\d{4}-\d{2}-\d{2}/.test(d) ? 0.8 : 0.6, sources: src ? [src] : [] };
  } else if (foundDates.length >= 2) {
    const s = foundDates[0];
    const e = foundDates[1];
    mapping.startDate = { value: s, confidence: /\d{4}-\d{2}-\d{2}/.test(s) ? 0.8 : 0.6, sources: findSourceForText(extraction, s) ? [findSourceForText(extraction, s)] : [] };
    mapping.endDate = { value: e, confidence: /\d{4}-\d{2}-\d{2}/.test(e) ? 0.8 : 0.6, sources: findSourceForText(extraction, e) ? [findSourceForText(extraction, e)] : [] };
  }

  // Recipient: ETH address preferred
  const eth = (plain.match(ethRegex) || [])[0] || null;
  if (eth) {
    const src = findSourceForText(extraction, eth);
    mapping.recipientAddress = { value: eth, confidence: 0.98, sources: src ? [src] : [] };
  } else {
    const recipRegex = /(awarded to|presented to|recipient[:\-]?|to[:\-]?|certified to)\s*[:\-\s]*([^\n]+)/i;
    for (const l of lines) {
      const m = l.match(recipRegex);
      if (m && m[2]) {
        const val = m[2].trim();
        const src = findSourceForText(extraction, l);
        mapping.recipient = { value: val, confidence: src ? 0.75 : 0.5, sources: src ? [src] : [] };
        break;
      }
    }
  }

  // Description: paragraph after title or first long block
  if (!mapping.description && lines.length > 2) {
    const desc = lines.slice(1, 6).join(' ');
    if (desc.length > 30) {
      const src = findSourceForText(extraction, lines[1]) || null;
      mapping.description = { value: desc, confidence: 0.5, sources: src ? [src] : [] };
    }
  }

  // Skills: look for 'Skills:' label
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^skills[:\-\s]/i.test(l)) {
      const after = l.replace(/^skills[:\-\s]*/i, '').trim();
      const vals = after.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      if (vals.length > 0) {
        mapping.skills = { value: vals, confidence: 0.6, sources: [ findSourceForText(extraction, l) ].filter(Boolean) };
      } else if (i + 1 < lines.length) {
        const next = lines[i+1];
        const vals2 = next.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        if (vals2.length > 0) mapping.skills = { value: vals2, confidence: 0.55, sources: [ findSourceForText(extraction, next) ].filter(Boolean) };
      }
      break;
    }
  }

  // Category detection: simple keyword-based heuristic
  try {
    const categoryKeywords = {
      Internship: ['internship', 'intern', 'praktikum', 'traineeship'],
      Hackathon: ['hackathon', 'hack day', 'hack-day', 'hackfest', 'coding competition'],
      Course: ['course', 'training', 'workshop', 'bootcamp', 'certificate of completion', 'online course', 'curriculum', 'module'],
      Volunteering: ['volunteer', 'volunteering', 'community service', 'volunteer work', 'freiwillig', 'ehrenamt']
    };

    const lower = String(plain || '').toLowerCase();
    let bestCat = null;
    let bestScore = 0;
    let bestSource = null;

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      let score = 0;
      let firstMatch = null;
      for (const kw of keywords) {
        // word boundary match and also simple substring match for short tokens
        const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(lower)) {
          score += 1;
          if (!firstMatch) firstMatch = kw;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCat = cat;
        if (firstMatch) {
          // try to find source for the matching keyword
          bestSource = findSourceForText(extraction, firstMatch) || null;
        } else {
          bestSource = null;
        }
      }
    }

    if (bestScore > 0 && bestCat) {
      // confidence scaled by number of matched keywords (cap at 0.95)
      const conf = Math.min(0.95, 0.5 + Math.min(0.45, bestScore * 0.25));
      mapping.category = { value: bestCat, confidence: conf, sources: bestSource ? [bestSource] : [] };
    } else {
      mapping.category = { value: 'Other', confidence: 0.35, sources: [] };
    }
  } catch (e) {
    // don't let category heuristics break mapping; default to Other
    mapping.category = { value: 'Other', confidence: 0.3, sources: [] };
  }

  return mapping;
}

module.exports = { mapExtraction };
