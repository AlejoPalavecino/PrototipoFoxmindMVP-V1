import { type DocumentExtension } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import { parseActivityDocument } from './activity-document.ts';
import { Worker } from 'node:worker_threads';
import type { PlanDocument } from '../../../../../../../src/core/domain/curriculum/ai.ts';
import type { CurriculumWarning } from '../../../../../../../src/core/domain/curriculum/plan.ts';
import { PlanDocumentError } from '../../domain/plan-document-error.ts';

export async function parsePlanDocument(bytes: Uint8Array, extension: DocumentExtension, signal?: AbortSignal): Promise<PlanDocument> {
  if (extension !== 'pdf' && extension !== 'docx') return (await parseActivityDocument(bytes, extension, signal ?? AbortSignal.timeout(18000))).document;
  if (signal?.aborted) throw new PlanDocumentError();
  if (!bytes.length || bytes.length > 20_000_000) throw new PlanDocumentError('AI_INPUT_LIMIT');
  const url = new URL(import.meta.url.endsWith('.ts') ? './plan-document-worker.ts' : './plan-document-worker.js', import.meta.url);
  const worker = new Worker(url, { workerData: { bytes, extension }, execArgv: [], stdout: true, stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
  worker.stdout.resume(); worker.stderr.resume();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await new Promise<PlanDocument>((resolve, reject) => {
      abort = () => reject(new PlanDocumentError());
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => reject(new PlanDocumentError('AI_INPUT_LIMIT')), 3000);
      worker.once('message', result => result?.ok === true ? resolve(result.document as PlanDocument)
        : reject(new PlanDocumentError(result?.code === 'AI_INPUT_LIMIT' ? 'AI_INPUT_LIMIT' : 'FILE_NOT_READY')));
      worker.once('error', () => reject(new PlanDocumentError()));
      worker.once('exit', () => reject(new PlanDocumentError()));
    });
  } finally {
    clearTimeout(timer); if (abort) signal?.removeEventListener('abort', abort); await worker.terminate();
  }
}
export async function extractDocxPlanDocument(bytes: Uint8Array, signal?: AbortSignal) {
  const document = await parsePlanDocument(bytes, 'docx', signal);
  return { document, warnings: ['DOCX_IMAGES_OMITTED'] as CurriculumWarning[] };
}
