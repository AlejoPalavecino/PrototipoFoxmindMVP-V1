import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

function fixture(session) {
  const routes = [], calls = [], user = { id: '11111111-1111-4111-8111-111111111111', firstName: 'Synthetic', lastName: 'User', email: 'synthetic@example.test', emailVerified: true };
  const account = loadTsModule('apps/web/src/lib/account-client.ts');
  const navigation = loadTsModule('apps/web/src/lib/classroom-client.ts');
  const noop = () => null, placeholder = new Proxy({ default: noop }, { get: (target, key) => key === '__esModule' ? true : target[key] ?? noop });
  const client = { session: async () => session ?? { authenticated: true, user },
    read: async path => { calls.push(['read', path]); return user; },
    mutate: async (path, fields, method) => { calls.push(['mutate', path, fields, method]); return { result: user, session: { authenticated: false } }; } };
  const ports = { 'next/head': placeholder, 'next/link': placeholder,
    'next/router': { useRouter: () => ({ isReady: true, query: {}, push: async path => routes.push(path) }) },
    '../lib/account-client': { ...account, createAccountClient: () => client }, '../lib/classroom-client': navigation,
  };
  for (const name of ['./ui/button', './ui/input', './ui/label', './account-navbar',
    '../../../shared-ui/VerificationGuidance', '../../../shared-ui/AccountStory', '../../../shared-ui', '../../../shared-ui/index',
    '../../../shared-ui/FoxmindIllustration']) ports[name] = placeholder;
  return { AccountScreen: componentWithPorts('apps/web/src/components/account-screen.tsx', ports).AccountScreen, calls, routes };
}
const fields = tree => descendants(tree, node => typeof node.props.name === 'string').map(node => node.props.name);

for (const viewName of ['profile', 'settings']) test(`D2 ${viewName} keeps personal fields and account security in their own screen`, async () => {
  const oldWindow = globalThis.window, oldStorage = globalThis.sessionStorage;
  globalThis.window = new EventTarget(); globalThis.sessionStorage = { getItem: () => null };
  let view, childView;
  try {
    const f = fixture(); view = hookView(f.AccountScreen, { view: viewName }); await view.flush();
    const child = descendants(view.tree, node => ['AccountProfile', 'AccountSettings'].includes(node.type?.name))[0];
    if (child) { childView = hookView(child.type, child.props); await childView.flush(); }
    const content = childView ? childView.tree : view.tree;
    const names = fields(content);
    if (viewName === 'profile') {
      assert.ok(names.includes('firstName') && names.includes('lastName'));
      assert.equal(names.includes('currentPassword'), false); assert.equal(names.includes('newPassword'), false);
      assert.ok(descendants(content, node => node.props.id === 'profile-email' && node.props.readOnly).length);
    } else {
      assert.ok(names.includes('currentPassword') && names.includes('newPassword'));
      assert.equal(names.includes('firstName'), false); assert.equal(names.includes('lastName'), false);
    }
    assert.equal(f.calls.filter(([type]) => type === 'mutate').length, 0, 'Opening either screen performs no mutation');
  } finally {
    childView?.close(); view?.close(); if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = oldStorage;
  }
});
