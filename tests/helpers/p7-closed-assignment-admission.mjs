import assert from 'node:assert/strict';
import { watchActionResponse, rateLimitSeconds } from '../p8-current-ui-helpers.mjs';

// Local proposal for P7's closed ASSIGNMENT consultation only; no shared helper delta.
export async function openClosedAssignment(page, classroomId, activityId, timeoutMs = 30000) {
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 30000);
  const origin = new URL(page.url()).origin;
  const sessionPath = `/api/v1/classrooms/${classroomId}/activities/${activityId}/session`;
  const startPath = `/api/v1/classrooms/${classroomId}/activities/${activityId}/start`;
  const button = page.getByRole('button', { name: 'Ver consigna', exact: true });
  const starts = [], unexpectedMutations = [];
  let phaseActive = false, phaseReads = 0;
  const capture = request => {
    const target = new URL(request.url()), method = request.method();
    if (phaseActive && target.pathname === sessionPath && method === 'GET') phaseReads++;
    if (method === 'POST' && target.pathname === startPath) starts.push(request);
    else if (target.origin === origin && target.pathname.startsWith('/api/v1/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) unexpectedMutations.push(request);
  };
  const exact = (response, path, method) => {
    const url = new URL(response.url());
    assert.equal(url.origin, origin); assert.equal(url.pathname, path); assert.equal(url.search, ''); assert.equal(url.hash, '');
    assert.equal(response.request().method(), method);
  };
  page.on('request', capture);
  try {
    for (let gesture = 0; gesture < 2; gesture++) {
      await button.waitFor({ timeout: timeoutMs }); assert.equal(await button.isEnabled(), true);
      phaseReads = 0; phaseActive = true;
      const read = watchActionResponse(page, response => {
        const url = new URL(response.url());
        return url.pathname === sessionPath
          || url.pathname === '/api/v1/auth/csrf' && response.status() !== 200;
      }, timeoutMs);
      const start = watchActionResponse(page, response => new URL(response.url()).pathname === startPath, timeoutMs);
      const readResult = read.value().then(response => ({ phase: 'read', response }), error => ({ error }));
      const startResult = start.value().then(response => ({ phase: 'start', response }), error => ({ error }));
      let observed;
      try {
        await button.click(); observed = await Promise.race([readResult, startResult]);
        // A request already initiated by this gesture owns its response even when start200 wins the race.
        if (phaseReads > 0 || observed.phase === 'read') {
          const readObserved = await readResult;
          if (readObserved.error) throw readObserved.error;
          exact(readObserved.response, sessionPath, 'GET');
          assert.equal(phaseReads, 1, 'The explicit consultation has one causal session prerequisite');
          observed = readObserved.response.status() === 200 ? await startResult : readObserved;
        }
      } finally { phaseActive = false; read.dispose(); start.dispose(); await Promise.all([readResult, startResult]); }
      if (observed.error) throw observed.error;
      assert.equal(unexpectedMutations.length, 0, 'Consultation admission never mutates another endpoint');
      if (observed.phase === 'start') {
        exact(observed.response, startPath, 'POST'); assert.equal(observed.response.status(), 200);
        assert.equal(starts.length, 1, 'Exactly one explicit start must reach the server');
        return observed.response;
      }
      exact(observed.response, sessionPath, 'GET');
      assert.equal(gesture, 0, 'Only one session admission retry is allowed');
      assert.equal(starts.length, 0, 'Session admission recovery must precede every POST start');
      const seconds = await rateLimitSeconds(observed.response);
      await page.getByRole('alert').filter({ hasText: /límite de intentos/i }).waitFor({ timeout: timeoutMs });
      console.log(`P7 closed assignment GET session RATE_LIMITED honors Retry-After=${seconds}s once`);
      await page.waitForTimeout(seconds * 1000);
      assert.equal(starts.length, 0); assert.equal(unexpectedMutations.length, 0);
    }
    assert.fail('Expected one successful explicit start');
  } finally { page.off('request', capture); }
}
