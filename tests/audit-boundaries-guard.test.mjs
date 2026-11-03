import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkBoundaries } from '../scripts/check-boundaries.mjs';

async function fixture(files, inspect) {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-arq04-'));
  try {
    for (const [path, content] of Object.entries(files)) await put(root, path, content);
    return await inspect(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

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

test('private API guard sees inline types, reexports, dynamic loads and import-equals', async () => {
  for (const consumer of [
    "export type T = import('../classrooms/core.ts').Internal;",
    "export type { Internal } from '../classrooms/core.ts';",
    "export const load = () => import(`../classrooms/core.ts`);",
    "import internal = require('../classrooms/core.ts'); export { internal };",
    "export const load = () => require('../classrooms/core.ts');",
    "export const load = () => module['require']('../classrooms/core.ts');",
    String.raw`export type T = import('..\\classrooms\\core.ts').Internal;`,
    "import { createRequire } from 'node:module'; export const load = () => createRequire(import.meta.url)('../classrooms/core.ts');",
    "import { createRequire as factory } from 'node:module'; const load = factory(import.meta.url); load('../classrooms/core.ts');",
  ]) {
    await fixture({ 'apps/api/src/files/consumer.ts': consumer }, root => {
      assert.match(checkBoundaries(root).join('\n'), /cross-module private API/, consumer);
    });
  }
});

test('the web boundary also covers helpers outside src and pages', async () => {
  await fixture({
    'apps/web/src/example.ts': "import '../helper';",
    'apps/web/helper.ts': "import '../api/src/classrooms/core.ts';",
  }, root => {
    assert.match(checkBoundaries(root).join('\n'), /UI to backend: apps\/web\/helper\.ts/);
  });
});

test('escaped names and absolute module paths cannot bypass the boundary', async () => {
  await fixture({
    'apps/api/src/files/public/index.ts': 'export interface FileStore {}',
    'apps/api/src/classrooms/example.ts': "import type { F\\u0069leStore as Store } from '../files/public/index.ts';",
    'apps/api/src/classrooms/absolute.ts': "export const load = () => import('file:///C:/repo/apps/api/src/files/store.ts');",
  }, root => {
    const violations = checkBoundaries(root).join('\n');
    assert.match(violations, /public surface dependency: .*example\.ts/);
    assert.match(violations, /absolute module path: .*absolute\.ts/);
  });
});

test('the Foxy runtime dynamic exception is limited to the existing reader binding', async () => {
  const path = 'apps/api/src/foxy-ai/runtime.ts';
  const original = "async function load() { const { createDurableFoxyDocumentReader } = await import('../files/index.ts'); }";
  await fixture({ [path]: original }, root => assert.deepEqual(checkBoundaries(root), []));
  await fixture({ [path]: original + "\nasync function other() { const { FileService } = await import('../files/index.ts'); }" }, root => {
    const violations = checkBoundaries(root).join('\n');
    assert.match(violations, /broad barrel dependency: .*FileService/);
    assert.doesNotMatch(violations, /createDurableFoxyDocumentReader/);
  });
  await fixture({ [path]: original.replace('{ createDurable', '{ ...createDurable') }, root => {
    assert.match(checkBoundaries(root).join('\n'), /broad barrel dependency: .*\.\.\.createDurableFoxyDocumentReader/);
  });
});

test('only composition may wire host entry points and a broad barrel does not grant access', async () => {
  await fixture({
    'apps/api/src/application.ts': "import { FilesModule } from './files/files.module.ts';",
    'apps/api/src/files/files.module.ts': 'export class FilesModule {}',
    'apps/api/src/files/index.ts': "export { FilesModule } from './files.module.ts';",
    'apps/api/src/classrooms/consumer.ts': "import { FilesModule } from '../files';",
    'apps/api/src/foxy-ai/consumer.ts': "import { FilesModule } from '../files/files.module.ts';",
  }, root => {
    const violations = checkBoundaries(root);
    assert.ok(violations.some(v => v.includes('classrooms/consumer.ts')));
    assert.ok(violations.some(v => v.includes('foxy-ai/consumer.ts')));
    assert.ok(violations.every(v => !v.includes('application.ts')));
  });
});

test('classifies new eager, deferred, type-only and mixed file cycles', async () => {
  for (const [kind, a, b] of [
    ['eager', "export { b } from './b.js';", "import './a'; export const b = 1;"],
    ['deferred', "export const load = () => import('./b.ts');", "import './a.ts';"],
    ['type-only', "export type A = import('./b.ts').B;", "import { type A } from './a.ts'; export type B = A;"],
    ['mixed', "import './b.ts'; export type A = number;", "export type B = import('./a.ts').A;"],
  ]) {
    await fixture({ 'apps/api/src/files/a.ts': a, 'apps/api/src/files/b.ts': b }, root => {
      assert.ok(checkBoundaries(root).some(v => v.includes(`${kind} cycle`)), kind);
    });
  }
});

test('a new symbol or import form cannot reuse a historical exception', async () => {
  await fixture({
    'apps/api/src/classrooms/practical-submissions.ts': "import type { FileRow } from '../files/store.ts';",
    'apps/api/src/classrooms/session-readers.ts': "import type { Unexpected } from '../files/store.ts';",
  }, root => {
    const violations = checkBoundaries(root).join('\n');
    assert.match(violations, /cross-module private API: .*session-readers\.ts/);
    assert.doesNotMatch(violations, /practical-submissions\.ts/);
  });
});

test('strict baseline mode detects an exception whose source dependency disappeared', async () => {
  await fixture({ 'apps/api/src/classrooms/practical-submissions.ts': 'export {};' }, root => {
    assert.deepEqual(checkBoundaries(root), []);
    assert.ok(checkBoundaries(root, { checkStale: true }).some(violation =>
      violation.startsWith('stale architecture exception: cross-module private API: apps/api/src/classrooms/practical-submissions.ts |')));
  });
});
