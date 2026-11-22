import { parentPort, workerData } from 'node:worker_threads';
import { PDFDocument } from 'pdf-lib';
import { documentXml } from './docx-archive.ts';
import { extractDocumentText } from './docx-xml.ts';
import { PlanDocumentError } from '../../domain/plan-document-error.ts';
import { assertPdfInflateBudget } from './pdf-inflate-guard.ts';

async function run() {
  const bytes = Buffer.from(workerData.bytes);
  if (workerData.extension === 'pdf') {
    assertPdfInflateBudget(bytes);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true });
    if (pdf.getPageCount() < 1 || pdf.getPageCount() > 100) throw new PlanDocumentError('AI_INPUT_LIMIT');
    return { kind: 'pdf', bytes };
  }
  return { kind: 'text', text: extractDocumentText(await documentXml(bytes)) };
}
run().then(document => parentPort?.postMessage({ ok: true, document })).catch(error =>
  parentPort?.postMessage({ ok: false, code: error instanceof PlanDocumentError ? error.code : 'FILE_NOT_READY' }));
