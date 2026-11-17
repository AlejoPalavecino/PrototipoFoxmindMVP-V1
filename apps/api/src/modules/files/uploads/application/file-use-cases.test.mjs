import test from 'node:test';
import assert from 'node:assert/strict';
import { FileUseCases } from './file-use-cases.ts';
import { requireReady } from '../../domain/readiness.ts';
import { validateUploadIntent } from '../../domain/policy.ts';

const id = '00000000-0000-0000-0000-000000000001';
test('file admission snapshots scope and intent before waiting for a caller transaction', async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const tx = {}, seen = [];
  class UseCases extends FileUseCases { async beginInTransaction(...args) { seen.push(args); return {}; } }
  const service = new UseCases({ transaction: async run => { await wait; return run(tx); } });
  const scope = { kind: 'classroom', id }, intent = { purpose: 'material', name: 'synthetic.pdf', bytes: 10 };
  const request = {};
  const result = service.begin(request, scope, intent);
  scope.id = 'mutated'; intent.name = 'mutated.exe'; release(); await result;
  assert.deepEqual(seen, [[tx, request, { kind: 'classroom', id }, { purpose: 'material', name: 'synthetic.pdf', bytes: 10 }, null]]);
});
test('readiness rejects incomplete phase or mismatching byte proofs', () => {
  const digest = 'a'.repeat(64);
  const ready = { phase: 'ready', upload_status: 'COMPLETED', validation_status: 'APPROVED', scan_status: 'CLEAN',
    digest, validated_digest: digest, scanned_digest: digest };
  assert.doesNotThrow(() => requireReady(ready));
  for (const changed of [{ phase: 'inspecting' }, { scanned_digest: 'b'.repeat(64) }, { validation_status: 'PENDING' }, { digest: null }]) {
    assert.throws(() => requireReady({ ...ready, ...changed }), { code: 'FILE_NOT_READY' });
  }
});
test('metadata admission preserves UTF-8 scalar validation without a Node dependency', () => {
  assert.equal(validateUploadIntent({ purpose: 'material', name: '😀.pdf', bytes: 1 }).extension, 'pdf');
  for (const name of ['\ud800.pdf', '\udfff.pdf']) assert.throws(() => validateUploadIntent({ purpose: 'material', name, bytes: 1 }), { code: 'INVALID_UPLOAD' });
});
