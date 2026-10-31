import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const api = () => import('./provider-input.ts');
function fixture() {
  const classroomId = randomUUID(), unitId = randomUUID(), topicId = randomUUID(), futureId = randomUUID();
  const sourceId = `material:${randomUUID()}`, planId = `plan:${randomUUID()}`, ownerSecret = randomUUID(), digest = 'a'.repeat(64);
  const bytes = Uint8Array.of(37, 80, 68, 70, 0, 255);
  const grounding = { context: { kind: 'CLASSROOM', classroomId },
    curriculum: { units: [{ id: unitId, name: 'Energía', position: 0, topics: [
      { id: topicId, name: 'Tema enseñado', position: 0, status: 'TAUGHT' },
      { id: futureId, name: 'Tema futuro', position: 1, status: 'PENDING' }
    ] }], selectedTopicIds: [topicId] },
    sources: [{ sourceKey: 's1', title: 'Fuente', kind: 'MATERIAL', text: 'Texto íntegro de la fuente', documentKeys: ['d1'] },
      { sourceKey: 's2', title: 'Plan', kind: 'PLAN', text: '', documentKeys: ['d2'] }],
    documents: [{ documentKey: 'd1', sourceKeys: ['s1'], document: { kind: 'pdf', bytes }, pageCount: 1, warnings: [] },
      { documentKey: 'd2', sourceKeys: ['s2'], document: { kind: 'text', text: 'Contenido íntegro DOCX' }, pageCount: null, warnings: ['DOCX_IMAGES_OMITTED'] }],
    referenceMap: [{ sourceKey: 's1', sourceId, documentKeys: ['d1'] }, { sourceKey: 's2', sourceId: planId, documentKeys: ['d2'] }], warnings: ['DOCX_IMAGES_OMITTED'] };
  return { grounding, classroomId, unitId, topicId, futureId, sourceId, planId, ownerSecret, digest, bytes };
}
async function project() {
  const { projectFoxyTextInput } = await api(); assert.equal(typeof projectFoxyTextInput, 'function'); return projectFoxyTextInput;
}

test('projects selected curriculum and content without private IDs or reference mapping', async () => {
  const fn = await project(), f = fixture(), signal = new AbortController().signal, before = structuredClone(f.grounding);
  const result = fn({ purpose: 'SUMMARY', message: 'Resumí el tema', grounding: f.grounding, signal });
  assert.deepEqual(Object.keys(result).sort(), ['curriculum', 'documents', 'history', 'message', 'mode', 'purpose', 'signal', 'sources', 'warnings']);
  assert.equal(result.mode, 'CLASSROOM'); assert.equal(result.purpose, 'SUMMARY'); assert.equal(result.message, 'Resumí el tema');
  assert.equal(result.signal, signal);
  assert.deepEqual(result.curriculum, { units: [{ name: 'Energía', topics: [
    { name: 'Tema enseñado', status: 'TAUGHT', selected: true },
    { name: 'Tema futuro', status: 'PENDING', selected: false }
  ] }] });
  assert.deepEqual(result.sources, f.grounding.sources); assert.deepEqual(result.documents, f.grounding.documents);
  assert.deepEqual(result.warnings, ['DOCX_IMAGES_OMITTED']); assert.deepEqual(f.grounding, before);
  const text = JSON.stringify({ ...result, signal: null });
  for (const hidden of [f.classroomId, f.unitId, f.topicId, f.futureId, f.sourceId, f.planId, f.ownerSecret, f.digest, 'referenceMap', 'sourceId', 'fileId'])
    assert.equal(text.includes(hidden), false, `provider input includes ${hidden}`);
  assert.deepEqual(result.documents[0].document.bytes, f.bytes);
  assert.equal(result.documents[1].document.text, 'Contenido íntegro DOCX');
  result.curriculum.units[0].topics[0].name = 'Cambiado'; result.sources[0].text = 'Cambiado';
  result.documents[0].document.bytes[0] = 0;
  assert.deepEqual(f.grounding, before);
});

test('general mode has no curriculum, classroom sources or document bytes', async () => {
  const fn = await project(), signal = new AbortController().signal;
  const grounding = { context: { kind: 'GENERAL' }, curriculum: null, sources: [], documents: [], referenceMap: [], warnings: [] };
  const result = fn({ purpose: 'CHAT', message: 'Hola', grounding, signal });
  assert.equal(result.mode, 'GENERAL'); assert.equal(result.curriculum, null);
  assert.deepEqual(result.sources, []); assert.deepEqual(result.documents, []); assert.equal(result.signal, signal);
  const f = fixture(), contradictory = { ...f.grounding, context: { kind: 'GENERAL' }, curriculum: null };
  assert.throws(() => fn({ purpose: 'CHAT', message: 'Hola', grounding: contradictory, signal }));
});

test('selected topic IDs are matched by UUID identity and NEXT remains a separate state', async () => {
  const fn = await project(), f = fixture(), signal = new AbortController().signal;
  f.grounding.curriculum.units[0].topics[0].id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  f.grounding.curriculum.selectedTopicIds = ['AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'];
  f.grounding.curriculum.units[0].topics[1].status = 'NEXT';
  const result = fn({ purpose: 'REVIEW', message: 'Repasar', grounding: f.grounding, signal });
  assert.deepEqual(result.curriculum.units[0].topics.map(t => [t.status, t.selected]), [['TAUGHT', true], ['NEXT', false]]);
});

test('aborted projection rejects and leaves supplied grounding untouched', async () => {
  const fn = await project(), f = fixture(), before = structuredClone(f.grounding), controller = new AbortController(); controller.abort();
  assert.throws(() => fn({ purpose: 'CHAT', message: 'Hola', grounding: f.grounding, signal: controller.signal }));
  assert.deepEqual(f.grounding, before);
});
