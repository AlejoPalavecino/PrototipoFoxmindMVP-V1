import { FOXY_PDF_RENDERER_VERSION } from './pdf-renderer-version.ts';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFName, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;
const MAX_PAGES = 100;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

function validate(input: { title: string; markdown: string }, signal: AbortSignal): void {
  signal.throwIfAborted();
  if (!input || typeof input.title !== 'string' || typeof input.markdown !== 'string' ||
      !input.title.trim() || !input.markdown.trim() || input.title.length > 200 || input.markdown.length > 50000 ||
      /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u.test(input.title + input.markdown)) {
    throw new Error('Invalid PDF resource');
  }
}

function wrapLine(text: string, font: PDFFont): string[] {
  if (!text) return [''];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length) {
    let end = 0;
    let lastSpace = -1;
    let width = 0;
    while (end < remaining.length) {
      const char = remaining[end]!;
      const next = width + font.widthOfTextAtSize(char, FONT_SIZE);
      if (next > PAGE_WIDTH - MARGIN * 2 && end > 0) break;
      width = next;
      if (char === ' ') lastSpace = end;
      end++;
    }
    if (end < remaining.length && lastSpace >= 0) end = lastSpace + 1;
    lines.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  return lines;
}

function drawLines(document: PDFDocument, font: PDFFont, input: string, signal: AbortSignal): void {
  let page: PDFPage | undefined;
  let y = 0;
  for (const paragraph of input.split(/\r\n|\r|\n/u)) {
    signal.throwIfAborted();
    for (const line of wrapLine(paragraph, font)) {
      if (!page || y < MARGIN) {
        if (document.getPageCount() >= MAX_PAGES) throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' });
        page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      if (line) page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
      y -= LINE_HEIGHT;
    }
  }
}

export async function renderFoxyTextPdf(input: { title: string; markdown: string }, signal: AbortSignal): Promise<{
  bytes: Uint8Array; digest: string; pageCount: number; rendererVersion: string;
}> {
  const snapshot = { title: input?.title, markdown: input?.markdown };
  validate(snapshot, signal);
  const document = await PDFDocument.create();
  const metadataDate = new Date('2000-01-01T00:00:00.000Z');
  document.setCreationDate(metadataDate);
  document.setModificationDate(metadataDate);
  signal.throwIfAborted();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const content = `${snapshot.title}\n\n${snapshot.markdown}`;
  font.encodeText(content.replace(/[\r\n]/gu, ''));
  drawLines(document, font, content, signal);
  signal.throwIfAborted();
  for (const page of document.getPages()) page.node.delete(PDFName.of('Annots'));
  const bytes = await document.save();
  signal.throwIfAborted();
  if (bytes.length > MAX_PDF_BYTES) throw new Error('PDF resource exceeds size limit');
  return { bytes, digest: createHash('sha256').update(bytes).digest('hex'), pageCount: document.getPageCount(), rendererVersion: FOXY_PDF_RENDERER_VERSION };
}
