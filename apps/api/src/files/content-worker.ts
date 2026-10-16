import { parentPort, workerData } from 'node:worker_threads';
import { crc32 } from 'node:zlib';
import { fromBuffer, type ZipFile, type Entry } from 'yauzl';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { fileTypeFromBuffer } from 'file-type';

const limits = { expanded: 200_000_000, entry: 100_000_000, entries: 1000, depth: 5, xml: 16_000_000 };
const office = {
  docx: ['word/document.xml', 'wordprocessingml.document', 'document'],
  pptx: ['ppt/presentation.xml', 'presentationml.presentation', 'presentation'],
  xlsx: ['xl/workbook.xml', 'spreadsheetml.sheet', 'workbook'],
} as const;
function reject(): never { throw new Error('uninspectable'); }
function xml(bytes: Buffer): Record<string, any> {
  if (bytes.length > limits.xml) reject();
  const encoding = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0x3c && bytes[1] === 0)
    ? 'utf-16le' : (bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0 && bytes[1] === 0x3c) ? 'utf-16be' : 'utf-8';
  const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY|macroEnabled|vbaProject/i.test(text) || XMLValidator.validate(text) !== true) reject();
  return new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, processEntities: false }).parse(text);
}
function next(zip: ZipFile): Promise<Entry | null> {
  return new Promise((resolve, rejectPromise) => {
    const cleanup = () => { zip.off('entry', entry); zip.off('end', end); zip.off('error', error); };
    const entry = (value: Entry) => { cleanup(); resolve(value); };
    const end = () => { cleanup(); resolve(null); };
    const error = () => { cleanup(); rejectPromise(new Error('invalid archive')); };
    zip.once('entry', entry); zip.once('end', end); zip.once('error', error); zip.readEntry();
  });
}
async function archive(bytes: Buffer, extension: string, budget: { expanded: number; entries: number }, depth = 0): Promise<void> {
  if (depth > limits.depth) reject();
  const zip = await new Promise<ZipFile>((resolve, rejectPromise) => fromBuffer(bytes,
    { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, result) => {
      if (error || !result) rejectPromise(new Error('invalid archive')); else resolve(result);
    }));
  // Keep an error handler attached while an entry stream is being consumed.
  let failed = false; zip.on('error', () => { failed = true; });
  const names = new Set<string>(), parts = new Map<string, Record<string, any>>();
  try {
    for (let entry = await next(zip); entry; entry = await next(zip)) {
      budget.entries++;
      const name = entry.fileName;
      const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
      if (failed || budget.entries > limits.entries || names.has(name) || /[\u0000-\u001f\u007f\\:]/u.test(name)
        || name.startsWith('/') || name.split('/').includes('..') || ![0, 0x8000, 0x4000].includes(mode)
        || (entry.generalPurposeBitFlag & 1) !== 0 || ![0, 8].includes(entry.compressionMethod)
        || entry.uncompressedSize > limits.entry || /(?:vbaProject|\.docm$|\.xlsm$|\.pptm$)/i.test(name)) reject();
      names.add(name);
      budget.expanded += entry.uncompressedSize;
      if (budget.expanded > limits.expanded) reject();
      const stream = await new Promise<NodeJS.ReadableStream>((resolve, rejectPromise) => zip.openReadStream(entry,
        (error, result) => { if (error || !result) rejectPromise(new Error('invalid entry')); else resolve(result); }));
      const chunks: Buffer[] = []; let total = 0;
      for await (const chunk of stream) {
        total += chunk.length;
        if (total > entry.uncompressedSize || total > limits.entry) reject();
        chunks.push(Buffer.from(chunk));
      }
      const content = Buffer.concat(chunks, total);
      if (failed || total !== entry.uncompressedSize || crc32(content) !== entry.crc32) reject();
      if (name.endsWith('/')) { if (total !== 0) reject(); continue; }
      if (name.endsWith('.xml') || name.endsWith('.rels')) {
        const value = xml(content);
        if (name === '[Content_Types].xml' || name === '_rels/.rels' || Object.values(office).some(v => v[0] === name)) parts.set(name, value);
      }
      const kind = await fileTypeFromBuffer(content).catch(() => undefined);
      if (kind?.ext === 'zip' || kind?.mime.includes('openxmlformats')) await archive(content, 'zip', budget, depth + 1);
      else if (kind?.ext === 'pdf') await PDFDocument.load(content, { updateMetadata: false, throwOnInvalidObject: true });
      else if (['7z', 'rar', 'gz', 'bz2', 'xz', 'tar', 'cfb'].includes(kind?.ext ?? '')) reject();
    }
    if (failed || names.size === 0) reject();
    if (extension in office) {
      const [part, type, root] = office[extension as keyof typeof office];
      const types = parts.get('[Content_Types].xml')?.Types?.Override;
      const overrides = Array.isArray(types) ? types : [types];
      const relation = parts.get('_rels/.rels')?.Relationships?.Relationship;
      const relations = Array.isArray(relation) ? relation : [relation];
      if (!Object.hasOwn(parts.get(part) ?? {}, root) || !overrides.some(v => v?.['@_PartName'] === `/${part}`
        && v?.['@_ContentType'] === `application/vnd.openxmlformats-officedocument.${type}.main+xml`)
        || !relations.some(v => v?.['@_Type']?.endsWith('/officeDocument') && v?.['@_Target']?.replace(/^\//, '') === part
          && v?.['@_TargetMode'] !== 'External')) reject();
    }
  } finally { zip.close(); }
}

async function inspect(bytes: Buffer, extension: string): Promise<string> {
  const type = await fileTypeFromBuffer(bytes);
  if (!type) reject();
  if (extension === 'pdf') {
    if (type.ext !== 'pdf') reject();
    const document = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
    if (document.isEncrypted || document.getPageCount() < 1) reject();
    return 'application/pdf';
  }
  if (['png', 'jpg', 'jpeg'].includes(extension)) {
    if (type.ext !== (extension === 'jpeg' ? 'jpg' : extension)) reject();
    sharp.concurrency(1); sharp.cache(false);
    const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: 'warning', animated: false });
    const metadata = await image.metadata();
    if ((metadata.pages ?? 1) !== 1) reject();
    await image.timeout({ seconds: 8 }).stats();
    return type.mime;
  }
  if (extension === 'zip' || extension in office) {
    if (type.ext !== 'zip' && !type.mime.includes('openxmlformats')) reject();
    await archive(bytes, extension, { expanded: 0, entries: 0 });
    return extension === 'zip' ? 'application/zip' : `application/vnd.openxmlformats-officedocument.${{
      docx: 'wordprocessingml.document', pptx: 'presentationml.presentation', xlsx: 'spreadsheetml.sheet',
    }[extension as keyof typeof office]}`;
  }
  return reject();
}

try {
  const mime = await inspect(Buffer.from(workerData.bytes), workerData.extension);
  parentPort?.postMessage({ ok: true, mime });
} catch { parentPort?.postMessage({ ok: false }); }
