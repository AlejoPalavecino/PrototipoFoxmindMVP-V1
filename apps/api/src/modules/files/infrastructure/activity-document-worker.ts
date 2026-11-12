import { parentPort, workerData } from 'node:worker_threads';
import { PlanDocumentError } from '../domain/plan-document-error.ts';

async function run() {
  const bytes = Buffer.from(workerData.bytes);
  if (workerData.extension === 'pdf') {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true });
    const pageCount = pdf.getPageCount();
    if (pageCount < 1 || pageCount > 100) throw new PlanDocumentError('AI_INPUT_LIMIT');
    return { document: { kind: 'pdf', bytes }, pageCount, warnings: [] };
  }
  const [{ documentXml }, { extractDocumentText }] = await Promise.all([
    import('./docx-archive.ts'), import('./docx-xml.ts'),
  ]);
  return { document: { kind: 'text', text: extractDocumentText(await documentXml(bytes, { mainPartOnly: workerData.extension === 'docx-preview' })) },
    pageCount: null, warnings: ['DOCX_IMAGES_OMITTED'] };
}
run().then(result => parentPort?.postMessage({ ok: true, result })).catch(error =>
  parentPort?.postMessage({ ok: false, code: error instanceof PlanDocumentError ? error.code : 'FILE_NOT_READY' }));
