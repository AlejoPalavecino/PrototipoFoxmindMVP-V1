import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useUrlNavigation } from '../useUrlNavigation';
import type { Role } from '../../types';
import type { AppView } from '../navigation';
import { createUrlNavigation, decodeRoute, encodeRoute, type HistoryHost } from '../routing';

// push/replace deliberately do not dispatch popstate, like the browser.
function browserAt(path: string) {
  const entries = [path];
  let index = 0;
  const listeners = new Set<() => void>();
  const writes: { mode: string; state: unknown; path: string }[] = [];
  const location = { pathname: '', search: '', hash: '' };
  const update = () => {
    const url = new URL(entries[index], 'https://foxmind.test');
    Object.assign(location, { pathname: url.pathname, search: url.search, hash: url.hash });
  };
  const write = (mode: string, state: unknown, url: string | URL | null | undefined) => {
    const path = String(url);
    writes.push({ mode, state, path });
    if (mode === 'push') {
      entries.splice(index + 1);
      entries.push(path);
      index++;
    } else {
      entries[index] = path;
    }
    update();
  };
  update();
  const host: HistoryHost = {
    location,
    history: {
      pushState: (state, _unused, url) => write('push', state, url),
      replaceState: (state, _unused, url) => write('replace', state, url),
    },
    addEventListener: (_event, listener) => { listeners.add(listener); },
    removeEventListener: (_event, listener) => { listeners.delete(listener); },
  };
  return {
    host, writes, entries, listeners,
    travel(delta: number) {
      index = Math.max(0, Math.min(entries.length - 1, index + delta));
      update();
      for (const listener of listeners) listener();
    },
  };
}

const roleViews: Record<Exclude<Role, 'none'>, AppView[]> = {
  alumno: ['dashboard', 'aulas', 'progreso', 'mensajes', 'config', 'estudia'],
  docente: ['dashboard', 'agenda', 'aulas', 'progreso', 'copiloto', 'mensajes', 'config'],
};

test('root and every role/view round-trip; cross-role views fall back to that dashboard', () => {
  deepStrictEqual(decodeRoute('/'), { role: 'none', view: 'dashboard' });
  equal(encodeRoute({ role: 'none', view: 'dashboard' }), '/');
  for (const role of ['alumno', 'docente'] as const) {
    for (const view of roleViews[role]) {
      const route = { role, view };
      equal(encodeRoute(route), `/${role}/${view}`);
      deepStrictEqual(decodeRoute(`/${role}/${view}`), route);
    }
  }
  for (const path of ['/alumno/agenda', '/alumno/copiloto', '/docente/estudia']) {
    equal(decodeRoute(path).view, 'dashboard');
  }
});

test('durable IDs round-trip safely into role-appropriate params only', () => {
  for (const id of ['aula 1', 'curso/uno', 'ñ?#%', '💬', 'x.y']) {
    for (const role of ['alumno', 'docente'] as const) {
      const params = role === 'alumno' ? { aulaId: id } : { openAulaId: id };
      const route = { role, view: 'aulas' as const, navigationParams: params };
      equal(encodeRoute(route), `/${role}/aulas/${encodeURIComponent(id)}`);
      deepStrictEqual(decodeRoute(encodeRoute(route)), route);
      const message = { role, view: 'mensajes' as const, navigationParams: { conversationId: id } };
      deepStrictEqual(decodeRoute(encodeRoute(message)), message);
    }
  }
  equal(encodeRoute({ role: 'docente', view: 'aulas', navigationParams: { aulaId: 'wrong-role' } }), '/docente/aulas');
});

test('invalid paths consistently canonicalize to known-role dashboard or root', () => {
  for (const path of ['/other/dashboard', '/ALUMNO/aulas', '/%ZZ/aulas', '//alumno/aulas', '/unknown']) {
    equal(encodeRoute(decodeRoute(path)), '/');
  }
  for (const suffix of ['', '/unknown', '/aulas/', '/aulas/x/y', '/config/x', '/aulas/%', '/mensajes/%ZZ', '/aulas/%C0%AF', '/aulas/%2e%2e']) {
    equal(encodeRoute(decodeRoute(`/docente${suffix}`)), '/docente/dashboard', suffix);
  }
  for (const id of ['', '.', '..', '\uD800']) {
    equal(encodeRoute({ role: 'alumno', view: 'aulas', navigationParams: { aulaId: id } }), '/alumno/aulas');
  }
});

test('initial hydration reads location without writing during construction; subscription replaces invalid URL', () => {
  const browser = browserAt('/docente/aulas/math%2F1');
  const navigation = createUrlNavigation(browser.host);
  deepStrictEqual(navigation.getSnapshot(), {
    role: 'docente', view: 'aulas', navigationParams: { openAulaId: 'math/1' },
  });
  equal(browser.writes.length, 0);
  const invalid = browserAt('/alumno/copiloto?initialPrompt=private#draft');
  const fallback = createUrlNavigation(invalid.host);
  deepStrictEqual(fallback.getSnapshot(), { role: 'alumno', view: 'dashboard' });
  const stop = fallback.subscribe(() => {});
  deepStrictEqual(invalid.writes, [{ mode: 'replace', state: null, path: '/alumno/dashboard' }]);
  stop();
});

test('push and replace update snapshots explicitly; traversal clears transient payloads', () => {
  const browser = browserAt('/docente/dashboard');
  const navigation = createUrlNavigation(browser.host);
  let notifications = 0;
  const stop = navigation.subscribe(() => { notifications++; });
  navigation.setView('copiloto', { initialPrompt: 'private prompt' });
  equal(navigation.getSnapshot().navigationParams?.initialPrompt, 'private prompt');
  equal(browser.host.location.pathname, '/docente/copiloto');
  equal(notifications, 1);
  navigation.navigate('mensajes', { conversationId: 'c/1', contactId: 'private contact' }, 'replace');
  equal(browser.writes[1].mode, 'replace');
  equal(browser.entries.length, 2);
  browser.travel(-1);
  deepStrictEqual(navigation.getSnapshot(), { role: 'docente', view: 'dashboard' });
  browser.travel(1);
  deepStrictEqual(navigation.getSnapshot(), {
    role: 'docente', view: 'mensajes', navigationParams: { conversationId: 'c/1' },
  });
  equal(notifications, 4);
  stop();
});

test('forward returns to a prompt screen without stale context; valid IDs canonicalize without query/hash', () => {
  const browser = browserAt('/docente/aulas/%61?contactId=private#draft');
  const navigation = createUrlNavigation(browser.host);
  const stop = navigation.subscribe(() => {});
  deepStrictEqual(browser.writes[0], { mode: 'replace', state: null, path: '/docente/aulas/a' });
  navigation.setView('copiloto', { initialPrompt: 'private prompt' });
  browser.travel(-1);
  equal(navigation.getSnapshot().navigationParams?.openAulaId, 'a');
  browser.travel(1);
  deepStrictEqual(navigation.getSnapshot(), { role: 'docente', view: 'copiloto' });
  stop();
});

test('same-path navigation applies fresh transient payloads without duplicate entries', () => {
  const browser = browserAt('/docente/copiloto');
  const navigation = createUrlNavigation(browser.host);
  const stop = navigation.subscribe(() => {});
  navigation.setView('copiloto', { initialPrompt: 'first' });
  const first = navigation.getSnapshot();
  navigation.setView('copiloto', { initialPrompt: 'second' });
  equal(navigation.getSnapshot().navigationParams?.initialPrompt, 'second');
  ok(navigation.getSnapshot() !== first);
  equal(browser.writes.length, 0);
  navigation.setView('copiloto');
  equal(navigation.getSnapshot().navigationParams, undefined);
  stop();
});

test('role changes reset view/params; empty view and none role use safe root behavior', () => {
  const browser = browserAt('/docente/aulas/a');
  const navigation = createUrlNavigation(browser.host);
  navigation.setRole('alumno');
  deepStrictEqual(navigation.getSnapshot(), { role: 'alumno', view: 'dashboard' });
  navigation.setView('aulas', { aulaId: 'a', taskTitle: 'legacy title' });
  navigation.setRole('alumno');
  deepStrictEqual(navigation.getSnapshot(), { role: 'alumno', view: 'dashboard' });
  navigation.setView('agenda');
  equal(browser.host.location.pathname, '/alumno/dashboard');
  navigation.setView('');
  deepStrictEqual(navigation.getSnapshot(), { role: 'none', view: 'dashboard' });
  navigation.setRole('docente');
  navigation.setRole('none');
  navigation.setView('aulas', { openAulaId: 'ignored' });
  deepStrictEqual(navigation.getSnapshot(), { role: 'none', view: 'dashboard' });
  equal(browser.host.location.pathname, '/');
});

test('privacy: compatibility payloads are memory-only and reload never restores them', () => {
  const browser = browserAt('/docente/dashboard');
  const navigation = createUrlNavigation(browser.host);
  navigation.setView('aulas', { openAulaId: 'id', openTask: true, subject: 'secret subject', taskTitle: 'secret title' });
  navigation.setView('mensajes', { conversationId: 'c', contactId: 'secret contact' });
  navigation.setView('copiloto', { initialPrompt: 'secret prompt' });
  ok(navigation.getSnapshot().navigationParams?.initialPrompt);
  ok(!JSON.stringify(browser.writes).includes('secret'));
  for (const write of browser.writes) equal(write.state, null);
  deepStrictEqual(createUrlNavigation(browser.host).getSnapshot(), { role: 'docente', view: 'copiloto' });
});

test('subscriptions share one listener, clean up, and resubscribe safely without stale traversal state', () => {
  const browser = browserAt('/docente/dashboard');
  const navigation = createUrlNavigation(browser.host);
  const stopA = navigation.subscribe(() => {});
  const stopB = navigation.subscribe(() => {});
  equal(browser.listeners.size, 1);
  navigation.setView('copiloto', { initialPrompt: 'keep through StrictMode resubscribe' });
  stopA();
  stopB();
  equal(browser.listeners.size, 0);
  const stopC = navigation.subscribe(() => {});
  equal(navigation.getSnapshot().navigationParams?.initialPrompt, 'keep through StrictMode resubscribe');
  stopC();
  browser.travel(-1);
  const stopD = navigation.subscribe(() => {});
  deepStrictEqual(navigation.getSnapshot(), { role: 'docente', view: 'dashboard' });
  stopD();
  equal(browser.listeners.size, 0);
});

test('no-window controller is safe and each snapshot read is stable', () => {
  const navigation = createUrlNavigation();
  const initial = navigation.getSnapshot();
  equal(navigation.getSnapshot(), initial);
  deepStrictEqual(initial, { role: 'none', view: 'dashboard' });
  const stop = navigation.subscribe(() => {});
  navigation.setRole('docente');
  navigation.setView('config');
  equal(navigation.getSnapshot().view, 'config');
  stop();
});

test('the hook can render on the server without window', () => {
  function Harness() {
    const { role, view } = useUrlNavigation();
    return createElement('span', null, `${role}:${view}`);
  }
  equal(renderToStaticMarkup(createElement(Harness)), '<span>none:dashboard</span>');
});

test('App delegates navigation to the hook (wiring check, not mounted-browser evidence)', () => {
  const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  ok(app.includes('useUrlNavigation()'));
  ok(!app.includes('useState<Role>'));
  ok(!app.includes('useState<AppView>'));
});
