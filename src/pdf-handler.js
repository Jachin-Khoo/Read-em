/* ==========================================================================
   Sup' Read With Me PDF & Text File Handler (src/pdf-handler.js)
   ========================================================================== */

/**
 * Extracts raw text from a PDF file using pdf.js
 * @param {File} file - The file uploaded by the user
 * @returns {Promise<string>} The parsed plain text
 */
export function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    if (!window.pdfjsLib) {
      return reject(new Error('PDF.js library is not loaded. Check internet connection.'));
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      const typedarray = new Uint8Array(e.target.result);
      try {
        const loadingTask = window.pdfjsLib.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Reconstruct lines with spacing
          let lastY = null;
          let pageText = '';
          
          for (const item of textContent.items) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
              pageText += '\n'; // new line if vertical position changes significantly
            } else if (pageText !== '' && !pageText.endsWith(' ') && !item.str.startsWith(' ')) {
              pageText += ' ';
            }
            pageText += item.str;
            lastY = item.transform[5];
          }
          
          fullText += pageText + '\n\n';
        }

        if (!fullText.trim()) {
          reject(new Error('No text could be extracted from this PDF. It might be scanned or image-only.'));
        } else {
          resolve(cleanExtractedText(fullText));
        }
      } catch (err) {
        reject(new Error('Failed to parse PDF document: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts text from a standard plain text file
 * @param {File} file - The text file
 * @returns {Promise<string>} Plain text contents
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(cleanExtractedText(e.target.result));
    reader.onerror = () => reject(new Error('Failed to read text file.'));
    reader.readAsText(file);
  });
}

/**
 * Clean up spacing anomalies, double spaces, and hyphen divisions common in PDF text extractions
 */
function cleanExtractedText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ') // collapse double spaces
    .replace(/(\w+)-\n(\w+)/g, '$1$2') // rejoin hyphenated words at linebreaks
    .replace(/\n{3,}/g, '\n\n') // normalize paragraph breaks
    .trim();
}
