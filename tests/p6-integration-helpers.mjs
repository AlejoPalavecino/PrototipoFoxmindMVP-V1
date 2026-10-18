import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { api, digest } from './p4-integration-helpers.mjs';

export async function planPdf(subject = 'P6 retained plan') {
  const pdf = await PDFDocument.create(); pdf.addPage(); pdf.setTitle(subject);
  pdf.setSubject(randomBytes(17000).toString('hex'));
  return Buffer.from(await pdf.save());
}

export async function upload(page, scope, bytes, purpose = 'plan', name = 'plan.pdf') {
  const started = await api(page, 'POST', '/files', { scope, purpose, name, bytes: bytes.length });
  assert.equal(started.status, 201);
  const sent = await api(page, 'PUT', `/files/${started.body.id}/content`, { base64: bytes.toString('base64') });
  assert.equal(sent.status, 200); assert.equal(sent.body.ready, true);
  return sent.body;
}

/** All classroom and actor creation happens through the real application interfaces. */
export async function classroom(page, student, name = 'P6 classroom') {
  const draft = await api(page, 'POST', '/classrooms/drafts', {});
  assert.equal(draft.status, 200);
  const bytes = await planPdf();
  const file = await upload(page, { kind: 'draft', id: draft.body.id }, bytes);
  const saved = await api(page, 'PATCH', `/classrooms/drafts/${draft.body.id}`, {
    revision: draft.body.revision,
    payload: { name, subject: 'Science', division: 'A', academicYear: 2026, timezone: 'UTC', coverKey: 'explore',
      planFileId: file.id, units: [{ name: 'First unit', topics: [{ name: 'First topic' }, { name: 'Second topic' }] }] },
  });
  assert.equal(saved.status, 200);
  const published = await api(page, 'POST', `/classrooms/drafts/${draft.body.id}/publish`, { revision: saved.body.revision });
  assert.equal(published.status, 200);
  if (student) {
    const preview = await api(student, 'POST', '/classrooms/codes/preview', { code: published.body.code });
    assert.equal(preview.status, 200);
    assert.equal((await api(student, 'POST', '/classrooms/codes/confirm', { confirmation: preview.body.confirmation })).status, 200);
  }
  return { id: published.body.id, fileId: file.id, bytes, code: published.body.code };
}

export async function openClassroom(page, origin, name = 'P6 classroom') {
  const evidence = [];
  const response = async result => {
    const path = new URL(result.url()).pathname;
    if (!['/api/v1/auth/session', '/api/v1/classrooms', '/api/v1/classrooms/drafts',
      '/api/v1/classrooms/invitations', '/api/v1/classrooms/notifications'].includes(path)) return;
    let code;
    if (!result.ok()) { try { const body = await result.json(); code = body.error?.code ?? body.code; } catch {} }
    evidence.push({ path, status: result.status(), code, retryAfter: result.headers()['retry-after'] });
  };
  const failed = request => evidence.push({ failedPath: new URL(request.url()).pathname, error: request.failure()?.errorText });
  page.on('response', response); page.on('requestfailed', failed);
  try {
    const paths = ['/api/v1/classrooms', '/api/v1/classrooms/drafts', '/api/v1/classrooms/invitations'];
    const homeResponses = () => Promise.all(paths.map(path => page.waitForResponse(value => new URL(value.url()).pathname === path)));
    const initial = homeResponses();
    await page.goto(`${origin}/mis-aulas`);
    const results = await initial;
    const limited = results.filter(result => result.status() === 429);
    if (limited.length) {
      const seconds = Math.max(...limited.map(result => Number(result.headers()['retry-after'])));
      assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'Actual bounded Retry-After required');
      console.log(`P6 fixture respects actual admission Retry-After=${seconds}s; one visible retry`);
      await delay(seconds * 1000);
      const resumed = homeResponses();
      await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
      for (const result of await resumed) assert.equal(result.status(), 200, 'Single admission recovery must succeed');
    }
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
      .getByRole('button', { name: 'Entrar al aula', exact: true }).click();
    await page.getByRole('heading', { name, exact: true }).waitFor();
  } catch (error) {
    console.error('P6 classroom navigation evidence', JSON.stringify({ path: new URL(page.url()).pathname,
      evidence, articleCount: await page.getByRole('article').count() }));
    throw error;
  } finally { page.off('response', response); page.off('requestfailed', failed); }
}

export async function domainSnapshot(db) {
  const data = [];
  for (const table of ['classrooms', 'units', 'topics', 'study_plan_versions', 'materials', 'enrollments',
    'membership_periods', 'wall_posts', 'wall_replies', 'notifications', 'activities', 'attempts', 'files', 'uploads']) {
    data.push((await db.query(`SELECT row_to_json(t)::text AS value FROM ${table} t ORDER BY id`)).rows);
  }
  data.push((await db.query('SELECT row_to_json(t)::text AS value FROM file_custodies t ORDER BY file_id')).rows);
  return digest(JSON.stringify(data));
}

export async function rejectSame(db, operation, status) {
  const before = await domainSnapshot(db), result = await operation();
  assert.equal(result.status, status);
  assert.equal(await domainSnapshot(db), before, 'Rejected operation must preserve domain records/files');
  return result;
}
