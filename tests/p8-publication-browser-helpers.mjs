import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

/** Observe real start and refresh responses; recover admission once through existing visible controls. */
export async function openPublicationPractical(page, roomId, activityId, open) {
  const responses = [], root = `/api/v1/classrooms/${roomId}`;
  const capture = response => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith(root)) responses.push({ response, path, method: response.request().method() });
  };
  page.on('response', capture);
  const observed = async (path, method, after = 0) => {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const index = responses.findIndex((row, index) => index >= after && row.path === path && row.method === method);
      if (index !== -1) return { ...responses[index], index };
      await delay(25);
    }
    assert.fail(`Missing actual ${method} ${path}`);
  };
  const limited = [];
  async function admitted(row, recover) {
    const status = row.response.status();
    if (status === 429 && recover) { limited.push(row.response); return false; }
    assert.equal(status, 200, `Actual ${row.method} ${row.path}`); return true;
  }
  async function opening(after, recover) {
    await open();
    const session = await observed(`${root}/activities/${activityId}/session`, 'GET', after);
    if (!await admitted(session, recover)) return;
    const current = await session.response.json();
    assert.equal(current.activity.type, 'ASSIGNMENT'); assert.equal(current.archived, false); assert.equal(current.expected, true);
    if (current.canStart) {
      const start = await observed(`${root}/activities/${activityId}/start`, 'POST', session.index + 1);
      if (!await admitted(start, recover)) return;
      const started = await start.response.json();
      assert.equal(started.attempt.status, 'DRAFT'); assert.equal(started.canTransfer, true);
      assert.ok(started.editor); assert.equal(started.editor.epoch, started.attempt.epoch);
      for (const path of [`${root}/activities`, `${root}/members`]) await admitted(await observed(path, 'GET', start.index + 1), recover);
    } else assert.equal(current.attempt?.status, 'DRAFT');
  }
  try {
    await opening(0, true);
    if (limited.length) {
      const seconds = Math.max(...limited.map(response => Number(response.headers()['retry-after'])));
      assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
      console.log(`P8 practical readiness honors observed Retry-After=${seconds}s once before one visible reopen`);
      await delay(seconds * 1000);
      await opening(responses.length, false);
    }
    await page.getByRole('region', { name: 'Sesión de actividad', exact: true }).waitFor();
    const transfer = page.getByRole('button', { name: 'Transferir edición a esta pestaña', exact: true });
    if (await transfer.isVisible()) {
      await transfer.click();
      const result = page.waitForResponse(response => new URL(response.url()).pathname.startsWith(`${root}/attempts/`)
        && response.url().endsWith('/transfer') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
      assert.equal((await result).status(), 200);
    }
    await page.getByLabel('Seleccionar archivo del trabajo', { exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Sesión de actividad', exact: true }).getByRole('alert').count(), 0);
  } finally { page.off('response', capture); }
}
