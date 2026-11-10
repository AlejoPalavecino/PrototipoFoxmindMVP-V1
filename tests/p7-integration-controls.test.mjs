import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

for (const args of [['--help'], ['--invalid'], ['--help', '--invalid']]) {
  test(`P7 integration CLI ${args.join(' ')} does not start builds or fixtures`, () => {
    const result = spawnSync(process.execPath, ['scripts/test-p7-integration.mjs', ...args], {
      encoding: 'utf8', timeout: 5000, windowsHide: true,
    });
    assert.equal(result.status, args.length === 1 && args[0] === '--help' ? 0 : 2);
    assert.match(result.stdout + result.stderr, /Usage: node scripts\/test-p7-integration\.mjs/);
    assert.doesNotMatch(result.stdout + result.stderr, /Prisma|isolated database|migrate: exit/);
  });
}

test('P7 default plan names all implemented actual journeys, including targeted preservation probes', () => {
  const source = readFileSync('scripts/test-p7-integration.mjs', 'utf8');
  for (const unit of ['authoring', 'participation', 'practical', 'practical-timing', 'questionnaire',
    'questionnaire-overview', 'questionnaire-recovery', 'history', 'notifications']) {
    assert.ok(source.includes(`'${unit}'`), `Missing ${unit} journey`);
    assert.ok(existsSync(`tests/p7-${unit}-integration.test.mjs`));
  }
  assert.doesNotMatch(source, /'taking'|'reopening'/);
});

import { EventEmitter } from 'node:events';
import { openClosedAssignment } from './helpers/p7-closed-assignment-admission.mjs';
const session = '/api/v1/classrooms/room/activities/activity/session', start = '/api/v1/classrooms/room/activities/activity/start';

function fixture(kind) {
  const page = new EventEmitter(), waits = [], events = [];
  let calls = 0, releaseLate;
  const late = new Promise(resolve => {
    releaseLate = resolve;
  });
  page.url = () => 'http://synthetic.test/mis-aulas';
  const request = (path, method) => {
    const value = { url: () => `http://synthetic.test${path}`, method: () => method };
    events.push('request ' + method + ' ' + path);
    page.emit('request', value);
    return value;
  };
  const response = (req, status) => {
    events.push('response ' + status + ' ' + new URL(req.url()).pathname);
    page.emit('response', { url: req.url, request: () => req, status: () => status, json: async () => ({ error: { code: 'RATE_LIMITED' } }), headers: () => ({ 'retry-after': '47' }) });
  };
  const button = {
    waitFor: async () => { },
    isEnabled: async () => true,
    click: async () => {
      calls++;
      const read = request(session, 'GET');
      if (kind === 'retry' && calls === 1) {
        response(read, 429);
        return;
      }
      if (kind === 'late-read-failure') {
        response(request(start, 'POST'), 200);
        setImmediate(() => {
          response(read, 429);
          releaseLate();
        });
        return;
      }
      response(read, 200);
      response(request(start, 'POST'), 200);
    }
  };
  page.getByRole = role => role === 'alert' ? { filter: () => ({ waitFor: async () => { } }) } : button;
  page.waitForTimeout = async (ms) => {
    waits.push(ms);
  };
  return {
    page,
    waits,
    events,
    calls: () => calls,
    late,
    clean() {
      assert.equal(page.listenerCount('request'), 0);
      assert.equal(page.listenerCount('response'), 0);
    }
  };
}

for (const kind of ['normal', 'retry'])
  test('control ' + kind, async () => {
    const f = fixture(kind);
    try {
      const result = await openClosedAssignment(f.page, 'room', 'activity');
      assert.equal(result.status(), 200);
      assert.equal(f.calls(), kind === 'retry' ? 2 : 1);
      assert.deepEqual(f.waits, kind === 'retry' ? [47000] : []);
      assert.equal(f.events.filter(x => x === 'request POST ' + start).length, 1);
    }
    finally {
      f.clean();
    }
  });

test('a same-gesture GET session 429 arriving after start200 must not be reported as admitted success', async () => {
  const f = fixture('late-read-failure');
  try {
    let returned;
    const work = openClosedAssignment(f.page, 'room', 'activity').then(value => {
      returned = value.status();
      return value;
    });
    try {
      await assert.rejects(work);
    }
    finally {
      await f.late;
      console.log('CAUSAL_TRACE ' + JSON.stringify({ returnedStatus: returned, calls: f.calls(), waits: f.waits, events: f.events }));
    }
  }
  finally {
    f.clean();
  }
});

function setup(scenario) {
  const page = new EventEmitter(), waits = [];
  let calls = 0;
  page.url = () => 'http://synthetic.test/mis-aulas';
  function req(path, method = 'GET', origin = 'http://synthetic.test') {
    const value = { url: () => origin + path, method: () => method };
    page.emit('request', value);
    return value;
  }
  function res(request, status, code = 'RATE_LIMITED', header = '47') {
    page.emit('response', { url: request.url, request: () => request, status: () => status, json: async () => ({ error: { code } }), headers: () => header === undefined ? {} : { 'retry-after': header } });
  }
  function emit(path, status, method = 'GET', code = 'RATE_LIMITED', header = '47', origin) {
    const request = req(path, method, origin);
    res(request, status, code, header);
    return request;
  }
  const old = req(session); // Deliberately predates the candidate's action observers.
  const button = {
    waitFor: async () => { },
    isEnabled: async () => true,
    click: async () => {
      calls++;
      scenario({ page, call: calls, old, req, res, emit });
    }
  };
  page.getByRole = role => role === 'alert' ? { filter: () => ({ waitFor: async () => { } }) } : button;
  page.waitForTimeout = async (ms) => {
    waits.push(ms);
  };
  return {
    page,
    waits,
    calls: () => calls,
    clean() {
      for (const event of ['request', 'response'])
        assert.equal(page.listenerCount(event), 0, event);
    }
  };
}

const negatives = [
  ['old request response cannot admit retry', ({ old, res, emit }) => {
      res(old, 429);
      emit(session, 500);
    }],
  ['wrong session method', ({ emit }) => emit(session, 429, 'POST')],
  ['wrong session path', ({ emit }) => {
      emit(session + '-extra', 429);
      emit(session, 500);
    }],
  ['wrong session origin', ({ emit }) => emit(session, 429, 'GET', 'RATE_LIMITED', '47', 'http://other.test')],
  ['wrong session query', ({ emit }) => emit(session + '?other=1', 429)],
  ['wrong session fragment', ({ emit }) => emit(session + '#other', 429)],
  ['start already initiated before admission', ({ req, emit }) => {
      req(start, 'POST');
      emit(session, 429);
    }],
  ['another mutation before admission', ({ req, emit }) => {
      req('/api/v1/files', 'POST');
      emit(session, 429);
    }],
  ['start429 never retries mutation', ({ emit }) => {
      emit(session, 200);
      emit(start, 429, 'POST');
    }],
  ['start500 never succeeds', ({ emit }) => {
      emit(session, 200);
      emit(start, 500, 'POST');
    }],
  ['session500 never retries', ({ emit }) => emit(session, 500)],
  ['wrong admission code', ({ emit }) => emit(session, 429, 'GET', 'SERVICE_UNAVAILABLE')],
  ['zero RetryAfter', ({ emit }) => emit(session, 429, 'GET', 'RATE_LIMITED', '0')],
  ['large RetryAfter', ({ emit }) => emit(session, 429, 'GET', 'RATE_LIMITED', '61')],
  ['fractional RetryAfter', ({ emit }) => emit(session, 429, 'GET', 'RATE_LIMITED', '1.5')],
  ['nonnumeric RetryAfter', ({ emit }) => emit(session, 429, 'GET', 'RATE_LIMITED', 'later')],
  ['second session429', ({ emit }) => emit(session, 429)],
  ['duplicate starts', ({ req, res, emit }) => {
      emit(session, 200);
      const a = req(start, 'POST'), b = req(start, 'POST');
      res(a, 200);
      res(b, 200);
    }],
  ['GET200 without POST is never a start', ({ emit }) => emit(session, 200)],
];
for (const [name, scenario] of negatives)
  test(name, async () => {
    const f = setup(scenario);
    try {
      await assert.rejects(openClosedAssignment(f.page, 'room', 'activity', 50));
      assert.equal(f.calls(), name === 'second session429' ? 2 : 1);
      assert.deepEqual(f.waits, name === 'second session429' ? [47000] : []);
    }
    finally {
      f.clean();
    }
  });

test('start-only actual POST200 remains supported', async () => {
  const f = setup(({ emit }) => emit(start, 200, 'POST'));
  try {
    const result = await openClosedAssignment(f.page, 'room', 'activity', 50);
    assert.equal(result.status(), 200);
    assert.equal(f.calls(), 1);
    assert.deepEqual(f.waits, []);
  }
  finally {
    f.clean();
  }
});
