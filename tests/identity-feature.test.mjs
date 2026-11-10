import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import * as legacyApi from '../apps/web/src/lib/account-client.ts';
import * as canonicalApi from '../apps/web/src/features/identity/api.ts';

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

test('identity legacy bridges preserve exact named API and error identity', () => {
  assert.deepEqual(Object.keys(legacyApi).sort(), ['AccountError', 'createAccountClient', 'validateAccountFields']);
  for (const name of Object.keys(legacyApi)) assert.equal(legacyApi[name], canonicalApi[name]);
  assert.ok(new legacyApi.AccountError('AUTH_REQUIRED', 401) instanceof canonicalApi.AccountError);
  const feature = loadTsModule('apps/web/src/features/identity/index.ts');
  for (const [legacy, target, names] of [
    ['lib/account-client.ts', '../features/identity/api.ts', ['AccountError', 'createAccountClient', 'validateAccountFields']],
    ['components/account-field.tsx', '../features/identity/index', ['AccountField']],
    ['components/account-flow-forms.tsx', '../features/identity/index', ['AccountFlowForms']],
    ['components/account-profile.tsx', '../features/identity/index', ['AccountProfile']],
    ['components/account-settings.tsx', '../features/identity/index', ['AccountSettings']],
    ['components/account-view.ts', '../features/identity/index', ['accountContent']],
  ]) {
    const bridge = loadTsModule(`apps/web/src/${legacy}`, { stubs: { [target]: feature } });
    assert.deepEqual(Object.keys(bridge).sort(), names.toSorted());
    for (const name of names) assert.equal(bridge[name], feature[name]);
    if (bridge.AccountError) assert.ok(new bridge.AccountError('AUTH_REQUIRED', 401) instanceof feature.AccountError);
  }
  const AccountScreen = () => null;
  const bridge = loadTsModule('apps/web/src/components/account-screen.tsx', { stubs: { '../screens/identity-screen': { AccountScreen }, '../features/identity/index': feature } });
  assert.deepEqual(Object.keys(bridge).sort(), ['AccountField', 'AccountScreen']);
  assert.equal(bridge.AccountScreen, AccountScreen);
  assert.equal(bridge.AccountField, feature.AccountField);
});
