import test from 'node:test';
import assert from 'node:assert/strict';
import { createFileInfrastructure } from '../apps/api/src/modules/files/infrastructure/configuration.ts';
import { S3Storage } from '../apps/api/src/modules/files/infrastructure/storage.ts';
import { FileService } from '../.build/api/apps/api/src/modules/files/infrastructure/service.js';

const configuration = { endpoint: 'http://127.0.0.1:18334', region: 'us-east-1', bucket: 'foxmind-private',
  accessKeyId: 'a'.repeat(32), secretAccessKey: 'b'.repeat(64), scannerHost: '127.0.0.1', scannerPort: 13311 };
test('trusted local configuration constructs private clients with an explicit close lifecycle', () => {
  const infrastructure = createFileInfrastructure(configuration);
  assert.equal(typeof infrastructure.storage.get, 'function'); assert.equal(typeof infrastructure.scanner.scan, 'function');
  infrastructure.close();
});
test('credential-bearing URLs, plaintext remote endpoints and malformed configuration fail closed', () => {
  for (const patch of [{ endpoint: 'http://remote.example.invalid' }, { endpoint: 'https://user:secret@example.invalid' },
    { endpoint: 'https://example.invalid/?secret=value' }, { endpoint: 'https://example.invalid/path' },
    { accessKeyId: '' }, { secretAccessKey: 'short' }, { scannerHost: 'public.example.invalid' },
    { scannerPort: 0 }, { scannerPort: 65536 }, { bucket: '../private' }]) {
    assert.throws(() => createFileInfrastructure({ ...configuration, ...patch }), { message: 'SERVICE_UNAVAILABLE' });
  }
});
test('a missing access adapter or implicit draft quota never creates a usable service', () => {
  for (const options of [{}, { database: {}, storage: {}, scanner: {}, draftQuotaBytes: 1n },
    { database: {}, storage: {}, scanner: {}, access: { authenticate() {}, authorize() {} } }]) {
    assert.throws(() => new FileService(options), { code: 'SERVICE_UNAVAILABLE' });
  }
});
test('storage enforces absolute deadlines even if a driver never produces a response', async () => {
  const storage = new S3Storage({ send: () => new Promise(() => {}) }, 'foxmind-private', 20);
  const started = Date.now();
  await assert.rejects(storage.put('p4/00000000-0000-4000-8000-000000000001/blob', Buffer.from('x')), { code: 'SERVICE_UNAVAILABLE' });
  assert.ok(Date.now() - started < 1000);
});
