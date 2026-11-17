import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { PDFDocument } from 'pdf-lib';
import { office } from './p4-fixtures.mjs';

const workerEntry = new URL("../apps/api/src/modules/files/custody/infrastructure/activity-document-worker.ts", import.meta.url).href;
const probeEntry = new URL('./fixtures/activity-document-import-probe.test.mjs', import.meta.url);

async function parseWithoutUnrelatedDependencies(bytes, extension) {
  const worker = new Worker(probeEntry, {
    workerData: { bytes, extension, entryUrl: workerEntry }, execArgv: [], stdout: true, stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
  });
  worker.stdout.resume(); worker.stderr.resume();
  let timer;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`${extension} worker exceeded 3000ms`)), 3000);
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => reject(new Error(`${extension} worker exited before a result (${code})`)));
    });
  } finally { clearTimeout(timer); await worker.terminate(); }
}

test('activity DOCX reads actual text without initializing pdf-lib', { timeout: 10000 }, async () => {
  const expected = 'Exposición: luz acumulada durante un intervalo.';
  const bytes = office('docx', [], entries => entries.map(entry => entry.name === 'word/document.xml'
    ? { ...entry, bytes: Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${expected}</w:t></w:r></w:p></w:body></w:document>`) }
    : entry));
  const message = await parseWithoutUnrelatedDependencies(bytes, 'docx');
  assert.equal(message.ok, true);
  assert.equal(message.result.document.kind, 'text');
  assert.equal(message.result.document.text.trim(), expected);
  assert.equal(message.result.pageCount, null);
  assert.deepEqual(message.result.warnings, ['DOCX_IMAGES_OMITTED']);
});

test('activity PDF retains actual bytes and pages without initializing Word parsers', { timeout: 10000 }, async () => {
  const pdf = await PDFDocument.create(); pdf.addPage(); pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  const message = await parseWithoutUnrelatedDependencies(bytes, 'pdf');
  assert.equal(message.ok, true);
  assert.equal(message.result.document.kind, 'pdf');
  assert.deepEqual(Buffer.from(message.result.document.bytes), bytes);
  assert.equal(message.result.pageCount, 2);
  assert.deepEqual(message.result.warnings, []);
});
