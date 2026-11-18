import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const api = () => Promise.all([import("../../../../../../platform/ai/errors.ts"),import("../../../../../study/generation/infrastructure/providers/study-adapter.ts"),import("../../../../../activities/generation/infrastructure/providers/activity-adapter.ts"),import("../../../../../../platform/ai/configuration.ts"),import("../../../../../curriculum/generation/infrastructure/providers/gemini-adapter.ts"),import("../../../../../../platform/ai/text-budget.ts"),import("../../../../visuals/infrastructure/providers/foxy-image-budget.ts"),import("../foxy-adapter.ts"),import("../../../../visuals/infrastructure/providers/foxy-image-adapter.ts"),import("../../../../visuals/infrastructure/providers/foxy-diagram-adapter.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9]) => Object.freeze({AiError: m0.AiError,createGeminiStudyProvider: m1.createGeminiStudyProvider,GeminiActivityGenerationAdapter: m2.GeminiActivityGenerationAdapter,createGeminiActivityGenerationAdapter: m2.createGeminiActivityGenerationAdapter,readAiConfiguration: m3.readAiConfiguration,GeminiExtractionAdapter: m4.GeminiExtractionAdapter,createGeminiExtractionAdapter: m4.createGeminiExtractionAdapter,reserveAiTextBudget: m5.reserveAiTextBudget,settleAiTextBudget: m5.settleAiTextBudget,tokenCost: m5.tokenCost,quoteFoxyImageBudget: m6.quoteFoxyImageBudget,GeminiFoxyTextAdapter: m7.GeminiFoxyTextAdapter,createGeminiFoxyTextAdapter: m7.createGeminiFoxyTextAdapter,GeminiFoxyImageAdapter: m8.GeminiFoxyImageAdapter,createGeminiFoxyImageAdapter: m8.createGeminiFoxyImageAdapter,GeminiFoxyDiagramAdapter: m9.GeminiFoxyDiagramAdapter,createGeminiFoxyDiagramAdapter: m9.createGeminiFoxyDiagramAdapter}));
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
async function fixture({ count = { totalTokens: 20 }, response = success(answer()), countError, generationError, deadlineMs = 60, promptVersion } = {}) {
  const { GeminiFoxyTextAdapter } = await api(); assert.equal(typeof GeminiFoxyTextAdapter, 'function');
  const calls = [], client = { models: {
    countTokens: async params => { calls.push(['count', params]); if (countError) throw countError; return typeof count === 'function' ? count(params) : count; },
    generateContent: async params => { calls.push(['generate', params]); if (generationError) throw generationError; return typeof response === 'function' ? response(params) : response; }
  } };
  const executionProfile = promptVersion ? { provider: 'gemini', task: 'foxy', ...config, deadlineMs, promptVersion,
    profileId: 'foxy-default', profileVersion: '1', maxDocumentBytes: 20_000_000 } : undefined;
  return { adapter: new GeminiFoxyTextAdapter({ client, configuration: { ...config, deadlineMs, executionProfile } }), calls };
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

test('new teaching resources receive distinct pedagogical instructions in count and generation', async () => {
  const rules = {
    CHAT: /when asked for a summary.*central idea.*essential relationships.*conditions and exceptions/i,
    SUMMARY: /central idea.*essential relationships.*conditions and exceptions/,
    LESSON_PLAN: /observable learning objective.*prior knowledge.*formative check/,
    RUBRIC: /observable evidence.*criteria.*performance levels/,
  };
  for (const [purpose, expected] of Object.entries(rules)) {
    const value = input({ purpose });
    const f = await fixture({ promptVersion: 'foxy-chat-v5' });
    await f.adapter.countTokens(value);
    await f.adapter.generate(value);
    const [count, generated] = f.calls.map(([, parameters]) => parameters);
    assert.match(generated.config.systemInstruction, expected);
    assert.ok(count.contents[0].parts[0].text.includes(generated.config.systemInstruction));
    assert.deepEqual(count.contents.slice(1), generated.contents);
    assert.equal(JSON.parse(generated.contents[0].parts[0].text).message, value.message);
  }
});

test('V6 rubrics use exportable headings and evidence lists by default and preserve explicit format requests', async () => {
  const message = 'Prepará una rúbrica para comparar dos fotos. Usá una tabla.';
  const value = input({ purpose: 'RUBRIC', message });
  const current = await fixture({ promptVersion: 'foxy-chat-v6' });
  await current.adapter.countTokens(value);
  await current.adapter.generate(value);
  const [count, generation] = current.calls.map(([, request]) => request);
  const instruction = generation.config.systemInstruction;
  assert.match(instruction, /Unless the teacher explicitly requests another format/);
  assert.match(instruction, /heading for each criterion.*weight.*bullet list.*level.*evidence/);
  assert.match(instruction, /Avoid Markdown tables and block quotes by default/);
  assert.ok(count.contents[0].parts[0].text.includes(instruction));
  assert.deepEqual(count.contents.slice(1), generation.contents);
  assert.equal(JSON.parse(generation.contents[0].parts[0].text).message, message);
  const previous = await fixture({ promptVersion: 'foxy-chat-v5' });
  await previous.adapter.generate(value);
  const historical = previous.calls.at(-1)[1].config.systemInstruction;
  assert.equal(createHash('sha256').update(historical).digest('hex'), '962c2aab5e16b7085ff7bc5d0edcd76072195ffae7848868afa892c8861d8b55');
  assert.ok(instruction.startsWith(historical));
  const { foxyInstructionFor } = await import('../foxy-prompt.ts');
  for (const purpose of ['CHAT', 'STUDY_MATERIAL', 'REVIEW', 'SUMMARY', 'ACTIVITY_IDEAS', 'LESSON_PLAN']) {
    assert.equal(foxyInstructionFor(purpose, 'foxy-chat-v6'), foxyInstructionFor(purpose, 'foxy-chat-v5'), purpose);
  }
});

test('provider instructions explain the mutually exclusive response status fields', async () => {
  const f = await fixture(); await f.adapter.generate(input());
  const instruction = f.calls.at(-1)[1].config.systemInstruction;
  assert.match(instruction, /READY[^.]*missingInformation[^.]*empty/);
  assert.match(instruction, /INSUFFICIENT_CONTENT[^.]*markdown[^.]*empty[^.]*references[^.]*empty/);
  assert.match(instruction, /missingInformation[^.]*at least one/);
});

test('Foxy asks for brief answers to small requests and preserves depth for creations or follow-ups', async () => {
  const f = await fixture();
  const history = [{ user: '¿Qué es la exposición?', assistant: { title: 'Exposición', markdown: 'Es la luz que recibe el sensor.' } }];
  await f.adapter.generate(input({ purpose: 'CHAT', message: 'Ampliá lo anterior con ejemplos', history }));
  const generated = f.calls.at(-1)[1];
  const { systemInstruction } = generated.config;
  assert.match(systemInstruction, /focused questions, advice and short feedback[^.]*brief by default/);
  assert.match(systemInstruction, /latest user message[^.]*asks for more detail[^.]*follow-up/);
  assert.match(systemInstruction, /STUDY_MATERIAL, LESSON_PLAN and RUBRIC[^.]*complete/);
  assert.match(systemInstruction, /materials, lesson plans, rubrics and assignment instructions[^.]*directly in CHAT/);
  const context = JSON.parse(generated.contents[0].parts[0].text);
  assert.equal(context.message, 'Ampliá lo anterior con ejemplos');
  assert.deepEqual(context.history, history);
  assert.equal(generated.config.maxOutputTokens, config.maxOutputTokens);
  const countedControls = f.calls[0][1].contents.slice(0, -generated.contents.length).flatMap(c => c.parts ?? []);
  assert.ok(countedControls.some(part => part.text?.includes(systemInstruction)));
});

test('new teacher notes bind pedagogical controls at preflight without changing the brief or adding data', async () => {
  const f = await fixture({ promptVersion: 'foxy-chat-v3' });
  const message = 'Prepará un apunte para 2.º año. Usá «la luz que llega» y el ejemplo de la ventana.';
  const value = input({ purpose: 'STUDY_MATERIAL', message });
  assert.equal(await f.adapter.countTokens(value), 20);
  await f.adapter.generate(value);
  assert.deepEqual(f.calls.map(([kind]) => kind), ['count', 'generate']);
  const [count, generated] = f.calls.map(([, parameters]) => parameters);
  const instruction = generated.config.systemInstruction;
  assert.match(instruction, /central relationship/);
  assert.match(instruction, /teacher.s vocabulary, voice and accurate examples/);
  assert.match(instruction, /label invented examples as illustrative/);
  assert.match(instruction, /private brief/);
  assert.match(instruction, /selected sources/);
  assert.match(instruction, /INSUFFICIENT_CONTENT/);
  assert.ok(count.contents[0].parts[0].text.includes(instruction));
  const context = JSON.parse(generated.contents[0].parts[0].text);
  assert.equal(context.message, message);
  assert.equal(context.purpose, 'STUDY_MATERIAL');
  assert.deepEqual(context.sources, value.sources);
  assert.deepEqual(generated.contents, count.contents.slice(1));
});

test('earlier teacher notes and all other purposes retain their original instruction', async () => {
  const { foxyInstruction } = await import('../foxy-prompt.ts');
  for (const purpose of ['CHAT', 'STUDY_MATERIAL', 'REVIEW', 'SUMMARY', 'ACTIVITY_IDEAS', 'LESSON_PLAN', 'RUBRIC']) {
    for (const promptVersion of purpose === 'STUDY_MATERIAL' ? ['foxy-chat-v2'] : ['foxy-chat-v2', 'foxy-chat-v3', 'foxy-chat-v4']) {
      const f = await fixture({ promptVersion });
      await f.adapter.generate(input({ purpose }));
      assert.equal(f.calls.at(-1)[1].config.systemInstruction, foxyInstruction);
    }
  }
});

test('teacher notes v4 require grounded attribution and retain exact prior instructions', async () => {
  const message = 'En clase usamos el mate como ejemplo. Conservá «la luz que llega».';
  const instructionByVersion = new Map();
  for (const promptVersion of ['foxy-chat-v2', 'foxy-chat-v3', 'foxy-chat-v4', 'foxy-chat-v5']) {
    const f = await fixture({ promptVersion });
    const value = input({ purpose: 'STUDY_MATERIAL', message });
    await f.adapter.countTokens(value);
    await f.adapter.generate(value);
    const [count, generated] = f.calls.map(([, parameters]) => parameters);
    const instruction = generated.config.systemInstruction;
    assert.ok(count.contents[0].parts[0].text.includes(instruction));
    assert.equal(JSON.parse(generated.contents[0].parts[0].text).message, message);
    instructionByVersion.set(promptVersion, instruction);
  }
  const digest = version => createHash('sha256').update(instructionByVersion.get(version)).digest('hex');
  assert.equal(digest('foxy-chat-v2'), '442f46ea038ccacf032726c3b1f569f4745925681d9bd87119411a3787dbaa2f');
  assert.equal(digest('foxy-chat-v3'), '1361958120693cf9113a90e062be18e1876034198ea89a2f739a338c945bc267');
  assert.equal(digest('foxy-chat-v4'), '7ecc22a7d5dc828e945b9aaa97f755b752ec07831e1fc061090175300ac497ee');
  assert.ok(instructionByVersion.get('foxy-chat-v5').startsWith(instructionByVersion.get('foxy-chat-v4')));
  assert.match(instructionByVersion.get('foxy-chat-v5'), /when asked for a summary.*central idea.*essential relationships.*conditions and exceptions/i);
  const prior = instructionByVersion.get('foxy-chat-v3'), current = instructionByVersion.get('foxy-chat-v4');
  assert.ok(current.startsWith(prior));
  assert.match(current.slice(prior.length), /shared experiences, attributable labels, facts or quotations/);
  assert.match(current.slice(prior.length), /use neutral wording/);
  assert.match(current.slice(prior.length), /in class.*in the workshop/);
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

test('lesson plans render provider paragraph and list breaks while preserving code examples', async () => {
  const markdown = String.raw`Inicio\n\n**Desarrollo**\n- Resolver\n- Mostrar ` + '`' + String.raw`a\n\nb` + '`';
  const { adapter } = await fixture({ response: success(answer({ markdown })) });
  const result = await adapter.generate(input({ purpose: 'LESSON_PLAN' }));
  assert.equal(result.json.markdown, 'Inicio\n\n**Desarrollo**\n- Resolver\n- Mostrar `a\\n\\nb`');
});
