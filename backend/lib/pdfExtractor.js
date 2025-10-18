const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Helper to convert transform matrix from PDF.js text item to a bounding box
function transformToBbox(transform, fontSize, width) {
  // transform is [a, b, c, d, e, f]
  // For simple cases, the x,y position can be taken from e,f
  // and fontSize approximated from the scale on the y-axis.
  const x = transform[4];
  const y = transform[5];
  // widthEstimate: number of characters * average width (approx)
  const height = Math.abs(fontSize || Math.hypot(transform[2], transform[3])) || 10;
  const w = width || 0;
  return { x, y, w, h: height };
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
      const bbox = transformToBbox(transform, fontSize, it.width || 0);
      return {
        str,
        bbox,
        transform,
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
