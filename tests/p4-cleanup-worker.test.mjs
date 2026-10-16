import test from 'node:test';
import assert from 'node:assert/strict';
import { FileCleanupWorker } from '../apps/api/src/files/cleanup-worker.ts';

const settle = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
test('the real opt-in Nest module installs and closes its cleanup lifecycle', async () => {
  const { NestFactory } = await import('@nestjs/core');
  const { FilesModule } = await import('../.build/api/apps/api/src/files/files.module.js');
  const module = FilesModule.register({ database: {}, access: { authenticate() {}, authorize() {} },
    storage: {}, scanner: {}, draftQuotaBytes: 100n });
  let calls = 0;
  module.providers[0].useValue.cleanup = async () => { calls++; return { deleted: 0, failed: 0 }; };
  const app = await NestFactory.createApplicationContext(module, { logger: false });
  try { assert.equal(calls, 1); } finally { await app.close(); }
});
test('the module automatically sweeps incomplete uploads at startup and periodically', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const worker = new FileCleanupWorker({ async cleanup() { calls++; return { deleted: 1, failed: 0 }; } }, 1000);
  worker.onModuleInit(); await settle(); assert.equal(calls, 1);
  t.mock.timers.tick(1000); await settle(); assert.equal(calls, 2);
  await worker.onModuleDestroy(); t.mock.timers.tick(10000); await settle(); assert.equal(calls, 2);
});
test('slow cleanup never overlaps another sweep and shutdown waits for the owned operation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, release;
  const worker = new FileCleanupWorker({ async cleanup() { calls++; await new Promise(resolve => { release = resolve; }); return { deleted: 0, failed: 0 }; } }, 1000);
  worker.onModuleInit(); await settle(); t.mock.timers.tick(10000); await settle(); assert.equal(calls, 1);
  let closed = false; const pending = worker.onModuleDestroy().then(() => { closed = true; });
  await settle(); assert.equal(closed, false); release(); await pending; assert.equal(closed, true);
  t.mock.timers.tick(10000); await settle(); assert.equal(calls, 1);
});
test('a failed sweep is reported without raw errors and a later scheduled sweep still runs', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, failures = 0;
  const worker = new FileCleanupWorker({ async cleanup() { calls++; if (calls === 1) throw new Error('private provider data'); return { deleted: 0, failed: 1 }; } }, 1000,
    (...args) => { assert.equal(args.length, 0); failures++; });
  worker.onModuleInit(); await settle(); assert.equal(failures, 1);
  t.mock.timers.tick(1000); await settle(); assert.equal(calls, 2); assert.equal(failures, 2);
  await worker.onModuleDestroy();
});
