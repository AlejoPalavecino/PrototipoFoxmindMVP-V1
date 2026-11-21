import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  documentInk, resourceBlocks, resourceBodyWithoutRepeatedTitle, resourceInlineRuns,
} from '../../src/core/domain/documents/resource-markdown.ts';

export type DocumentIllustration = { url: string; caption: string };
type PdfInput = { title: string; markdown: string; kind: string; illustrations?: readonly DocumentIllustration[] };

const pageWidth = 595;
const pageHeight = 842;
const margin = 44;
const ink = '#243548';
function color(value: string) {
  const channels = [1, 3, 5].map(index => Number.parseInt(value.slice(index, index + 2), 16) / 255);
  return rgb(channels[0]!, channels[1]!, channels[2]!);
}
async function getFont(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('No pudimos cargar la tipografía del documento.');
  return response.arrayBuffer();
}
async function raster(url: string) {
  const target = new URL(url, location.origin);
  if (target.origin !== location.origin) throw new Error('La imagen debe estar disponible en FoxMind.');
  const image = new Image();
  image.src = target.href;
  await image.decode();
  const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No pudimos preparar la imagen.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export async function createPrivateDocumentPdf(input: PdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.title);
  pdf.setAuthor('FoxMind');
  pdf.setLanguage('es-AR');
  pdf.registerFontkit(fontkit);
  const [regular, heavy, logo] = await Promise.all([
    getFont('/foxmind/nunito-regular.woff').then(bytes => pdf.embedFont(bytes, { subset: true })),
    getFont('/foxmind/nunito-extrabold.woff').then(bytes => pdf.embedFont(bytes, { subset: true })),
    raster('/foxmind/logo.webp').then(data => pdf.embedPng(data)),
  ]);
  const characters = new Set(regular.getCharacterSet());
  const fallback = document.createElement('canvas').getContext('2d');
  if (!fallback) throw new Error('No pudimos componer el PDF.');
  await document.fonts.ready;
  const fallbackFont = (size: number, bold: boolean) => `${bold ? 800 : 400} ${size}px Nunito, sans-serif`;
  const hasGlyphs = (value: string) => [...value].every(letter => characters.has(letter.codePointAt(0)!));
  function measure(value: string, size: number, bold: boolean) {
    if (hasGlyphs(value)) return (bold ? heavy : regular).widthOfTextAtSize(value, size);
    fallback!.font = fallbackFont(size, bold);
    return fallback!.measureText(value).width;
  }
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = 0;
  async function text(value: string, x: number, topBaseline: number, size: number, bold: boolean, tint = ink) {
    if (hasGlyphs(value)) {
      page.drawText(value, { x, y: pageHeight - topBaseline, size, font: bold ? heavy : regular, color: color(tint) });
      return;
    }
    const width = Math.ceil(measure(value, size, bold)) + 3;
    const height = Math.ceil(size * 1.55);
    const canvas = fallback!.canvas;
    canvas.width = width * 2;
    canvas.height = height * 2;
    fallback!.scale(2, 2);
    fallback!.font = fallbackFont(size, bold);
    fallback!.fillStyle = tint;
    fallback!.fillText(value, 0, size);
    const image = await pdf.embedPng(canvas.toDataURL());
    page.drawImage(image, { x, y: pageHeight - topBaseline + size - height, width, height });
  }
  async function drawHeader(first: boolean) {
    const height = first ? 29 : 22;
    const width = height * logo.width / logo.height;
    const top = first ? 30 : 22;
    page.drawImage(logo, { x: margin, y: pageHeight - top - height, width, height });
    const brandX = margin + width + 6;
    await text('Fox', brandX, top + height * 0.82, height * 0.85, true);
    await text('Mind', brandX + measure('Fox', height * 0.85, true), top + height * 0.82, height * 0.85, true, '#a34519');
    await text(String(pdf.getPageCount()), pageWidth - margin - 9, 817, 10, false, '#485563');
    if (first) await text(input.kind, margin, 94, 11, true, '#865029');
    y = first ? 131 : 76;
  }
  async function keepSpace(height: number) {
    if (y + height < 792) return;
    page = pdf.addPage([pageWidth, pageHeight]);
    await drawHeader(false);
  }
  async function write(line: string, size: number, heading = false, firstIndent = 0, literal = false) {
    const lineHeight = size * 1.55;
    await keepSpace(lineHeight * (heading ? 2 : 1));
    let x = margin + firstIndent;
    async function newline() {
      y += lineHeight;
      await keepSpace(lineHeight);
      x = margin;
    }
    for (const run of literal ? [{ text: line, style: 'plain', color: undefined }] : resourceInlineRuns(line)) {
      const bold = heading || run.style === 'bold';
      const tint = run.color ? documentInk[run.color] : ink;
      let buffer = '';
      const flush = async () => {
        if (!buffer) return;
        await text(buffer, x, y, size, bold, tint);
        x += measure(buffer, size, bold);
        buffer = '';
      };
      const tokens = run.text.split(/(\s+)/u).filter(Boolean);
      for (const token of tokens) {
        const word = /^\s+$/u.test(token) ? ' ' : token;
        if (x + measure(buffer + word, size, bold) > pageWidth - margin) {
          await flush();
          await newline();
        }
        if (x === margin && !buffer && word === ' ') continue;
        if (measure(word, size, bold) <= pageWidth - margin * 2) buffer += word;
        else {
          for (const letter of word) {
            if (x + measure(buffer + letter, size, bold) > pageWidth - margin) {
              await flush();
              await newline();
            }
            buffer += letter;
          }
        }
      }
      await flush();
    }
    y += lineHeight + (heading ? 3 : 7);
  }
  await drawHeader(true);
  await write(input.title, 26, true, 0, true);

  for (const block of resourceBlocks(resourceBodyWithoutRepeatedTitle(input.title, input.markdown))) {
    if (block.kind === 'blank' || block.kind === 'divider') continue;
    if (block.kind === 'heading') {
      y += 5;
      await write(block.text, block.level === 1 ? 15 : 13, true);
    } else if (block.kind === 'list') {
      await write(`${/^\d/u.test(block.marker) ? block.marker : '•'} ${block.text}`, 11.5, false, Math.min(36, block.indent * 3));
    } else {
      await write(block.text, 11.5, false, 13);
    }
  }
  for (const figure of input.illustrations ?? []) {
    const image = await pdf.embedPng(await raster(figure.url));
    const contentWidth = pageWidth - margin * 2;
    const captionWidth = measure(figure.caption, 10, false);
    const captionSpace = figure.caption ? Math.ceil(captionWidth / contentWidth) * 16 + 22 : 16;
    const minimumFigureHeight = 112;
    await keepSpace(minimumFigureHeight + captionSpace);
    const size = image.scaleToFit(contentWidth, Math.min(290, 791 - y - captionSpace));
    page.drawImage(image, { x: (pageWidth - size.width) / 2, y: pageHeight - y - size.height, ...size });
    y += size.height + 13;
    if (figure.caption && captionWidth <= contentWidth) {
      await text(figure.caption, (pageWidth - captionWidth) / 2, y, 10, false, '#486457');
      y += 18;
    } else if (figure.caption) {
      await write(figure.caption, 10, false, 0, true);
    }
  }
  return pdf.save();
}
