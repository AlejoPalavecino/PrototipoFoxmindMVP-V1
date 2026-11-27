import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkFrontendArchitecture, measureFrontendSize } from '../scripts/check-frontend-architecture.mjs';

async function fixture(t, files) {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-frontend-boundaries-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, source] of Object.entries(files)) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), source);
  }
  return root;
}

test('frontend imports the owning neutral domain rather than its global aggregate', async t => {
  const root = await fixture(t, { 'apps/web/src/features/home/dashboard/read.ts':
    "import type { HomeResponse } from '../../../../../../src/core/domain/index.ts';" });
  assert.ok(checkFrontendArchitecture(root).some(value => value.includes('global domain aggregate')));
});

test('typed feature presentation cannot call the raw HTTP transport', async t => {
  const root = await fixture(t, { 'apps/web/src/features/materials/catalog/Library.tsx':
    "export function Library({api}) { return api.call('/room/library'); }" });
  assert.ok(checkFrontendArchitecture(root).some(value => value.includes('raw HTTP in feature presentation')));
});

test('generic shared styles cannot import feature-owned presentation', async t => {
  const root = await fixture(t, { 'apps/shared-ui/theme.css':
    "@import '../web/src/features/home/dashboard/home.css';" });
  assert.ok(checkFrontendArchitecture(root).some(value => value.includes('shared style dependency')));
});

test('application transport cannot depend on application clients', async t => {
  const root = await fixture(t, { 'apps/web/src/application/transport/classroom-client.ts':
    "import { decode } from '../clients/academic-response.ts';" });
  assert.ok(checkFrontendArchitecture(root).some(value => value.includes('transport depends on clients')));
});

test('application navigation renders navigation and leaves HTTP to clients', async t => {
  const root = await fixture(t, { 'apps/web/src/application/navigation/quota.ts':
    "export const read = browser => browser.fetch('/api/v1/quota');" });
  assert.ok(checkFrontendArchitecture(root).some(value => value.includes('HTTP in navigation')));
});

const stateful = count => 'import { useState } from "react";\nexport function Big() {\n' +
  Array.from({ length: count }, (_, i) => `  const [v${i}, s${i}] = useState(${i});\n`).join('') + '  return null;\n}\n';

test('new frontend files respect line length, file length and state count', async t => {
  const wide = 'export const wide = ' + JSON.stringify('x'.repeat(220)) + ';';
  const root = await fixture(t, {
    'apps/web/src/features/home/wide.tsx': wide + '\n',
    'apps/web/src/features/home/long.ts': 'export const a = 1;\n'.repeat(501),
    'apps/shared-ui/Stateful.tsx': stateful(11),
    'apps/web/src/features/home/fine.tsx': stateful(10),
  });
  const findings = checkFrontendArchitecture(root);
  assert.ok(findings.includes(`size limit: apps/web/src/features/home/wide.tsx lineLength ${wide.length} > 200`), findings.join('\n'));
  assert.ok(findings.includes('size limit: apps/web/src/features/home/long.ts fileLines 501 > 500'), findings.join('\n'));
  assert.ok(findings.includes('size limit: apps/shared-ui/Stateful.tsx useState 11 > 10'), findings.join('\n'));
  assert.ok(!findings.some(value => value.includes('fine.tsx')));
});

test('size exceptions are a baseline that only shrinks', async t => {
  const files = { 'apps/shared-ui/Stateful.tsx': stateful(12) };
  const baseline = exceptions => JSON.stringify({ exceptions });
  const at = async (exceptions, count) => checkFrontendArchitecture(await fixture(t, {
    ...files, 'apps/shared-ui/Stateful.tsx': stateful(count), 'scripts/frontend-size-baseline.json': baseline(exceptions) }));
  assert.deepEqual(await at({ 'apps/shared-ui/Stateful.tsx': { useState: 12 } }, 12), []);
  assert.deepEqual(await at({ 'apps/shared-ui/Stateful.tsx': { useState: 12 } }, 13), ['size limit: apps/shared-ui/Stateful.tsx useState 13 > 12']);
  assert.deepEqual(await at({ 'apps/shared-ui/Stateful.tsx': { useState: 12 } }, 11), ['size baseline can shrink: apps/shared-ui/Stateful.tsx useState 12 -> 11']);
  assert.deepEqual(await at({ 'apps/shared-ui/Stateful.tsx': { useState: 12 } }, 9), ['size baseline can shrink: apps/shared-ui/Stateful.tsx useState 12 -> 10']);
  assert.deepEqual(await at({ 'apps/shared-ui/Gone.tsx': { useState: 12 } }, 9), ['size baseline can shrink: apps/shared-ui/Gone.tsx removed']);
});

test('measureFrontendSize ignores the proxy owned by the server rewrite', async t => {
  const root = await fixture(t, { 'apps/web/src/application/server/proxy.ts': 'x'.repeat(500) + '\n' });
  assert.deepEqual(measureFrontendSize(root), {});
});

test('global composition is grouped and pure adapters remain permitted', async t => {
  const root = await fixture(t, {
    'apps/web/src/application/workflows/classroom-workspace/Workspace.tsx': "export const Workspace=()=>null;",
    'apps/web/src/features/materials/api/materials-api.ts': "export const list = api => api.call('/library');",
    'apps/shared-ui/controls.css': "@import './tokens.css';",
  });
  assert.deepEqual(checkFrontendArchitecture(root), []);
});

test('the current frontend satisfies ownership and presentation boundaries', () => {
  assert.deepEqual(checkFrontendArchitecture(), []);
});
