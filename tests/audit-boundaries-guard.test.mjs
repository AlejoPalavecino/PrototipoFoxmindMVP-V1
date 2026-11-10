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

test('Foxy runtime cannot reopen the former Files exception or import the host adapter', async () => {
  const path = 'apps/api/src/foxy-ai/runtime.ts';
  await fixture({
    [path]: "import type { FileService } from '../files/index.ts'; import { createFoxyFileOperations } from '../foxy-file-integration.ts'; async function load() { const { createDurableFoxyDocumentReader } = await import('../files/index.ts'); }",
  }, root => {
    const violations = checkBoundaries(root).join('\n');
    assert.match(violations, /broad barrel dependency: .*FileService/);
    assert.match(violations, /broad barrel dependency: .*createDurableFoxyDocumentReader/);
    assert.match(violations, /host-only dependency: .*foxy-file-integration/);
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

test('new backend modules expose a named public contract and keep private layers closed', async () => {
  for (const [target, allowed] of [['../../files/public.ts', true], ['../../files/application/read.ts', false], ['../../files/infrastructure/store.ts', false]]) {
    await fixture({
      'apps/api/src/modules/files/public.ts': 'export interface FileReader {}',
      'apps/api/src/modules/grading/application/read.ts': `import type { FileReader } from '${target}';`,
    }, root => assert.equal(checkBoundaries(root).length === 0, allowed, target));
  }
});

test('backend layer direction rejects infrastructure leaks and framework-bound domain rules', async () => {
  for (const [source, target] of [
    ['domain/rule.ts', '../application/use-case.ts'],
    ['domain/rule.ts', '../infrastructure/store.ts'],
    ['domain/rule.ts', '@nestjs/common'],
    ['application/use-case.ts', '../infrastructure/store.ts'],
    ['presentation/http.ts', '../infrastructure/store.ts'],
    ['application/use-case.ts', '../../../bootstrap/main.ts'],
  ]) {
    await fixture({ [`apps/api/src/modules/grading/${source}`]: `import { value } from '${target}';` }, root => {
      assert.ok(checkBoundaries(root).length, `${source} -> ${target}`);
    });
  }
  await fixture({
    'apps/api/src/modules/grading/application/run.ts': "import { rule } from '../domain/rule.ts';",
    'apps/api/src/modules/grading/infrastructure/store.ts': "import type { Repository } from '../application/ports/repository.ts';",
    'apps/api/src/modules/grading/presentation/http.ts': "import { run } from '../application/run.ts';",
    'apps/api/src/bootstrap/main.ts': "import { Store } from '../modules/grading/infrastructure/store.ts';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
});

test('public contracts and platform cannot reopen backend implementation boundaries', async () => {
  for (const [path, code] of [
    ['modules/files/public.ts', "export { Store } from './infrastructure/store.ts';"],
    ['modules/files/public.ts', "export * from './application/run.ts';"],
    ['platform/database.ts', "import { rule } from '../modules/grading/domain/rule.ts';"],
  ]) {
    await fixture({ [`apps/api/src/${path}`]: code }, root => assert.ok(checkBoundaries(root).length, path));
  }
  await fixture({
    'apps/api/src/modules/files/public.ts': "export type { Reader } from './application/ports/reader.ts';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
  await fixture({
    'apps/api/src/modules/grading/application/read.ts': "export type WholeModule = typeof import('../../files/public.ts');",
  }, root => assert.ok(checkBoundaries(root).length, 'a whole public namespace is not a named contract'));
});

test('frontend features and shared code cannot depend on higher layers or legacy feature internals', async () => {
  for (const [path, target] of [
    ['apps/web/src/features/agenda/model/view.ts', '../../foxy/model/chat.ts'],
    ['apps/web/src/features/agenda/model/view.ts', '../../../application/navigation/destinations.ts'],
    ['apps/web/src/features/agenda/model/view.ts', '../../../screens/agenda.tsx'],
    ['apps/web/src/features/agenda/model/view.ts', '../../../lib/classroom-client.ts'],
    ['apps/web/src/shared/ui/notice.tsx', '../../features/agenda/index.ts'],
    ['apps/web/src/screens/agenda.tsx', '../features/agenda/model/state.ts'],
    ['apps/shared-ui/Notice.tsx', '../classrooms-ui/components.tsx'],
  ]) {
    await fixture({ [path]: `export type Value = import('${target}').Value;` }, root => {
      assert.ok(checkBoundaries(root).length, `${path} -> ${target}`);
    });
  }
  await fixture({
    'apps/web/src/screens/agenda.tsx': "import { Agenda } from '../features/agenda/index.ts';",
    'apps/web/src/features/agenda/ui/Agenda.tsx': "import { Notice } from '../../../shared/ui/notice.tsx';",
    'apps/web/src/features/agenda/model/view.ts': "import { parseAgendaEvent } from '../../../../../../src/core/domain/agenda-validation.ts';",
    'apps/web/src/shared/ui/notice.tsx': "import React from 'react';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
});

test('Agenda compatibility bridges accept only exact named reexports', async () => {
  for (const [code, allowed] of [
    ["export { AgendaService, createAgendaService } from '../modules/agenda/application/agenda-service.ts';", true],
    ["export { futureInternalHelper } from '../modules/agenda/application/agenda-service.ts';", false],
    ["export { futureInternalHelper as AgendaService } from '../modules/agenda/application/agenda-service.ts';", false],
    ["export type { AgendaService, createAgendaService } from '../modules/agenda/application/agenda-service.ts';", false],
    ["import { AgendaService } from '../modules/agenda/application/agenda-service.ts';", false],
    ["export * from '../modules/agenda/application/agenda-service.ts';", false],
    ["export { store } from '../modules/agenda/infrastructure/event-repository.ts';", false],
  ]) {
    await fixture({ 'apps/api/src/agenda/agenda-service.ts': code }, root =>
      assert.equal(checkBoundaries(root).length === 0, allowed, code));
  }
  await fixture({
    'apps/agenda-ui/EventForm.tsx': "export { EventForm } from '../web/src/features/agenda/ui/EventForm.tsx';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
  await fixture({
    'apps/agenda-ui/EventForm.tsx': "export { EventFields } from '../web/src/features/agenda/ui/EventFields.tsx';",
  }, root => assert.ok(checkBoundaries(root).length));
});

test('identity transport facade stays public, named and free of UI or Node dependencies', async () => {
  await fixture({
    'apps/web/src/lib/consumer.ts': "import { createAccountClient } from '../features/identity/api.ts';",
    'apps/web/src/features/identity/api.ts': "export { createAccountClient } from './api/account-client.ts';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
  for (const [file, code] of [
    ['apps/web/src/lib/consumer.ts', "import { createAccountClient } from '../features/identity/api/account-client.ts';"],
    ['apps/web/src/lib/consumer.ts', "export * from '../features/identity/api.ts';"],
    ['apps/web/src/features/identity/api.ts', "export { AccountField } from './ui/account-field.tsx';"],
    ['apps/web/src/features/identity/api/account-client.ts', "import fs from 'node:fs';"],
    ['apps/web/src/features/identity/api/account-client.ts', "import fs from 'fs';"],
    ['apps/web/src/features/identity/api/account-client.ts', "import fs from 'fs/promises';"],
    ['apps/web/src/features/identity/api/account-client.ts', "import React from 'react';"],
    ['apps/web/src/features/identity/api/account-client.ts', "import { useRouter } from 'next/router';"],
    ['apps/web/src/features/identity/api/account-client.ts', "import { view } from '../model/account-view.ts';"],
  ]) await fixture({ [file]: code }, root => assert.ok(checkBoundaries(root).length, code));
});
