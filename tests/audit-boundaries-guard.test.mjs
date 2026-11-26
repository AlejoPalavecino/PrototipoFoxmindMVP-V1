import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkBoundaries } from '../scripts/check-boundaries.mjs';
import { legacyEdges } from '../scripts/boundary-legacy-edges.mjs';

async function fixture(files, inspect) {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-arq04-'));
  try {
    for (const [path, content] of Object.entries(files)) await put(root, path, content);
    return await inspect(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function put(root, path, content) { const file = join(root, path); await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); }
test('backend imports shared rules from their owner while the frontend compatibility entry remains usable', async () => {
  await fixture({
    'src/core/domain/index.ts': "export { parse } from './agenda/input.ts';",
    'src/core/domain/agenda/input.ts': 'export const parse = value => value;',
    'apps/web/src/features/agenda/model/input.ts': "import { parse } from '../../../../../../src/core/domain/index.ts'; export { parse };",
    'apps/api/src/modules/agenda/events/application/input.ts': "import { parse } from '../../../../../../../src/core/domain/agenda/input.ts'; export { parse };",
  }, async root => {
    assert.deepEqual(checkBoundaries(root), []);
    await put(root, 'apps/api/src/bootstrap/broad.ts', "import { parse } from '../../../../src/core/domain/index.ts'; export { parse };");
    assert.match(checkBoundaries(root).join('\n'), /backend global domain entry/);
    await put(root, 'apps/api/src/modules/agenda/events/application/broad.ts', "import { parse } from '../../../../../../../src/core/domain/index.ts'; export { parse };");
    assert.equal(checkBoundaries(root).filter(value => value.includes('backend global domain entry')).length, 2);
  });
});

test('boundary guard accepts pure domain and rejects injected forbidden imports and capability inheritance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-audit-boundaries-'));
  try {
    await put(root, 'src/core/domain/safe.ts', 'export const value = 1;');
    assert.deepEqual(await checkBoundaries(root), []);
    await put(root, 'src/core/domain/bad.ts', "import { Injectable } from '@nestjs/common'; export { Injectable };");
    assert.ok((await checkBoundaries(root)).length > 0, 'domain to Nest must fail');
    await rm(join(root, 'src/core/domain/bad.ts'));
    await put(root, 'apps/shared-ui/bad.ts', "import { internal } from '../api/src/modules/classrooms/catalog/application/core.ts'; export { internal };");
    assert.match((await checkBoundaries(root)).join('\n'), /UI to backend/, 'UI to server internals must fail');
    await rm(join(root, 'apps/shared-ui/bad.ts'));
    await put(root, 'apps/api/src/modules/classrooms/catalog/application/plan.ts', 'class PlanService extends OtherService {} class Failure extends Error {}');
    assert.deepEqual(await checkBoundaries(root), ['capability inheritance: apps/api/src/modules/classrooms/catalog/application/plan.ts -> PlanService extends OtherService']);
  } finally { await rm(root, { recursive: true, force: true }); }
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

test('absolute module paths cannot bypass the boundary', async () => {
  await fixture({
    'apps/api/src/modules/classrooms/catalog/application/absolute.ts': "export const load = () => import('file:///C:/repo/apps/api/src/modules/files/public.ts');",
  }, root => {
    assert.match(checkBoundaries(root).join('\n'), /absolute module path: .*absolute\.ts/);
  });
});

test('Foxy runtime cannot reopen the former Files exception or import the host adapter', async () => {
  const path = 'apps/api/src/foxy-ai/runtime.ts';
  await fixture({
    [path]: "import type { FileService } from '../files/index.ts'; import { createFoxyFileOperations } from '../bootstrap/foxy-file-integration.ts'; async function load() { const { createDurableFoxyDocumentReader } = await import('../files/index.ts'); }",
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

test('historical private imports and new symbols are both rejected', async () => {
  await fixture({
    'apps/api/src/classrooms/practical-submissions.ts': "import type { FileRow } from '../files/store.ts';",
    'apps/api/src/classrooms/session-readers.ts': "import type { Unexpected } from '../files/store.ts';",
  }, root => {
    const violations = checkBoundaries(root).join('\n');
    assert.match(violations, /cross-module private API: .*session-readers\.ts/);
    assert.match(violations, /cross-module private API: .*practical-submissions\.ts/);
  });
});

test('architecture baseline is empty and strict mode needs no historical exceptions', async () => {
  assert.equal(legacyEdges.size, 0);
  await fixture({ 'apps/api/src/classrooms/practical-submissions.ts': 'export {};' }, root => {
    assert.deepEqual(checkBoundaries(root), []);
    assert.deepEqual(checkBoundaries(root, { checkStale: true }), []);
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

test('capability layers accept their own dependencies and shared module domain', async () => {
  await fixture({
    'apps/api/src/modules/curriculum/plan/domain/rule.ts': "import { shared } from '../../domain/shared.ts';",
    'apps/api/src/modules/curriculum/plan/application/run.ts': "import { rule } from '../domain/rule.ts'; import type { Input } from '../../application/contracts.ts';",
    'apps/api/src/modules/curriculum/plan/infrastructure/store.ts': "import type { Repository } from '../application/repository.ts'; import { pool } from '../../../../platform/database.ts';",
    'apps/api/src/modules/curriculum/plan/presentation/http.ts': "import { run } from '../application/run.ts';",
    'apps/api/src/modules/curriculum/plan/public.ts': "export { run } from './application/run.ts'; export type { Rule } from './domain/rule.ts';",
    'apps/api/src/modules/curriculum/public.ts': "export { run } from './plan/public.ts';",
    'apps/api/src/modules/grading/review/application/read.ts': "import { run } from '../../../curriculum/public.ts';",
    'apps/api/src/bootstrap/plan.ts': "import { Store } from '../modules/curriculum/plan/infrastructure/store.ts';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
});

test('capabilities reject private siblings, reverse layers and impure domain imports', async () => {
  for (const [source, target] of [
    ['domain/rule.ts', '../application/run.ts'],
    ['domain/rule.ts', '../infrastructure/store.ts'],
    ['domain/rule.ts', '../../generation/domain/rule.ts'],
    ['domain/rule.ts', '../../application/contracts.ts'],
    ['domain/rule.ts', '@nestjs/common'],
    ['application/run.ts', '../infrastructure/store.ts'],
    ['application/run.ts', '../presentation/http.ts'],
    ['presentation/http.ts', '../infrastructure/store.ts'],
    ['application/run.ts', '../../generation/application/run.ts'],
    ['application/run.ts', '../../generation/infrastructure/store.ts'],
    ['presentation/http.ts', '../../generation/infrastructure/store.ts'],
    ['infrastructure/store.ts', '../../generation/infrastructure/store.ts'],
    ['application/run.ts', '../../application/implementation.ts'],
    ['application/run.ts', '../public.ts'],
    ['application/run.ts', '../../public.ts'],
    ['application/run.ts', '../../../../platform/database.ts'],
    ['application/run.ts', '../../../../bootstrap/plan.ts'],
    ['application/run.ts', 'node:fs'],
    ['presentation/http.ts', '../../../../platform/database.ts'],
  ]) {
    await fixture({ [`apps/api/src/modules/curriculum/plan/${source}`]: `import { value } from '${target}';` }, root => {
      assert.ok(checkBoundaries(root).length, `${source} -> ${target}`);
    });
  }
});

test('capability public APIs expose only named exports of their own domain and application', async () => {
  for (const [file, code] of [
    ['plan/public.ts', "export { Store } from './infrastructure/store.ts';"],
    ['plan/public.ts', "export * from './application/run.ts';"],
    ['plan/public.ts', "export * as all from './application/run.ts';"],
    ['plan/public.ts', "import { run } from './application/run.ts'; export { run };"],
    ['plan/public.ts', "export { run } from '../generation/application/run.ts';"],
    ['plan/public.ts', "export { shared } from '../domain/shared.ts';"],
    ['public.ts', "export { run } from './plan/application/run.ts';"],
    ['public.ts', "import { run } from './plan/public.ts'; export { run };"],
    ['public.ts', "export * from './plan/public.ts';"],
    ['domain/shared.ts', "import { rule } from '../plan/domain/rule.ts';"],
    ['application/legacy.ts', "import { run } from '../plan/application/run.ts';"],
  ]) {
    await fixture({ [`apps/api/src/modules/curriculum/${file}`]: code }, root => {
      assert.ok(checkBoundaries(root).length, `${file}: ${code}`);
    });
  }
  await fixture({
    'apps/api/src/modules/curriculum/public.ts': "export { run } from './application/run.ts'; export type { Rule } from './domain/rule.ts';",
  }, root => assert.deepEqual(checkBoundaries(root), [], 'legacy named module exports stay valid'));
});

test('siblings consume a named capability contract without opening namespaces or other modules', async () => {
  for (const code of [
    "import { run } from '../../generation/public.ts';",
    "import type { Input } from '../../generation/public.ts';",
    "export type Input = import('../../generation/public.ts').Input;",
  ]) {
    await fixture({ 'apps/api/src/modules/curriculum/plan/application/run.ts': code }, root => {
      assert.deepEqual(checkBoundaries(root), [], code);
    });
  }
  for (const code of [
    "import * as all from '../../generation/public.ts';",
    "import run from '../../generation/public.ts';",
    "import run, { Input } from '../../generation/public.ts';",
    "export * from '../../generation/public.ts';",
    "export type All = typeof import('../../generation/public.ts');",
    "const load = () => import('../../generation/public.ts');",
    "const load = () => require('../../generation/public.ts');",
    "import { run } from '../../../grading/review/public.ts';",
    "import run from '../../../grading/public.ts';",
  ]) {
    await fixture({ 'apps/api/src/modules/curriculum/plan/application/run.ts': code }, root => {
      assert.ok(checkBoundaries(root).length, code);
    });
  }
});

test('capability layout preserves platform, core, UI isolation and cycle detection', async () => {
  for (const [file, target] of [
    ['apps/api/src/platform/database.ts', '../modules/curriculum/plan/application/run.ts'],
    ['src/core/domain/rule.ts', '../../../apps/api/src/modules/curriculum/plan/domain/rule.ts'],
    ['apps/web/src/features/curriculum/model/plan.ts', '../../../../../api/src/modules/curriculum/plan/public.ts'],
  ]) {
    await fixture({ [file]: `import { value } from '${target}';` }, root => assert.ok(checkBoundaries(root).length, file));
  }
  await fixture({
    'apps/api/src/modules/curriculum/plan/application/a.ts': "import './b.ts';",
    'apps/api/src/modules/curriculum/plan/application/b.ts': "import './a.ts';",
  }, root => assert.ok(checkBoundaries(root).some(value => value.startsWith('eager cycle'))));
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
    'apps/web/src/features/agenda/calendar/Agenda.tsx': "import { Notice } from '../../../shared/ui/notice.tsx';",
    'apps/web/src/features/agenda/model/view.ts': "import { parseAgendaEvent } from '../../../../../../src/core/domain/agenda-validation.ts';",
    'apps/web/src/shared/ui/notice.tsx': "import React from 'react';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
});

test('former Agenda compatibility bridges cannot reopen private implementation access', async () => {
  for (const [code, allowed] of [
    ["export { AgendaService, createAgendaService } from '../modules/agenda/events/application/agenda-service.ts';", false],
    ["export { futureInternalHelper } from '../modules/agenda/events/application/agenda-service.ts';", false],
    ["export { futureInternalHelper as AgendaService } from '../modules/agenda/events/application/agenda-service.ts';", false],
    ["export type { AgendaService, createAgendaService } from '../modules/agenda/events/application/agenda-service.ts';", false],
    ["import { AgendaService } from '../modules/agenda/events/application/agenda-service.ts';", false],
    ["export * from '../modules/agenda/events/application/agenda-service.ts';", false],
    ["export { store } from '../modules/agenda/events/infrastructure/event-repository.ts';", false],
  ]) {
    await fixture({ 'apps/api/src/agenda/agenda-service.ts': code }, root =>
      assert.equal(checkBoundaries(root).length === 0, allowed, code));
  }
  await fixture({
    'apps/shared-ui/EventForm.tsx': "export { EventForm } from '../web/src/features/agenda/ui/EventForm.tsx';",
  }, root => assert.ok(checkBoundaries(root).length));
  await fixture({
    'apps/shared-ui/EventForm.tsx': "export { EventFields } from '../web/src/features/agenda/ui/EventFields.tsx';",
  }, root => assert.ok(checkBoundaries(root).length));
});

test('legacy sources cannot import bootstrap wiring or reopen the former classroom Agenda facade', async () => {
  for (const [file, code, kind] of [
    ['apps/api/src/agenda/host.ts', "export { installAgendaTransport } from '../bootstrap/agenda-transport.ts';", 'host-only dependency'],
    ['apps/api/src/agenda/unit-of-work.ts', "export { createAgendaUnitOfWork } from '../bootstrap/agenda-composition.ts';", 'host-only dependency'],
    ['apps/api/src/modules/classrooms/public.ts', "export { createAcademicAgenda } from '../agenda/public.ts';", 'module public surface dependency'],
  ]) await fixture({ [file]: code }, root => assert.ok(checkBoundaries(root).some(value => value.startsWith(kind)), code));
});

test('retired integration paths no longer grant host composition privileges', async () => {
  for (const file of ['attachment-integration.ts', 'foxy-file-integration.ts', 'study-file-integration.ts', 'study-agenda-integration.ts', 'study-folders/http.ts']) {
    const target = file.includes('/') ? '../modules/files/custody/infrastructure/store.ts' : './modules/files/infrastructure/store.ts';
    await fixture({ [`apps/api/src/${file}`]: `import { Store } from '${target}';` }, root => {
      assert.ok(checkBoundaries(root).some(value => value.startsWith('cross-module private API')), file);
    });
  }
  for (const file of ['application.ts', 'main.ts', 'configuration.ts', 'bootstrap/composition.ts']) {
    const target = file.includes('/') ? '../modules/files/custody/infrastructure/store.ts' : './modules/files/infrastructure/store.ts';
    await fixture({ [`apps/api/src/${file}`]: `import { Store } from '${target}';` }, root => {
      assert.deepEqual(checkBoundaries(root), [], file);
    });
  }
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

test('every feature pure API facade has the same named public and browser-only constraints', async () => {
  await fixture({
    'apps/web/src/application/client.ts': "import { Client } from '../features/foxy/api.ts';",
    'apps/web/src/features/foxy/api.ts': "export type { Client } from './api/client.ts';",
    'apps/web/src/features/foxy/api/client.ts': "import type { Data } from '../model/types.ts';",
  }, root => assert.deepEqual(checkBoundaries(root), []));
  for (const code of ["import fs from 'fs';", "import { View } from '../ui/View.tsx';", "import { useState } from 'react';"]) {
    await fixture({'apps/web/src/features/study/api/client.ts':code},root=>assert.ok(checkBoundaries(root).length));
  }
});

test('neutral contracts are scanned and cannot hide framework or backend imports', async () => {
  for (const target of ['node:fs','next/router','../../../apps/api/src/private.ts']) {
    await fixture({'src/core/contracts/learning.ts':`import { value } from '${target}';`},root=>assert.ok(checkBoundaries(root).length,target));
  }
});

test('test-only Node dependencies stay executable without becoming production imports', async () => {
  await fixture({'apps/api/src/modules/files/application/run.test.ts':"import test from 'node:test'; import assert from 'node:assert/strict';"},root=>assert.deepEqual(checkBoundaries(root),[]));
  await fixture({
    'apps/api/src/modules/files/application/run.ts':"import { fixture } from './run.test.ts';",
    'apps/api/src/modules/files/application/run.test.ts':"import fs from 'node:fs';",
  },root=>assert.ok(checkBoundaries(root).some(x=>x.startsWith('production test dependency'))));
});
