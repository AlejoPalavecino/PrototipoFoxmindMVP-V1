import { parentPort } from 'node:worker_threads';
import { renderFoxyTextPdf } from './resource-pdf.ts';

parentPort?.once('message', async input => {
  try {
    const result = await renderFoxyTextPdf(input, new AbortController().signal, input.rendererVersion);
    parentPort?.postMessage({ ok: true, result });
  } catch (error) {
    parentPort?.postMessage({ ok: false, code: (error as { code?: string })?.code === 'AI_INPUT_LIMIT' ? 'AI_INPUT_LIMIT' : 'SERVICE_UNAVAILABLE' });
  }
});
