// Own disposable services only. No retained configuration or development data.
import { withP4IntegrationRuntime } from './p4-integration-runtime.mjs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes, webcrypto } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { classroom } from '../tests/p6-integration-helpers.mjs';

await withP4IntegrationRuntime(async runtime => {
  const password = `Folder fixture ${randomBytes(12).toString('hex')}`;
  function actor() {
    const cookies = new Map();
    const request = async (url, options = {}) => {
      const headers = new Headers(options.headers);
      headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
      headers.set('origin', runtime.origin);
      const result = await fetch(new URL(url, runtime.origin), { ...options, headers });
      for (const cookie of result.headers.getSetCookie()) {
        const pair = cookie.split(';')[0], split = pair.indexOf('=');
        cookies.set(pair.slice(0, split), pair.slice(split + 1));
      }
      return result;
    };
    const evaluate = (fn, argument) => new Function('fetch', 'crypto', 'argument', `return (${fn.toString()})(argument)`)(request, webcrypto, argument);
    return { evaluate, request };
  }
  async function call(person, method, path, body, retried = false) {
    const headers = { 'content-type': 'application/json' };
    if (method !== 'GET') {
      const csrf = await (await person.request('/api/v1/auth/csrf')).json();
      headers['x-csrf-token'] = csrf.csrfToken;
    }
    const response = await person.request(`/api/v1${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.status === 429 && !retried) {
      const seconds = Number(response.headers.get('retry-after'));
      if (!(seconds > 0 && seconds <= 60)) throw new Error('Unexpected retry deadline');
      await pause(seconds * 1000);
      return call(person, method, path, body, true);
    }
    if (!response.ok) throw new Error(`Fixture ${method} ${path}: ${response.status}`);
    return response.status === 204 ? undefined : response.json();
  }
  async function register(firstName, email) {
    const person = actor();
    await call(person, 'POST', '/auth/register', { firstName, lastName: 'Demo', email, password });
    await call(person, 'POST', '/auth/login', { email, password });
    let token;
    for (let attempt = 0; attempt < 60 && !token; attempt++) {
      const messages = await (await fetch(`${runtime.inbox}/api/v1/messages`)).json();
      for (const item of messages.messages.filter(item => item.To.some(to => to.Address === email))) {
        const detail = await (await fetch(`${runtime.inbox}/api/v1/message/${item.ID}`)).json();
        token = /verify-email#token=([A-Za-z0-9_-]{43})/.exec(detail.Text)?.[1];
        if (token) break;
      }
      if (!token) await pause(100);
    }
    if (!token) throw new Error('Fixture verification capture unavailable');
    await call(person, 'POST', '/auth/email-verification/confirm', { token });
    return person;
  }
  const teacherEmail = 'docente-carpetas@example.test', studentEmail = 'estudiante-carpetas@example.test';
  const teacher = await register('Lucía', teacherEmail);
  const student = await register('Marina', studentEmail);
  const room = await classroom(teacher, student, 'Introducción a la fotografía');
  const otherRoom = await classroom(student, teacher, 'Taller de dibujo');
  const detail = await call(teacher, 'GET', `/classrooms/${room.id}`);
  const change = async operation => call(teacher, 'POST', `/classrooms/${room.id}/activities`, {
    revision: (await call(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation,
  });
  for (const [type, title] of [['ASSIGNMENT', 'Luz natural y encuadre'], ['QUESTIONNAIRE', 'Conceptos de exposición'], ['EVALUATION', 'Composición visual']]) {
    const { id } = await change({ action: 'create', type });
    await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
      instructions: 'Explorá los conceptos del tema y compartí tu trabajo.', attachmentRequired: false, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
      questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: '¿Qué aporta la luz natural a una fotografía?', points: '10', scoringRule: null, options: [] }] } });
    if (type !== 'EVALUATION') await change({ action: 'publish', id });
  }
  await mkdir('.test-artifacts/folders', { recursive: true });
  // Synthetic fixture login only; ignored artifact, never commit or print credentials.
  const stopFile = `.test-artifacts/folders/stop-${process.pid}`;
  await writeFile('.test-artifacts/folders/browser-fixture.json', JSON.stringify({ origin: runtime.origin, teacherEmail, studentEmail, password, roomId: room.id, otherRoomId: otherRoom.id, stopFile }));
  console.log(`Folder preview ready: ${runtime.origin}; synthetic actors ready. Create ${stopFile} to clean owned services.`);
  await new Promise(resolve => {
    const timer = setInterval(() => { void access(stopFile).then(() => { clearInterval(timer); resolve(); }, () => {}); }, 1000);
    const stop = () => { clearInterval(timer); resolve(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    process.stdin.resume(); process.stdin.once('data', stop);
  });
  process.stdin.pause();
}, { classrooms: true });
