import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { convertLegacyOffice, configureLegacyOfficeConverter } from './legacy-office.ts';
import { readFilesConfiguration } from './configuration.ts';

const token = 'k'.repeat(43);
const compound = Buffer.concat([Buffer.from('d0cf11e0a1b11ae1', 'hex'), Buffer.alloc(600)]);
async function converter(handler) {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization, length: Buffer.concat(chunks).length });
    handler(response);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { url: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise(resolve => server.close(resolve)) };
}

test('S12 the API no longer launches docker itself', () => {
  const source = readFileSync(new URL('./legacy-office.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /child_process|execFile|spawn/u);
});

test('S12 legacy Office bytes are sent to the configured broker with its token', async () => {
  const c = await converter(response => { response.writeHead(200); response.end('converted'); });
  try {
    configureLegacyOfficeConverter({ url: c.url, token });
    const result = await convertLegacyOffice(compound, 'ppt');
    assert.equal(result.extension, 'pptx'); assert.equal(result.bytes.toString(), 'converted');
    assert.deepEqual(c.requests, [{ method: 'POST', url: '/convert/ppt', authorization: `Bearer ${token}`, length: compound.length }]);
  } finally { configureLegacyOfficeConverter(undefined); await c.close(); }
});

test('S12 broker outcomes keep the previous error contract', async () => {
  for (const [status, code] of [[422, 'FILE_REJECTED'], [503, 'SERVICE_UNAVAILABLE'], [401, 'SERVICE_UNAVAILABLE']]) {
    const c = await converter(response => { response.writeHead(status); response.end(); });
    try {
      configureLegacyOfficeConverter({ url: c.url, token });
      await assert.rejects(convertLegacyOffice(compound, 'doc'), { code }, String(status));
    } finally { configureLegacyOfficeConverter(undefined); await c.close(); }
  }
  await assert.rejects(convertLegacyOffice(compound, 'doc'), { code: 'SERVICE_UNAVAILABLE' });
  await assert.rejects(convertLegacyOffice(Buffer.alloc(600), 'doc'), { code: 'FILE_REJECTED' });
});

test('S12 the converter endpoint is optional, loopback-only and needs a strong token', () => {
  const env = { FILES_ENABLED: '1', FILES_S3_ENDPOINT: 'http://127.0.0.1:9000', FILES_S3_REGION: 'us-east-1', FILES_S3_BUCKET: 'synthetic-private',
    FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32), FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64), FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: '3310',
    FILES_DRAFT_QUOTA_BYTES: '1000' };
  assert.equal(readFilesConfiguration(env).infrastructure.officeConverter, undefined);
  const ok = { ...env, FILES_OFFICE_CONVERTER_URL: 'http://127.0.0.1:4100', FILES_OFFICE_CONVERTER_TOKEN: token };
  assert.deepEqual(readFilesConfiguration(ok).infrastructure.officeConverter, { url: 'http://127.0.0.1:4100', token });
  for (const bad of [{ FILES_OFFICE_CONVERTER_URL: 'http://example.test:4100' }, { FILES_OFFICE_CONVERTER_URL: 'http://127.0.0.1:4100/x' },
    { FILES_OFFICE_CONVERTER_TOKEN: 'short' }, { FILES_OFFICE_CONVERTER_TOKEN: undefined }])
    assert.throws(() => readFilesConfiguration({ ...ok, ...bad }), { code: 'SERVICE_UNAVAILABLE' }, JSON.stringify(bad));
});
