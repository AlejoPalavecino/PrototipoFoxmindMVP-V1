import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import * as publicApi from '../apps/web/src/features/identity/api.ts';
import * as canonicalApi from '../apps/web/src/features/identity/api/account-client.ts';

test('identity public entry exposes account UI, model and browser client without server transport', async () => {
  const feature = loadTsModule('apps/web/src/features/identity/index.ts');
  for (const name of ['AccountError', 'createAccountClient', 'validateAccountFields', 'AccountField', 'AccountFlowForms', 'AccountProfile', 'AccountSettings']) assert.equal(typeof feature[name], 'function');
  assert.equal(feature.accountContent['sign-in'].title, 'Volvé a tu espacio');
  assert.ok(feature.accountSurface.scope);
  const client = feature.createAccountClient(async () => Response.json({ error: { code: 'RATE_LIMITED' } }, { status: 429, headers: { 'Retry-After': '7' } }));
  await assert.rejects(client.session(), error => error instanceof feature.AccountError && error.retryAfter === 7);
  function inspect(path) {
    for (const file of readdirSync(path, { withFileTypes: true })) {
      const target = join(path, file.name);
      if (file.isDirectory()) inspect(target);
      else if (/\.tsx?$/.test(file.name)) assert.doesNotMatch(readFileSync(target, 'utf8'), /(?:from|import)\s*['"][^'"]*(?:node:|application\/|screens\/|lib\/|components\/|features\/(?!identity))/);
    }
  }
  inspect('apps/web/src/features/identity');
});


test('identity public transport preserves exact API identity after retiring legacy bridges', () => {
  assert.deepEqual(Object.keys(publicApi).sort(), ['AccountError', 'createAccountClient', 'validateAccountFields']);
  for (const name of Object.keys(publicApi)) assert.equal(publicApi[name], canonicalApi[name]);
  assert.ok(new publicApi.AccountError('AUTH_REQUIRED', 401) instanceof canonicalApi.AccountError);
  for (const legacy of ['lib/account-client.ts','components/account-screen.tsx','components/account-field.tsx',
    'components/account-flow-forms.tsx','components/account-profile.tsx','components/account-settings.tsx','components/account-view.ts']) {
    assert.equal(existsSync(`apps/web/src/${legacy}`),false,legacy);
  }
});
