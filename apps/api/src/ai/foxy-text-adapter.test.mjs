import test from 'node:test';
import assert from 'node:assert/strict';

const api = () => import('./index.ts');
const config = { model: 'gemini-synthetic', maxInputTokens: 100_000, maxOutputTokens: 4096, deadlineMs: 60 };
const bytes = Uint8Array.from([37, 80, 68, 70]);
const input = (changes = {}) => ({ mode: 'CLASSROOM', purpose: 'SUMMARY', message: 'Resumí la unidad',
  curriculum: { units: [{ name: 'Luz', topics: [{ name: 'Exposición', status: 'NEXT', selected: true }] }] },
  sources: [{ sourceKey: 's1', title: 'Actividad', kind: 'ACTIVITY', text: 'Contenido docente', documentKeys: ['d1', 'd2'] }],
  documents: [{ documentKey: 'd1', sourceKeys: ['s1'], document: { kind: 'pdf', bytes: new Uint8Array(bytes) }, pageCount: 2, warnings: [] },
    { documentKey: 'd2', sourceKeys: ['s1'], document: { kind: 'text', text: 'Contenido Word de prueba' }, pageCount: null, warnings: ['DOCX_IMAGES_OMITTED'] }],
  warnings: ['DOCX_IMAGES_OMITTED'], signal: new AbortController().signal, ...changes });
const answer = (changes = {}) => ({ schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Resumen', markdown: 'Síntesis',
  references: [{ sourceKey: 's1', documentKey: 'd1', page: 1 }], warnings: [], missingInformation: [], ...changes });
const success = json => ({ text: JSON.stringify(json), candidates: [{ finishReason: 'STOP' }],
  usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 30, thoughtsTokenCount: 5 } });
async function fixture({ count = { totalTokens: 20 }, response = success(answer()), countError, generationError, deadlineMs = 60 } = {}) {
  const { GeminiFoxyTextAdapter } = await api(); assert.equal(typeof GeminiFoxyTextAdapter, 'function');
  const calls = [], client = { models: {
    countTokens: async params => { calls.push(['count', params]); if (countError) throw countError; return typeof count === 'function' ? count(params) : count; },
    generateContent: async params => { calls.push(['generate', params]); if (generationError) throw generationError; return typeof response === 'function' ? response(params) : response; }
  } };
  return { adapter: new GeminiFoxyTextAdapter({ client, configuration: { ...config, deadlineMs } }), calls };
}

test('SDK request counts controls and sends selected PDF/DOCX as structured, bounded content', async () => {
  const f = await fixture(), value = input(), result = await f.adapter.generate(value);
  assert.deepEqual(result, { json: answer(), inputTokens: 20, outputTokens: 35 });
  assert.deepEqual(f.calls.map(([kind]) => kind), ['count', 'generate']);
  const count = f.calls[0][1], generated = f.calls[1][1];
  assert.deepEqual(count.contents.slice(-generated.contents.length), generated.contents);
  const countedControls = count.contents.slice(0, -generated.contents.length).flatMap(c => c.parts ?? []).map(p => p.text ?? '').join('\n');
  assert.ok(countedControls.length > 0); assert.ok(countedControls.includes('foxy-text-response-v1'));
  const serialized = JSON.stringify(generated);
  assert.ok(serialized.includes(Buffer.from(bytes).toString('base64'))); assert.ok(serialized.includes('application/pdf'));
  assert.ok(serialized.includes('Contenido Word de prueba')); assert.equal(serialized.includes('fileUri'), false);
  assert.equal(generated.model, config.model); assert.equal(generated.config.responseMimeType, 'application/json');
  assert.equal(generated.config.responseJsonSchema.type, 'object'); assert.equal(generated.config.maxOutputTokens, config.maxOutputTokens);
  assert.equal(generated.config.tools?.length ?? 0, 0); assert.equal(generated.config.automaticContinuation, false);
  assert.ok(generated.config.abortSignal instanceof AbortSignal);
});
test('explicit RUBRIC purpose reaches the real adapter transport through token counting and generation',async()=>{
  const f=await fixture();await f.adapter.generate(input({purpose:'RUBRIC'}));assert.deepEqual(f.calls.map(([kind])=>kind),['count','generate']);
});

test('provider instructions explain the mutually exclusive response status fields', async () => {
  const f = await fixture(); await f.adapter.generate(input());
  const instruction = f.calls.at(-1)[1].config.systemInstruction;
  assert.match(instruction, /READY[^.]*missingInformation[^.]*empty/);
  assert.match(instruction, /INSUFFICIENT_CONTENT[^.]*markdown[^.]*empty[^.]*references[^.]*empty/);
  assert.match(instruction, /missingInformation[^.]*at least one/);
});

test('modes are explicit, sources untrusted and no private ids or mapping are sent', async () => {
  for (const mode of ['GENERAL', 'CLASSROOM']) {
    const f = await fixture({ response: success(answer({ references: [] })) });
    const value = mode === 'GENERAL' ? input({ mode, curriculum: null, sources: [], documents: [], warnings: [] }) : input();
    await f.adapter.generate(value);
    const args = f.calls.at(-1)[1], text = JSON.stringify(args);
    assert.ok(text.includes(mode)); assert.equal(text.includes('referenceMap'), false); assert.equal(text.includes('sourceId'), false);
    assert.equal(text.includes('classroomId'), false); assert.equal(text.includes('ownerId'), false); assert.equal(text.includes('fileId'), false);
    assert.equal(args.config.tools?.length ?? 0, 0);
    assert.ok(typeof args.config.systemInstruction === 'string' && args.config.systemInstruction.length > 0);
    assert.match(args.config.systemInstruction, /untrusted|no confiable|no confiables/i);
  }
});

test('invalid token counts or over limit prevent dispatch', async () => {
  for (const count of [{}, { totalTokens: null }, { totalTokens: NaN }, { totalTokens: -1 }, { totalTokens: 1.5 }, { totalTokens: 100001 }]) {
    const f = await fixture({ count });
    await assert.rejects(f.adapter.generate(input()), error => ['AI_INPUT_LIMIT', 'AI_UNAVAILABLE'].includes(error.code));
    assert.deepEqual(f.calls.map(([kind]) => kind), ['count']);
  }
});

test('preflight binds all controls and source bytes and detects mutation during count', async () => {
  const f = await fixture(), value = input();
  assert.equal(await f.adapter.countTokens(value), 20); await f.adapter.generate(value);
  assert.equal(f.calls.filter(([kind]) => kind === 'count').length, 1);
  value.documents[0].document.bytes[0] ^= 1; await f.adapter.generate(value);
  assert.equal(f.calls.filter(([kind]) => kind === 'count').length, 2);
  const changing = input(), g = await fixture({ count: async () => { changing.message = 'mutación'; return { totalTokens: 20 }; } });
  await assert.rejects(g.adapter.countTokens(changing)); assert.equal(g.calls.some(([kind]) => kind === 'generate'), false);
});

test('response schema enforces READY, insufficient content and selected references', async () => {
  const missing = answer({ status: 'INSUFFICIENT_CONTENT', title: 'Información necesaria', markdown: '', references: [], missingInformation: ['Falta el texto de la unidad.'] });
  const f = await fixture({ response: success(missing) }); assert.deepEqual((await f.adapter.generate(input())).json, missing);
  const bad = [answer({ references: [{ sourceKey: 's9', documentKey: 'd1', page: 1 }] }),
    answer({ references: [{ sourceKey: 's1', documentKey: 'd9', page: 1 }] }),
    answer({ references: [{ sourceKey: 's1', documentKey: 'd1', page: 3 }] }),
    answer({ references: [{ sourceKey: 's1', documentKey: 'd2', page: 1 }] }),
    answer({ references: [{ sourceKey: 's1', documentKey: null, page: 1 }] }),
    answer({ references: [{ sourceId: 'material:private-id', documentKey: 'd1', page: 1 }] }),
    answer({ markdown: '' }), answer({ missingInformation: ['Debe estar vacío'] }), answer({ markdown: 'x'.repeat(50001) }),
    answer({ status: 'INSUFFICIENT_CONTENT', title: '', markdown: '', references: [], missingInformation: ['Falta'] }),
    answer({ status: 'INSUFFICIENT_CONTENT', title: 'Información necesaria', markdown: '', references: [], missingInformation: [] }),
    answer({ status: 'INSUFFICIENT_CONTENT', title: 'Información necesaria', markdown: 'No permitido', references: [], missingInformation: ['Falta'] })];
  for (const json of bad) await assert.rejects((await fixture({ response: success(json) })).adapter.generate(input()), { code: 'INVALID_AI_OUTPUT' });
});

test('malformed, blocked, truncated or oversized responses are rejected without leaking provider detail', async () => {
  for (const response of [{ ...success(answer()), text: '{' }, { ...success(answer()), text: 'x'.repeat(262145) },
    { ...success(answer()), candidates: [{ finishReason: 'MAX_TOKENS' }] }, { ...success(answer()), promptFeedback: { blockReason: 'SAFETY' } }]) {
    const f = await fixture({ response }); await assert.rejects(f.adapter.generate(input()), { code: 'INVALID_AI_OUTPUT' });
    assert.equal(f.calls.filter(([kind]) => kind === 'generate').length, 1);
  }
  const incomplete = await fixture({ response: { ...success(answer()), usageMetadata: { promptTokenCount: 20, candidatesTokenCount: null } } });
  const out = await incomplete.adapter.generate(input()); assert.equal(out.inputTokens, 20); assert.equal(out.outputTokens, null);
});

test('abort, deadlines and provider errors never retry a possibly dispatched request', async () => {
  const controller = new AbortController(); controller.abort(); const initial = await fixture();
  await assert.rejects(initial.adapter.generate(input({ signal: controller.signal }))); assert.equal(initial.calls.length, 0);
  for (const options of [{ generationError: new Error('sensitive provider detail') }, { deadlineMs: 10, response: () => new Promise(() => {}) }]) {
    const f = await fixture(options);
    await assert.rejects(f.adapter.generate(input()), { code: 'PROVIDER_OUTCOME_UNKNOWN', message: 'PROVIDER_OUTCOME_UNKNOWN' });
    assert.equal(f.calls.filter(([kind]) => kind === 'generate').length, 1);
  }
  const rate = await fixture({ generationError: Object.assign(new Error('private'), { status: 429 }) });
  await assert.rejects(rate.adapter.generate(input()), { code: 'AI_RATE_LIMITED', message: 'AI_RATE_LIMITED' });
});

for (const [field, mutate] of [['text', value => { value.message = 'Otra consulta'; }],
  ['PDF bytes', value => { value.documents[0].document.bytes[0] ^= 1; }]]) {
  test(`${field} changed after successful preflight is rejected before recount or dispatch`, async () => {
    const f = await fixture(), value = input();
    assert.equal(await f.adapter.countTokens(value), 20);
    mutate(value);
    await assert.rejects(f.adapter.generate(value));
    assert.deepEqual(f.calls.map(([kind]) => kind), ['count']);
  });
}
