import assert from 'node:assert/strict';
import { watchResponse } from './browser-action-observer.mjs';

function phaseFor(response, mutationPath) {
  let path;
  try { path = new URL(response.url()).pathname; } catch { throw new Error('Unexpected admission response'); }
  const method = response.request().method();
  if (method === 'GET' && path === '/api/v1/auth/csrf') return 'csrf';
  if (method === 'POST' && path === mutationPath) return 'mutation';
  throw new Error('Unexpected admission response');
}

async function limitedSeconds(response) {
  const header = response.headers()['retry-after'];
  if (typeof header !== 'string' || !/^\d+$/.test(header)) throw new Error('Invalid admission limit');
  const seconds = Number(header);
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 60) throw new Error('Invalid admission limit');
  let body;
  try { body = await response.json(); } catch { throw new Error('Invalid admission limit'); }
  if (body?.error?.code !== 'RATE_LIMITED') throw new Error('Invalid admission limit');
  return seconds;
}

async function observeAction(action, observe) {
  const watcher = observe();
  try {
    const result = Promise.resolve().then(() => watcher.value()).then(
      response => ({ response }), error => ({ error }),
    );
    await action();
    const observed = await result;
    if ('error' in observed) throw observed.error;
    return observed.response;
  } finally {
    watcher.dispose();
  }
}

export async function runAdmittedAction({ action, observe, wait, onLimited, mutationPath }) {
  const limited = new Set();
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await observeAction(action, observe);
    const phase = phaseFor(response, mutationPath);
    if (phase === 'mutation' && response.status() === 200) return response;
    if (response.status() !== 429 || limited.has(phase)) throw new Error('Admission rejected');
    const seconds = await limitedSeconds(response);
    limited.add(phase);
    await onLimited(response, phase);
    await wait(seconds * 1000);
  }
  throw new Error('Admission rejected');
}
export async function startBrowserAttempt(page, classroomId, activityId, timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Admission timeout required');
  const mutationPath = `/api/v1/classrooms/${classroomId}/activities/${activityId}/start`;
  const button = page.getByRole('button', { name: 'Comenzar', exact: true });
  let requests = 0, beforeGesture = 0;
  const capture = request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === mutationPath) requests++;
  };
  page.on('request', capture);
  try {
    return await runAdmittedAction({
      mutationPath,
      observe: () => watchResponse(page, response => {
        const path = new URL(response.url()).pathname, method = response.request().method();
        return (method === 'GET' && path === '/api/v1/auth/csrf' && response.status() !== 200)
          || (method === 'POST' && path === mutationPath);
      }, timeoutMs),
      action: async () => { beforeGesture = requests; await button.click(); },
      wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
      onLimited: async (_response, phase) => {
        await page.getByRole('alert').filter({ hasText: /límite de intentos/i }).waitFor({ timeout: timeoutMs });
        await button.waitFor({ timeout: timeoutMs });
        assert.equal(await button.isEnabled(), true);
        if (phase === 'csrf') assert.equal(requests, beforeGesture);
      },
    });
  } finally { page.off('request', capture); }
}
