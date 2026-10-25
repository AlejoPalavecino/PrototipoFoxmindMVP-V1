import { parentPort, workerData } from 'node:worker_threads';
import { PDFDocument } from 'pdf-lib';
import { documentXml } from './docx-archive.ts';
import { extractDocumentText } from './docx-xml.ts';
import { PlanDocumentError } from './plan-document-error.ts';

async function run() {
  const bytes = Buffer.from(workerData.bytes);
  if (workerData.extension === 'pdf') {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true });
    const pageCount = pdf.getPageCount();
    if (pageCount < 1 || pageCount > 100) throw new PlanDocumentError('AI_INPUT_LIMIT');
    return { document: { kind: 'pdf', bytes }, pageCount, warnings: [] };
  }
  return { document: { kind: 'text', text: extractDocumentText(await documentXml(bytes)) },
    pageCount: null, warnings: ['DOCX_IMAGES_OMITTED'] };
}
run().then(result => parentPort?.postMessage({ ok: true, result })).catch(error =>
  parentPort?.postMessage({ ok: false, code: error instanceof PlanDocumentError ? error.code : 'FILE_NOT_READY' }));
