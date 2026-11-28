import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { proxyFileRequest } from '../apps/web/src/application/server/file-proxy.ts';
import { uploadDeadlineMs } from '../src/core/domain/documents/document-formats.ts';

// F8: a binary upload through the web proxy follows the same size-based deadline as the API, not a fixed 10 s.
const id = 'a1111111-1111-4111-8111-111111111111';
const flush = () => new Promise(resolve => setImmediate(resolve));

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

test('the shared upload deadline is size-based with a 10 s floor', () => {
  assert.equal(uploadDeadlineMs(0), 10_000);
  assert.equal(uploadDeadlineMs(1_000_000), 10_000);
  assert.equal(uploadDeadlineMs(2_000_000), 20_000);
  assert.equal(uploadDeadlineMs(50_000_000), 500_000);
});

test('the file proxy lets an upload that keeps sending data past 10 s reach the API', async t => {
  const size = 2_000_000;
  let received = 0;
  const upstream = await serve((req, res) => {
    req.on('data', chunk => { received += chunk.length; });
    req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ received })); });
  });
  const web = await serve((req, res) => void proxyFileRequest(req, res, `http://127.0.0.1:${upstream.port}`));
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const result = new Promise((resolve, reject) => {
      const req = httpRequest({ host: '127.0.0.1', port: web.port, method: 'PUT', path: `/api/v1/files/${id}/content`,
        headers: { 'content-type': 'application/octet-stream', 'content-length': String(size), cookie: 'fixture=session' } }, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      });
      req.once('error', reject);
      (async () => {
        // Four 500 kB chunks, one every 4 s: 16 s in total, under the 20 s allowed for 2 MB.
        for (let chunk = 0; chunk < 4; chunk++) {
          await flush(); t.mock.timers.tick(4000); await flush();
          if (chunk === 3) req.end(Buffer.alloc(500_000)); else req.write(Buffer.alloc(500_000));
          await flush();
        }
      })().catch(reject);
    });
    const { status, body } = await result;
    assert.equal(status, 200, body);
    assert.deepEqual(JSON.parse(body), { received: size });
  } finally { t.mock.timers.reset(); await web.close(); await upstream.close(); }
});
