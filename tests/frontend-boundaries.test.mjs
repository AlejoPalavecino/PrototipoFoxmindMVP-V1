import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkFrontendArchitecture } from '../scripts/check-frontend-architecture.mjs';

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
