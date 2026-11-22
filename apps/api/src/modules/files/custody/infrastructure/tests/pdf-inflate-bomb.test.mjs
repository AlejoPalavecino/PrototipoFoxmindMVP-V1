import assert from 'node:assert/strict';
import test from 'node:test';
import { Worker } from 'node:worker_threads';
import { PDFDocument } from 'pdf-lib';
import { inspectContent } from '../content.ts';
import { assertPdfInflateBudget, PdfInflateLimitError } from '../pdf-inflate-guard.ts';
import { buildPdfBomb } from './pdf-bomb-fixture.mjs';

const MiB = 1024 * 1024;
async function normalPdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]).drawText('Plan de estudio');
  return Buffer.from(await pdf.save({ useObjectStreams: true }));
}
function runWorker(file, workerData) {
  return new Promise(resolve => {
    const worker = new Worker(new URL(`../${file}`, import.meta.url), { workerData, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: 128 } });
    worker.once('message', value => { resolve(value); void worker.terminate(); });
    worker.once('error', () => resolve({ ok: false, code: 'WORKER_ERROR' }));
  });
}
async function measured(run) {
  const base = process.memoryUsage().rss; let peak = base;
  const timer = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 10);
  const started = Date.now();
  try { return { value: await run().then(value => ({ value }), error => ({ error })), ms: Date.now() - started, growthMiB: Math.max(0, peak - base) / MiB }; }
  finally { clearInterval(timer); }
}

test('PDF con object stream de ~1 GiB descomprimido se rechaza rápido y sin inflar la memoria', { timeout: 60000 }, async () => {
  const bomb = await buildPdfBomb(1024);
  assert.ok(bomb.length < 2 * MiB, 'el fixture debe ser pequeño');
  // Calentamiento sin medir: el arranque en frío de los Workers .ts depende de la carga de la suite.
  const warm = await normalPdf();
  await inspectContent(warm, 'pdf');
  for (const file of ['plan-document-worker.ts', 'activity-document-worker.ts']) await runWorker(file, { bytes: warm, extension: 'pdf' });
  const result = await measured(() => inspectContent(bomb, 'pdf'));
  assert.equal(result.value.error?.code, 'FILE_REJECTED');
  assert.ok(result.ms < 3000, `tardó ${result.ms} ms`);
  assert.ok(result.growthMiB < 256, `RSS creció ${result.growthMiB.toFixed(0)} MiB`);
  for (const file of ['plan-document-worker.ts', 'activity-document-worker.ts']) {
    const outcome = await measured(() => runWorker(file, { bytes: bomb, extension: 'pdf' }));
    assert.deepEqual({ ok: outcome.value.value.ok, code: outcome.value.value.code }, { ok: false, code: 'FILE_NOT_READY' }, file);
    assert.ok(outcome.ms < 3000 && outcome.growthMiB < 256, `${file}: ${outcome.ms} ms, ${outcome.growthMiB.toFixed(0)} MiB`);
  }
});

test('un PDF normal con object streams sigue aceptándose en los tres consumidores', async () => {
  const bytes = await normalPdf();
  assert.equal(await inspectContent(bytes, 'pdf'), 'application/pdf');
  assert.equal((await runWorker('plan-document-worker.ts', { bytes, extension: 'pdf' })).ok, true);
  assert.equal((await runWorker('activity-document-worker.ts', { bytes, extension: 'pdf' })).ok, true);
});

test('la guarda sólo presupuesta los streams que pdf-lib descomprime al cargar', async () => {
  // pdf-lib decodes object streams and cross-reference streams while loading; page images are never decoded.
  const image = await buildPdfBomb(100, '/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8');
  assertPdfInflateBudget(image);
  const xref = await buildPdfBomb(100, '/Type /XRef /W [1 1 1] /Size 6');
  assert.throws(() => assertPdfInflateBudget(xref), PdfInflateLimitError);
});

test('la guarda aplica presupuesto por stream y total, y no rechaza datos que no son zlib', async () => {
  const bomb = await buildPdfBomb(40);
  assert.throws(() => assertPdfInflateBudget(bomb), PdfInflateLimitError);
  assert.throws(() => assertPdfInflateBudget(bomb, { stream: 64 * MiB, total: 8 * MiB }), PdfInflateLimitError);
  assertPdfInflateBudget(bomb, { stream: 64 * MiB, total: 64 * MiB });
  assertPdfInflateBudget(Buffer.from('%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\nno es zlib\nendstream\nendobj\n'));
  assertPdfInflateBudget(await normalPdf());
});
