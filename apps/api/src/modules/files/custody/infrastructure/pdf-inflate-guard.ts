import { inflateSync, constants } from 'node:zlib';

/**
 * While loading, pdf-lib decodes object streams (/ObjStm) and cross-reference streams (/XRef) into unbounded buffers,
 * so a ~1 MB file can expand to gigabytes outside the worker heap limit. This guard inflates those streams with a hard
 * output cap and a total budget BEFORE any PDFDocument.load. It never keeps the output: peak memory is bounded by `stream`.
 */
export const PDF_INFLATE_LIMITS = { stream: 32 * 1024 * 1024, total: 64 * 1024 * 1024 } as const;
export class PdfInflateLimitError extends Error { constructor() { super('PDF expands beyond the allowed budget'); } }

const STREAM = /stream\r?\n/g;
const DECODED_ON_LOAD = /\/Type\s*\/(?:ObjStm|XRef)\b/u;

/** Throws PdfInflateLimitError when decoded Flate streams exceed the per-stream or total budget. */
export function assertPdfInflateBudget(bytes: Buffer, limits: { stream: number; total: number } = PDF_INFLATE_LIMITS): void {
  const text = bytes.toString('latin1');
  let total = 0;
  for (const match of text.matchAll(STREAM)) {
    const start = match.index + match[0].length;
    // Keyword must close a dictionary: ignore the "stream" inside "endstream".
    if (match.index >= 3 && text.startsWith('end', match.index - 3)) continue;
    const objectStart = text.lastIndexOf('obj', match.index);
    const dictionary = objectStart < 0 ? '' : text.slice(objectStart, match.index);
    // Only the streams pdf-lib decodes while loading (object and cross-reference streams) can expand during load;
    // images and page content are never decoded by the consumers, so legitimate scanned PDFs are not budgeted.
    if (!dictionary.includes('/FlateDecode') || !DECODED_ON_LOAD.test(dictionary)) continue;
    const end = text.indexOf('endstream', start);
    const data = bytes.subarray(start, end < 0 ? bytes.length : end);
    try {
      const output = inflateSync(data, { maxOutputLength: Math.min(limits.stream, limits.total - total + 1), finishFlush: constants.Z_SYNC_FLUSH });
      total += output.length;
    } catch (error) {
      if ((error as { code?: string })?.code === 'ERR_BUFFER_TOO_LARGE') throw new PdfInflateLimitError();
      continue; // not zlib data or corrupt: pdf-lib decides (and rejects) as before
    }
    if (total > limits.total) throw new PdfInflateLimitError();
  }
}
