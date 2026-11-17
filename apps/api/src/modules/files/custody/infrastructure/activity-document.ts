import { DOCUMENT_MAX_BYTES, type DocumentExtension } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import { convertLegacyOffice, legacyOffice } from './legacy-office.ts';
import { Worker } from 'node:worker_threads';
import type { ActivityGenerationSource } from '../../../../../../../src/core/domain/activities/activity-generation.ts';
import { PlanDocumentError } from '../../domain/plan-document-error.ts';

export async function parseActivityDocument(bytes: Uint8Array, extension: DocumentExtension | 'docx-preview', signal: AbortSignal): Promise<Omit<ActivityGenerationSource, 'sourceId'>> {
  if (signal.aborted) throw new PlanDocumentError();
  if (!bytes.length || bytes.length > (extension === 'docx-preview' ? 50_000_000 : DOCUMENT_MAX_BYTES)) throw new PlanDocumentError('AI_INPUT_LIMIT');
  const converted = legacyOffice(extension) ? await convertLegacyOffice(bytes, extension, signal) : null;
  if (signal.aborted) throw new PlanDocumentError();
  const url = new URL(import.meta.url.endsWith('.ts') ? './activity-document-worker.ts' : './activity-document-worker.js', import.meta.url);
  const worker = new Worker(url, { workerData: { bytes: converted?.bytes ?? bytes, extension: converted?.extension ?? extension, converted: converted !== null }, execArgv: [], stdout: true, stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
  worker.stdout.resume(); worker.stderr.resume();
  let timer: ReturnType<typeof setTimeout> | undefined, abort: (() => void) | undefined;
  try {
    return await new Promise((resolve, reject) => {
      abort = () => reject(new PlanDocumentError()); signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => reject(new PlanDocumentError('AI_INPUT_LIMIT')), 3000);
      worker.once('message', r => r?.ok === true ? resolve(r.result) : reject(new PlanDocumentError(r?.code === 'AI_INPUT_LIMIT' ? 'AI_INPUT_LIMIT' : 'FILE_NOT_READY')));
      worker.once('error', () => reject(new PlanDocumentError())); worker.once('exit', () => reject(new PlanDocumentError()));
    });
  } finally { clearTimeout(timer); if (abort) signal.removeEventListener('abort', abort); await worker.terminate(); }
}
