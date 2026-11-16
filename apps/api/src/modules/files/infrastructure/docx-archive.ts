import { fromBuffer, type Entry, type ZipFile } from 'yauzl';
import { crc32 } from 'node:zlib';
import { PlanDocumentError } from '../domain/plan-document-error.ts';

function next(zip: ZipFile): Promise<Entry | null> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { zip.off('entry', entry); zip.off('end', end); zip.off('error', error); };
    const entry = (value: Entry) => { cleanup(); resolve(value); };
    const end = () => { cleanup(); resolve(null); };
    const error = () => { cleanup(); reject(new PlanDocumentError()); };
    zip.once('entry', entry); zip.once('end', end); zip.once('error', error); zip.readEntry();
  });
}
async function readEntry(zip: ZipFile, entry: Entry): Promise<Buffer> {
  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => zip.openReadStream(entry,
    (error, result) => error || !result ? reject(new PlanDocumentError()) : resolve(result)));
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > entry.uncompressedSize || size > 32_000_000) throw new PlanDocumentError('AI_INPUT_LIMIT');
    chunks.push(Buffer.from(chunk));
  }
  const bytes = Buffer.concat(chunks);
  if (size !== entry.uncompressedSize || crc32(bytes) !== entry.crc32) throw new PlanDocumentError();
  return bytes;
}
function checkEntry(entry: Entry, names: Set<string>) {
  const name = entry.fileName, mode = (entry.externalFileAttributes >>> 16) & 0xf000;
  if (names.has(name) || /[\u0000-\u001f\u007f\\:]/u.test(name) || name.startsWith('/')
    || name.split('/').includes('..') || ![0, 0x8000, 0x4000].includes(mode)
    || (entry.generalPurposeBitFlag & 1) !== 0 || ![0, 8].includes(entry.compressionMethod)
    || /(?:vbaProject|\.(?:docm|pptm)$)/iu.test(name)) throw new PlanDocumentError();
  names.add(name);
}
export async function readOfficeParts(bytes: Buffer, selected: (path: string) => boolean, mainPartsOnly = false) {
  const zip = await new Promise<ZipFile>((resolve, reject) => fromBuffer(bytes,
    { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
    (error, result) => error || !result ? reject(new PlanDocumentError()) : resolve(result)));
  let expanded = 0, failed = false; const names = new Set<string>(); const parts = new Map<string, Buffer>();
  zip.on('error', () => { failed = true; });
  try {
    for (let entry = await next(zip); entry; entry = await next(zip)) {
      checkEntry(entry, names);
      if (failed) throw new PlanDocumentError();
      if (names.size > 1000) throw new PlanDocumentError('AI_INPUT_LIMIT');
      // The preview is called only for approved bytes whose digest was rechecked.
      if (mainPartsOnly && !selected(entry.fileName)) continue;
      expanded += entry.uncompressedSize;
      if (expanded > 32_000_000) throw new PlanDocumentError('AI_INPUT_LIMIT');
      const content = await readEntry(zip, entry);
      if (failed) throw new PlanDocumentError();
      if (selected(entry.fileName)) parts.set(entry.fileName, content);
    }
    if (!names.has('[Content_Types].xml') || !names.has('_rels/.rels')) throw new PlanDocumentError();
    return parts;
  } finally { zip.close(); }
}

export async function documentXml(bytes: Buffer, { mainPartOnly = false } = {}): Promise<Buffer> {
  const path = 'word/document.xml';
  const parts = await readOfficeParts(bytes, name => name === path, mainPartOnly);
  const document = parts.get(path);
  if (!document) throw new PlanDocumentError();
  return document;
}
