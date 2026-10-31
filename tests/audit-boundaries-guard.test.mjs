import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkBoundaries } from '../scripts/check-boundaries.mjs';

async function put(root, path, content) { const file = join(root, path); await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); }
test('boundary guard accepts pure domain and rejects injected forbidden imports and capability inheritance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-audit-boundaries-'));
  try {
    await put(root, 'src/core/domain/safe.ts', 'export const value = 1;');
    assert.deepEqual(await checkBoundaries(root), []);
    await put(root, 'src/core/domain/bad.ts', "import { Injectable } from '@nestjs/common'; export { Injectable };");
    assert.ok((await checkBoundaries(root)).length > 0, 'domain to Nest must fail');
    await rm(join(root, 'src/core/domain/bad.ts'));
    await put(root, 'apps/classrooms-ui/bad.ts', "import { internal } from '../api/src/classrooms/core.ts'; export { internal };");
    assert.ok((await checkBoundaries(root)).length > 0, 'UI to server internals must fail');
    await rm(join(root, 'apps/classrooms-ui/bad.ts'));
    await put(root, 'apps/api/src/classrooms/plan.ts', 'class PlanService extends OtherService {}');
    assert.ok((await checkBoundaries(root)).length > 0, 'capability inheritance must fail');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('classroom may import only the exact lightweight files public barrel', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-audit-public-port-'));
  try {
    await put(root, 'apps/api/src/files/public/index.ts', 'export const port = 1;');
    await put(root, 'apps/api/src/files/public/private.ts', 'export const internal = 1;');
    await put(root, 'apps/api/src/classrooms/example.ts', "import { port } from '../files/public/index.ts'; export { port };");
    assert.deepEqual(await checkBoundaries(root), [], 'exact public barrel must be allowed');
    await put(root, 'apps/api/src/classrooms/example.ts', "import { internal } from '../files/public/private.ts'; export { internal };");
    assert.ok((await checkBoundaries(root)).length > 0, 'private file under public directory must remain blocked');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('mail and classrooms expose only their exact lightweight public barrels across slices', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-audit-other-ports-'));
  try {
    for (const [consumer, target] of [['classrooms', 'mail'], ['mail', 'classrooms']]) {
      await put(root, `apps/api/src/${target}/public/index.ts`, 'export const port = 1;');
      await put(root, `apps/api/src/${target}/public/private.ts`, 'export const secret = 1;');
      const file = `apps/api/src/${consumer}/sample.ts`;
      await put(root, file, `import { port } from '../${target}/public/index.ts'; export { port };`);
      assert.deepEqual(await checkBoundaries(root), [], `${target} exact barrel must be allowed`);
      await put(root, file, `import { secret } from '../${target}/public/private.ts'; export { secret };`);
      assert.ok((await checkBoundaries(root)).length > 0, `${target} private nested file must be blocked`);
      await rm(join(root, file));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('files may import the exact Foxy lightweight public barrel', async () => {
  const root=await mkdtemp(join(tmpdir(),'foxmind-audit-foxy-public-'));
  try {
    await put(root,'apps/api/src/foxy-ai/public/index.ts','export const port = 1;');
    await put(root,'apps/api/src/files/consumer.ts',"import { port } from '../foxy-ai/public/index.ts'; export { port };");
    assert.deepEqual(await checkBoundaries(root),[],'exact Foxy public barrel must be allowed');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('files cannot import Foxy internals or other files inside its public directory', async () => {
  const root=await mkdtemp(join(tmpdir(),'foxmind-audit-foxy-private-'));
  try {
    for(const target of ['../foxy-ai/public/private.ts','../foxy-ai/publication-authority.ts']) {
      await put(root,'apps/api/src/files/consumer.ts',`import { secret } from '${target}'; export { secret };`);
      const violations=await checkBoundaries(root);assert.ok(violations.some(v=>v.includes('cross-module private API')),target);
    }
  } finally {await rm(root,{recursive:true,force:true});}
});
