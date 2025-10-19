const fs = require('fs');
const path = require('path');
// Some pdfjs-dist builds expect DOMMatrix in the global scope. Node.js doesn't provide it by default.
// Provide a minimal shim to allow pdfjs-dist to load. This is a light-weight polyfill sufficient for
// the library's environment checks; for full DOMMatrix behavior consider installing a proper polyfill.
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor(init) {
      // minimal container; pdfjs only needs existence for environment detection in many cases
      if (Array.isArray(init)) {
        this._arr = init.slice();
      }
    }
  };
}

// pdfjs-dist (and some of its dependency bundles) call Promise.withResolvers() which is not a
// standard API in Node/JS runtime. Add a tiny polyfill so those builds can run in Node. It returns
// an object { promise, resolve, reject } where resolve/reject are the resolvers for the promise.
if (typeof Promise.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: false,
    value: function withResolvers() {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }
  });
}

let pdfjsLib;
try {
  // prefer the legacy Node-friendly build
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
} catch (err1) {
  try {
    // fallback to main package entry
    pdfjsLib = require('pdfjs-dist');
  } catch (err2) {
    throw new Error("Missing dependency 'pdfjs-dist' or failed to load it. Please run 'npm install' in the backend folder (cd backend && npm install) or install 'pdfjs-dist' specifically (npm install pdfjs-dist). Original error: " + err2.message);
  }
}

// More accurate helper to convert transform matrix and viewport into a bounding box in page coordinates
// Parameters:
// - transform: [a,b,c,d,e,f] from PDF.js text item
// - fontSize: reported font size (may be null)
// - width: reported width from text item (advance width in text space)
// - viewport: PDF.js viewport object used for the page
function transformToBbox(transform, fontSize, width, viewport) {
  // transform maps text-space to user-space. Text-space units are typically 1/1000 em or similar depending on font.
  // We'll compute the four corners of the text quad in text space and map them with the transform, then apply viewport transform.
  // transform = [a, b, c, d, e, f]
  const [a,b,c,d,e,f] = transform;

  // Text item origin (x0, y0) in text space
  const x0 = 0;
  const y0 = 0;
  // width in text space (advance width). If width is missing, approximate using fontSize * string length handled elsewhere.
  const tw = width || 0;
  // height in text space: approximate using fontSize if available, otherwise derive from transform
  const th = fontSize || Math.hypot(c, d) || 10;

  // corners in text space
  const corners = [
    [x0, y0],
    [x0 + tw, y0],
    [x0 + tw, y0 + th],
    [x0, y0 + th]
  ];

  // apply text transform to each corner -> user space
  const userCorners = corners.map(([x,y]) => {
    const ux = a * x + c * y + e;
    const uy = b * x + d * y + f;
    return [ux, uy];
  });

  // map user space to viewport (device) coordinates
  const deviceCorners = userCorners.map(([ux, uy]) => viewport.convertToViewportPoint(ux, uy));

  const xs = deviceCorners.map(p => p[0]);
  const ys = deviceCorners.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

async function extractPdf(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('file not found');

  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pages = [];
  let plainText = '';

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });

    const textContent = await page.getTextContent({ disableCombineTextItems: false });
    const items = textContent.items.map((it) => {
      const transform = it.transform || [1,0,0,1,0,0];
      const fontSize = it.fontSize || (it.height || null);
      const str = it.str || '';
      const bbox = transformToBbox(transform, fontSize, it.width || 0, viewport);
      return {
        str,
        bbox,
        transform,
        fontSize: fontSize,
        width: it.width || 0,
        dir: it.dir || null
      };
    });

    const pageText = items.map(i => i.str).join(' ');
    plainText += pageText + '\n\f\n';
    pages.push({ pageNumber: p, width: viewport.width, height: viewport.height, items });
  }

  // cleanup
  try { doc.cleanup?.(); } catch (e) {}

  return { pages, plainText };
}

module.exports = { extractPdf };
