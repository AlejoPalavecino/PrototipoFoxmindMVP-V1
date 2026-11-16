import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

for (const args of [['--help'], ['--invalid'], ['--help', '--invalid']]) {
  test(`P6 integration CLI ${args.join(' ')} does not start a build or fixture`, () => {
    const result = spawnSync(process.execPath, ['scripts/test-p6-integration.mjs', ...args],
      { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, args.length === 1 && args[0] === '--help' ? 0 : 2);
    assert.match(result.stdout + result.stderr, /Usage: node scripts\/test-p6-integration\.mjs/);
    assert.doesNotMatch(result.stdout + result.stderr, /Prisma generation|database\/storage\/scanner ready|P4 isolated/);
  });
}

import { EventEmitter } from 'node:events';
import { openClassroom } from './p6-integration-helpers.mjs';

function collectionRetryPage(limitedParts) {
  const labels = { rooms: 'tus aulas', drafts: 'tus borradores', invitations: 'tus invitaciones' };
  const paths = { rooms: '/api/v1/classrooms', drafts: '/api/v1/classrooms/drafts',
    invitations: '/api/v1/classrooms/invitations' };
  const roomName = 'FixtureRoom', roomId = '00000000-0000-4000-8000-000000000001';
  const page = new EventEmitter(), pending = new Set(), limited = new Set(limitedParts);
  const requests = [], retries = [];
  let currentUrl = 'http://synthetic.test/mis-aulas', enteredRoom = null, globalRetries = 0, expiredWaiters = 0;
  const send = (path, status, body = {}) => {
    const actualRequest = { method: () => 'GET', url: () => `http://synthetic.test${path}` };
    requests.push(actualRequest); page.emit('request', actualRequest);
    page.emit('response', { request: () => actualRequest, url: actualRequest.url, status: () => status,
      ok: () => status >= 200 && status < 300, headers: () => status === 429 ? { 'retry-after': '1' } : {},
      json: async () => body });
  };
  const matches = (text, expected) => expected instanceof RegExp ? expected.test(text) : text.includes(expected);
  const retry = async part => {
    assert.ok(limited.has(part), 'Retry only a collection that actually failed');
    retries.push(part); limited.delete(part); send(paths[part], 200);
  };
  function locator(kind, parts = [...limited], options = {}) {
    return {
      filter(filter) {
        return filter.hasText === undefined ? locator(kind, parts, options)
          : locator(kind, parts.filter(part => matches(`No pudimos cargar ${labels[part]}.`, filter.hasText)), options);
      },
      getByRole(role, child = {}) {
        if (kind === 'alert' && role === 'button' && child.name === 'Volver a intentar')
          return { click: async () => { assert.equal(parts.length, 1, 'A retry action must identify one resource alert'); await retry(parts[0]); } };
        throw new Error('Unexpected synthetic locator action');
      },
      async count() { return kind === 'article' ? 1 : parts.length; },
      async waitFor() { if (kind === 'heading') assert.equal(enteredRoom, options.name); },
    };
  }
  page.getByRole = (role, options = {}) => {
    if (role === 'button' && options.name === 'Volver a intentar') return { click: async () => {
      globalRetries++;
      if (limited.size !== 1) throw new Error('Multiple visible retry buttons require a resource alert scope');
      await retry([...limited][0]);
    } };
    if (role === 'link') return { click: async () => {
      assert.ok(matches(`Entrar al aula ${roomName}`, options.name));
      assert.ok(matches(`Entrar al aula ${roomName} · Docente: Persona de prueba`, options.name));
      enteredRoom = roomName; currentUrl = `http://synthetic.test/mis-aulas?aula=${roomId}`;
      send(`/api/v1/classrooms/${roomId}`, 200, { name: roomName });
    } };
    return locator(role, [...limited], options);
  };
  page.goto = async url => {
    currentUrl = url;
    for (const [part, path] of Object.entries(paths)) send(path, limited.has(part) ? 429 : 200,
      limited.has(part) ? { error: { code: 'RATE_LIMITED' } } : {});
  };
  page.url = () => currentUrl;
  page.waitForResponse = predicate => new Promise((resolve, reject) => {
    let timer;
    const finish = (error, value) => {
      clearTimeout(timer); page.off('response', listener); pending.delete(cancel);
      if (error) reject(error); else resolve(value);
    };
    const listener = value => {
      try { if (predicate(value)) finish(null, value); } catch (error) { finish(error); }
    };
    const cancel = () => finish(new Error('Synthetic response expectation cancelled'));
    pending.add(cancel); page.on('response', listener);
    timer = setTimeout(() => { expiredWaiters++; finish(new Error('No new response was requested for this expectation')); }, 150);
  });
  return { page, paths, roomName, requests, retries, enteredRoom: () => enteredRoom,
    globalRetries: () => globalRetries, expiredWaiters: () => expiredWaiters,
    close() { for (const cancel of [...pending]) cancel(); },
    assertClean() {
      assert.equal(pending.size, 0, 'Consume every synthetic response expectation');
      for (const event of ['request', 'response', 'requestfailed']) assert.equal(page.listenerCount(event), 0, event);
    } };
}

for (const limitedParts of [['rooms', 'drafts', 'invitations'], ['drafts']]) {
  test(`collection admission retries only its ${limitedParts.length} failed resource alerts before entering the classroom`, async () => {
    const fixture = collectionRetryPage(limitedParts);
    try {
      await openClassroom(fixture.page, 'http://synthetic.test', fixture.roomName);
      assert.deepEqual([...fixture.retries].sort(), [...limitedParts].sort());
      assert.equal(fixture.globalRetries(), 0, 'Each retry must be scoped to the corresponding collection alert');
      assert.equal(fixture.enteredRoom(), fixture.roomName);
      assert.equal(fixture.expiredWaiters(), 0, 'Do not expect fresh responses for unaffected collections');
      for (const [part, path] of Object.entries(fixture.paths)) {
        assert.equal(fixture.requests.filter(value => new URL(value.url()).pathname === path).length,
          limitedParts.includes(part) ? 2 : 1, 'One retry per failed resource and no reload of unaffected resources');
      }
      assert.ok(fixture.requests.every(value => value.method() === 'GET'), 'Collection recovery must not mutate state');
    } finally { fixture.close(); fixture.assertClean(); }
  });
}
