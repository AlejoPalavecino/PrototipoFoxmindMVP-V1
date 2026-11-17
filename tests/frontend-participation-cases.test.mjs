import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { createClassroomClient } from '../apps/web/src/application/transport/classroom-client.ts';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { useState } from 'react';

const path = 'apps/web/src/features/participation/api.ts';
const room = 'room', attempt = 'attempt', editor = { token: 'a'.repeat(43), epoch: '3' };
const answer = { revision: '2', questionId: 'question', text: '  Texto\n😀  ', optionIds: [] };

test('questionnaire and practical bind editor authority while keeping save separate from submit and abort', async () => {
  const api = loadTsModule(path), calls = [], result = { revision: '3' }, signal = new AbortController().signal;
  const transport = { attempt: async (...args) => { calls.push(args); return result; } };
  const questionnaire = api.createQuestionnaireAttemptApi(transport, room, attempt, editor);
  const practical = api.createPracticalAttemptApi(transport, room, attempt, editor);
  assert.equal(await questionnaire.saveAnswer(answer, signal), result);
  await questionnaire.submitAnswers('3', true, signal);
  await practical.saveResponse('4', 'Respuesta escrita', signal);
  await practical.submitPractical('5', signal);
  assert.deepEqual(calls, [
    ['/room/attempts/attempt/answer', answer, editor, signal],
    ['/room/attempts/attempt/submit-answers', { revision: '3', confirm: true, confirmIncomplete: true }, editor, signal],
    ['/room/attempts/attempt/practical-response', { revision: '4', text: 'Respuesta escrita' }, editor, signal],
    ['/room/attempts/attempt/submit-practical', { revision: '5', confirm: true }, editor, signal],
  ]);
});

test('attachment capability delegates binary upload and removal without treating them as submission', async () => {
  const api = loadTsModule(path), calls = [], signal = new AbortController().signal, file = new File(['data'], 'work.pdf');
  const transport = { attempt: async (...args) => calls.push(['attempt', ...args]),
    uploadAttachment: async (...args) => { calls.push(['upload', ...args]); return { id: 'file', ready: true }; },
    fileUrl: (id, preview) => `${id}/${preview ? 'preview' : 'download'}` };
  const attachments = api.createAttemptAttachmentsApi(transport, room, attempt, editor);
  assert.deepEqual(await attachments.upload(file), { id: 'file', ready: true });
  await attachments.remove('6', 'file', signal);
  assert.equal(attachments.fileUrl('file'), 'file/download');
  assert.equal(attachments.fileUrl('file', true), 'file/preview');
  assert.deepEqual(calls, [ ['upload', room, attempt, file, editor],
    ['attempt', '/room/attempts/attempt/attachments-remove', { revision: '6', fileId: 'file' }, editor, signal] ]);
  assert.deepEqual(Object.keys(api.createAttemptReadingApi(transport)), ['fileUrl']);
});

test('missing editor or optional transport capabilities rejects before a request', async () => {
  const api = loadTsModule(path);
  let writes = 0;
  const transport = { attempt: async () => { writes++; }, uploadAttachment: async () => { writes++; }, fileUrl: () => '' };
  for (const [candidate, authority] of [[{}, editor], [transport, null]]) {
    const questionnaire = api.createQuestionnaireAttemptApi(candidate, room, attempt, authority);
    const practical = api.createPracticalAttemptApi(candidate, room, attempt, authority);
    const attachments = api.createAttemptAttachmentsApi({ fileUrl: () => '', ...candidate }, room, attempt, authority);
    await assert.rejects(() => questionnaire.saveAnswer(answer), /guardado no está disponible en esta pestaña/);
    await assert.rejects(() => questionnaire.submitAnswers('1', false), /envío no está disponible/);
    await assert.rejects(() => practical.saveResponse('1', 'local'), /guardado no está disponible/);
    await assert.rejects(() => practical.submitPractical('1'), /envío no está disponible/);
    await assert.rejects(() => attachments.upload(new File(['x'], 'work.pdf')), /carga no está disponible/);
    await assert.rejects(() => attachments.remove('1', 'file'), /flujo de archivos no está disponible/);
  }
  assert.equal(writes, 0);
});

test('production transport preserves fresh CSRF, editor token/epoch and upload reservation/content protocol', async () => {
  const api = loadTsModule(path), calls = []; let csrf = 0;
  const transport = createClassroomClient({ csrfToken: async () => String(++csrf), fetch: async (url, options) => {
    calls.push({ url, ...options }); return Response.json({ id: 'file', revision: '3', ready: true });
  } });
  const questionnaire = api.createQuestionnaireAttemptApi(transport, room, attempt, editor);
  await questionnaire.saveAnswer(answer); await questionnaire.submitAnswers('3', false);
  const file = new File(['content'], 'work.pdf');
  await api.createAttemptAttachmentsApi(transport, room, attempt, editor).upload(file);
  assert.deepEqual(calls.map(call => call.url), [
    '/classrooms/room/attempts/attempt/answer', '/classrooms/room/attempts/attempt/submit-answers', '/files', '/files/file/content',
  ]);
  assert.equal(new Set(calls.map(call => call.headers['X-CSRF-Token'])).size, 4);
  for (const call of calls) {
    assert.equal(call.headers['X-Attempt-Editor'], editor.token); assert.equal(call.headers['X-Attempt-Epoch'], editor.epoch);
    assert.equal(call.credentials, 'same-origin');
  }
  assert.equal(calls[3].method, 'PUT'); assert.equal(calls[3].body, file);
  assert.deepEqual(JSON.parse(calls[2].body), { scope: { kind: 'classroom', id: room }, purpose: 'attachment', targetId: attempt, name: file.name, bytes: file.size });
});

test('participation API entry does not load React, CSS, Node or runtime use cases', () => {
  for (const file of [path, 'apps/web/src/features/participation/model/participation-operations.ts']) {
    const runtime = readFileSync(file, 'utf8').split('\n').filter(line => !line.startsWith('import type ')).join('\n');
    assert.doesNotMatch(runtime, /from\s+['"](?:react|node:)|\.css['"]|from\s+['"][^'"]*(?:questionnaire|practical|review|domain)[^'"]*['"]/);
  }
});

test('typed questionnaire saves the draft before review and submits only on explicit confirmation', async t => {
  const api = loadTsModule(path), calls = [];
  const { QuestionnaireAttempt } = loadTsModule('apps/web/src/features/participation/questionnaire/QuestionnaireAttempt.tsx');
  const transport = { fileUrl: () => '', attempt: async (route, input, authority) => {
    calls.push({ route, input, authority });
    return route.endsWith('/answer') ? { revision: '1', answer: { ...input, savedAt: '2026-11-16T00:00:00Z' } }
      : { submittedAt: '2026-11-16T00:00:00Z', submittedLate: false, appliedDeadlineAt: null };
  } };
  const data = { canTransfer: true, activity: { type: 'QUESTIONNAIRE', title: 'Preguntas', zone: 'UTC',
    questions: [{ id: 'question', type: 'DEVELOPMENT', prompt: 'Explicá', options: [] }] },
    attempt: { id: attempt, number: 1, status: 'DRAFT', epoch: editor.epoch, revision: '0', answers: [], attachments: [] } };
  const view = hookView(QuestionnaireAttempt, { operations: api.createQuestionnaireAttemptApi(transport, room, attempt, editor),
    reading: api.createAttemptReadingApi(transport), data, editor, refresh: async () => {} });
  t.after(() => view.close()); await view.flush();
  const button = text => descendants(view.tree, node => node.type === 'button' && node.props.children === text)[0];
  const textarea = () => descendants(view.tree, node => node.type === 'textarea')[0];
  textarea().props.onChange({ target: { value: 'Borrador local' } }); await view.flush();
  button('Guardar borrador').props.onClick(); await view.flush();
  assert.deepEqual(calls.map(call => call.route), ['/room/attempts/attempt/answer']);
  assert.equal(calls[0].input.revision, '0'); assert.equal(calls[0].input.text, 'Borrador local');
  button('Revisar entrega').props.onClick(); await view.flush(); assert.equal(calls.length, 1);
  assert.ok(descendants(view.tree, node => node.type?.name === 'Dialog').length);
  button('Confirmar entrega').props.onClick(); await view.flush();
  assert.equal(calls[1].route, '/room/attempts/attempt/submit-answers');
  assert.deepEqual(calls[1].input, { revision: '1', confirm: true, confirmIncomplete: false });
  assert.ok(calls.every(call => call.authority === editor));
});

test('typed practical retains text after lost acknowledgement and recovers CAS before review', async t => {
  const api = loadTsModule(path), { PracticalAttempt } = loadTsModule('apps/web/src/features/participation/practical/PracticalAttempt.tsx');
  let tick, serverRevision = 0, serverText = '', refreshes = 0, mutations = 0;
  let data = { activity: { id: 'activity', title: 'Trabajo', attachmentRequired: false, zone: 'UTC' },
    attempt: { id: attempt, status: 'DRAFT', epoch: editor.epoch, revision: '0', attachments: [], practicalResponse: '' }, canTransfer: true };
  const transport = { fileUrl: () => '', attempt: async (route, body, authority) => {
    assert.ok(route.endsWith('/practical-response')); assert.equal(authority, editor);
    if (body.revision !== String(serverRevision)) throw Error('CONFLICT');
    serverRevision++; serverText = body.text; mutations++;
    if (mutations === 1) throw Error('ACK lost');
    return { revision: String(serverRevision), text: serverText };
  } };
  const refresh = async () => {
    if (++refreshes === 1) throw Error('refresh failed');
    data = { ...data, attempt: { ...data.attempt, revision: String(serverRevision), practicalResponse: serverText } }; tick(value => value + 1);
  };
  const operations = api.createPracticalAttemptApi(transport, room, attempt, editor);
  const attachments = api.createAttemptAttachmentsApi(transport, room, attempt, editor);
  const view = hookView(() => { const [, setTick] = useState(0); tick = setTick;
    return PracticalAttempt({ operations, attachments, data, editor, refresh }); }, {});
  t.after(() => view.close()); await view.flush();
  const button = label => descendants(view.tree, node => node.type === 'button' && node.props.children === label)[0];
  const textarea = () => descendants(view.tree, node => node.type === 'textarea')[0];
  textarea().props.onChange({ target: { value: 'Texto local\n😀' } }); await view.flush();
  button('Guardar borrador').props.onClick(); await view.flush();
  assert.equal(textarea().props.value, 'Texto local\n😀'); assert.equal(mutations, 1);
  button('Guardar borrador').props.onClick(); await view.flush();
  assert.equal(mutations, 1); assert.equal(data.attempt.revision, '1');
  button('Guardar borrador').props.onClick(); await view.flush();
  assert.equal(mutations, 2); assert.equal(data.attempt.revision, '2');
  button('Revisar entrega').props.onClick(); await view.flush();
  assert.equal(mutations, 2); assert.ok(descendants(view.tree, node => node.type?.name === 'Dialog').length);
});

test('missing or stale editor keeps both attempt interfaces read-only without requests', async t => {
  const api = loadTsModule(path);
  const { QuestionnaireAttempt } = loadTsModule('apps/web/src/features/participation/questionnaire/QuestionnaireAttempt.tsx');
  const { PracticalAttempt } = loadTsModule('apps/web/src/features/participation/practical/PracticalAttempt.tsx');
  let writes = 0;
  const transport = { fileUrl: () => '', attempt: async () => { writes++; } };
  const data = { canTransfer: true, activity: { title: 'Actividad', attachmentRequired: false, zone: 'UTC',
    questions: [{ id: 'question', type: 'DEVELOPMENT', prompt: 'Explicá', options: [] }] },
    attempt: { id: attempt, number: 1, status: 'DRAFT', epoch: '4', revision: '0', answers: [], attachments: [] } };
  for (const authority of [null, editor]) {
    const questionnaire = hookView(QuestionnaireAttempt, { operations: api.createQuestionnaireAttemptApi(transport, room, attempt, authority),
      reading: api.createAttemptReadingApi(transport), data, editor: authority, refresh: async () => {} });
    const practical = hookView(PracticalAttempt, { operations: api.createPracticalAttemptApi(transport, room, attempt, authority),
      attachments: api.createAttemptAttachmentsApi(transport, room, attempt, authority), data, editor: authority, refresh: async () => {} });
    t.after(() => { questionnaire.close(); practical.close(); });
    await questionnaire.flush(); await practical.flush();
    assert.equal(descendants(questionnaire.tree, node => node.type === 'fieldset')[0].props.disabled, true);
    assert.equal(descendants(practical.tree, node => node.type === 'textarea')[0].props.disabled, true);
    for (const view of [questionnaire, practical]) assert.equal(descendants(view.tree,
      node => node.type === 'button' && ['Guardar borrador', 'Revisar entrega'].includes(node.props.children)).length, 0);
  }
  assert.equal(writes, 0);
});
