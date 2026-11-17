import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { bounded, prepare } from '../apps/api/src/modules/curriculum/generation/infrastructure/ai/execution.ts';

test('C3 bounded operation starts lazily and propagates its resolved value', async () => {
  assert.equal(await bounded(() => Promise.resolve('done'), new AbortController().signal), 'done');
});

test('C3 already aborted preparation never starts file reading or token preflight', async () => {
  const controller = new AbortController(); controller.abort(); let reads = 0, counts = 0;
  await assert.rejects(prepare({ reader: { read: async () => { reads++; return { kind: 'text', text: 'fixture' }; } },
    provider: { countStudyPlanTokens: async () => { counts++; return 20; } } }, {}, controller.signal), { code: 'AI_TIMEOUT' });
  assert.equal(reads, 0); assert.equal(counts, 0);
});

test('C3 already aborted rejecting input cannot create an unhandled rejection', () => {
  const source = `import {prepare} from './apps/api/src/modules/curriculum/generation/infrastructure/ai/execution.ts';
    const controller=new AbortController();controller.abort();
    await prepare({reader:{read:async()=>{throw Error('synthetic canceled read');}},provider:{}},{},controller.signal).catch(()=>{});
    await new Promise(resolve=>setImmediate(resolve));`;
  const result = spawnSync(process.execPath, ['--unhandled-rejections=strict', '--input-type=module', '-e', source],
    { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 5000 });
  assert.equal(result.status, 0, result.stderr);
});
