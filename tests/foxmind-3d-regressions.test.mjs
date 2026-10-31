import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';

for (const presentation of ['home', 'classrooms']) test(`JD01 ${presentation}: account destinations retain exact routing`, async () => {
  const { ClassroomsApp } = loadTsModule('apps/classrooms-ui/Classrooms.tsx');
  const previous = globalThis.window, assigned = [], routed = [];
  globalThis.window = { location: { assign: href => assigned.push(href) } };
  const view = hookView(ClassroomsApp, { initialPresentation: presentation, displayName: 'Synthetic', accountRole: 'teacher',
    api: { call: async path => path === '' ? { teach: [], study: [] } : [] }, onNavigate: path => routed.push(path) });
  try {
    await view.flush();
    const navbar = descendants(view.tree, node => node.type?.name === 'AppNavbar')[0];
    assert.ok(navbar);
    for (const path of ['/profile', '/settings', '/profile']) navbar.props.onNavigate(path);
    assert.deepEqual(assigned, ['/profile', '/settings', '/profile'], 'profile, settings and avatar must reach their guarded pages');
    assert.deepEqual(routed, [], 'account routes must never become classroom presentation');
  } finally { view.close(); globalThis.window = previous; }
});

test('JD01 AppNavbar preserves modified native clicks and intercepts plain account activation exactly once', async () => {
  const { AppNavbar } = loadTsModule('apps/shared-ui/AppNavbar.tsx');
  const routed = [], view = hookView(AppNavbar, { logoHref: '/mis-aulas', displayName: 'Synthetic',
    links: [{ href: '/mis-aulas', label: 'Mis aulas' }], onNavigate: href => routed.push(href) });
  try {
    await view.flush();
    const account = descendants(view.tree, node => node.type?.name === 'ShellAccount')[0];
    assert.ok(account);
    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'button']) {
      let prevented = false;
      account.props.follow({ button: 0, [modifier]: modifier === 'button' ? 1 : true,
        preventDefault() { prevented = true; } }, '/settings');
      assert.equal(prevented, false); assert.deepEqual(routed, []);
    }
    let count = 0;
    account.props.follow({ button: 0, preventDefault() { count++; } }, '/settings');
    assert.equal(count, 1); assert.deepEqual(routed, ['/settings']);
  } finally { view.close(); }
});

test('JD02-JD05 PostgreSQL regressions use real persisted rows and rollback', { timeout: 120000 }, async t => {
  const api = await import('../apps/api/src/home/index.ts');
  await withAgendaDatabase(async ({ transaction }) => {
    const check = (name, operation) => t.test(name, () => transaction(async local => {
      const f = await homeFixture(local.query);
      const page = (module, now = f.now, timeZone = 'UTC', cursor = null) => api.createHomeUnitOfWork(local.database, async () => ['review', 'queries'].includes(module) ? f.teacherActor : f.actor).run({}, false, async unit => {
        unit.actor.now = now;
        await unit.read.participation();
        return unit.read.page(module, { module, timeZone, cursor });
      });
      await operation(f, page);
    }));
    await check('JD02 private NULL TP grade counts as needsReview; saved zero is complete; published excluded', async (f, page) => {
      const a = await f.activity('teach'), attempt = await f.attempt(a);
      const grade = await f.grade(a, attempt, { value: null });
      assert.equal((await f.query("SELECT count(*)::int n FROM attempts WHERE activity_id=$1 AND status='SUBMITTED'", a.id))[0].n, 1);
      const read = async () => { const result = await page('review'); assert.equal(result.status, 'ready'); return result; };
      assert.deepEqual((await read()).totals, { attempts: 1, needsReview: 1, readyToPublish: 0 });
      await f.query('UPDATE attempt_grades SET final_grade=0 WHERE id=$1', grade);
      assert.deepEqual((await read()).totals, { attempts: 1, needsReview: 0, readyToPublish: 1 });
      for (const type of ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION']) {
        await f.query('UPDATE activities SET type=$2::"ActivityType" WHERE id=$1', a.id, type);
        await f.query('UPDATE attempt_grades SET is_published=true,published_at=now() WHERE id=$1', grade);
        assert.deepEqual((await read()).totals, { attempts: 0, needsReview: 0, readyToPublish: 0 });
      }
    });
    const event = async (f, local, startAt, endAt) => {
      const id = randomUUID(), date = local.slice(0, 10), next = new Date(Date.parse(`${date}T00:00Z`) + 86400000).toISOString().slice(0, 10);
      await f.query(`INSERT INTO agenda_events(id,owner_id,title,description,category,schedule_kind,start_date,end_date_exclusive,
        start_local,end_local,time_zone,start_at,end_at,repeat_kind)
        VALUES($1,$2,'Evento de prueba','','CLASS','TIMED',$3,$4,$5,$6,'Pacific/Kiritimati',$7,$8,'NONE')`,
      id, f.actor, date, next, local, local.slice(0, 11) + `${String(Number(local.slice(11, 13)) + 1).padStart(2, '0')}:${local.slice(14, 16)}`, startAt, endAt);
      return id;
    };
    await check('JD03 private-event target date follows viewing timezone, not event local date', async (f, page) => {
      const id = await event(f, '2026-10-27T00:30', '2026-10-26T10:30:00Z', '2026-10-26T11:30:00Z');
      const result = await page('agenda', '2026-10-25T00:00:00.000Z', 'Etc/GMT+12');
      assert.equal(result.status, 'ready');
      const item = result.items.find(x => x.target.eventId === id); assert.ok(item);
      assert.equal(item.target.date, '2026-10-25'); assert.equal(item.date, '2026-10-25');
    });
    await check('JD04 candidate prefilter preserves an instant inside the ninety-day horizon across zones', async (f, page) => {
      const id = await event(f, '2026-04-01T03:00', '2026-03-31T13:00:00Z', '2026-03-31T14:00:00Z');
      const result = await page('agenda', '2026-01-01T00:00:00.000Z', 'Etc/GMT+12');
      assert.equal(result.status, 'ready');
      assert.ok(result.items.some(x => x.target.eventId === id), 'valid future instant must survive event-local candidate filtering');
    });
    await check('JD05 201 persisted candidate parents make only agenda unavailable, never silently expand all', async (f, page) => {
      for (let n = 0; n < 200; n++) await f.event();
      assert.equal((await page('agenda')).status, 'ready', 'The exact allowed boundary remains available');
      await f.event();
      assert.equal((await f.query('SELECT count(*)::int n FROM agenda_events WHERE owner_id=$1', f.actor))[0].n, 201);
      assert.deepEqual(await page('agenda'), { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true });
      for (const module of ['pending', 'review', 'feedback', 'queries', 'materials', 'classrooms'])
        assert.equal((await page(module)).status, 'ready', `${module} remains healthy after the bounded agenda error`);
    });
    await check('JD03 all-day dates float while weekly timed occurrences resolve original date before view-zone conversion', async (f, page) => {
      const floating = await f.event({ allDay: true });
      await f.query("UPDATE agenda_events SET start_date='2026-10-27',end_date_exclusive='2026-10-28' WHERE id=$1", floating);
      const weekly = await event(f, '2026-10-20T00:30', '2026-10-19T10:30:00Z', '2026-10-19T11:30:00Z');
      await f.query("UPDATE agenda_events SET repeat_kind='WEEKLY',repeat_until='2026-10-27' WHERE id=$1", weekly);
      const result = await page('agenda', '2026-10-25T00:00:00.000Z', 'Etc/GMT+12');
      assert.equal(result.status, 'ready');
      const allDay = result.items.find(x => x.target.eventId === floating), timed = result.items.find(x => x.target.eventId === weekly);
      assert.ok(allDay); assert.ok(timed);
      assert.equal(allDay.date, '2026-10-27'); assert.equal(allDay.target.date, '2026-10-27'); assert.equal(allDay.startAt, null);
      assert.equal(timed.startAt, '2026-10-26T10:30:00.000Z');
      assert.equal(timed.date, '2026-10-25'); assert.equal(timed.target.date, '2026-10-25');
    });
    await check('bounded academic pages keep all six cursor results and exclude equality at now and ninety days', async (f, page) => {
      const expected = [];
      for (let n = 1; n <= 6; n++) expected.push((await f.activity('study', { deadline: f.at(n) })).id);
      await f.activity('study', { deadline: f.now });
      await f.activity('study', { deadline: new Date(Date.parse(f.now) + 90 * 86400000).toISOString() });
      const first = await page('agenda'); assert.equal(first.status, 'ready'); assert.ok(first.nextCursor);
      const second = await page('agenda', f.now, 'UTC', first.nextCursor); assert.equal(second.status, 'ready');
      assert.deepEqual([...first.items, ...second.items].map(x => x.target.activityId), expected);
      assert.equal(second.nextCursor, null);
    });
  });
});
