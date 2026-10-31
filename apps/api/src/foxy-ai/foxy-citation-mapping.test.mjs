import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

function fixture() {
  const classroomId = randomUUID(), materialId = randomUUID(), activityId = randomUUID();
  const material = `material:${materialId}`, activity = `activity:${activityId}`;
  const file = (purpose, targetId) => ({ fileId: randomUUID(), digest: 'a'.repeat(64), extension: 'pdf', sizeBytes: 4, purpose, targetId });
  const files = [file('material', null), file('instructions', activityId), file('instructions', activityId)];
  const snapshot = { context: { kind: 'CLASSROOM', classroomId }, curriculum: { units: [], selectedTopicIds: [] }, sources: [
    { sourceId: material, title: 'Material', kind: 'MATERIAL', text: '', files: [files[0]] },
    { sourceId: activity, title: 'Actividad', kind: 'ACTIVITY', text: 'Consigna', files: files.slice(1) } ] };
  const referenceMap = [{ sourceKey: 's1', sourceId: material, documentKeys: ['d1'] },
    { sourceKey: 's2', sourceId: activity, documentKeys: ['d2', 'd3'] }];
  const references = [{ sourceId: activity, page: 1 }, { sourceId: material, page: 2 }, { sourceId: activity, page: 1 }];
  const answer = { schemaVersion: 'foxy-answer-v1', title: 'Síntesis', markdown: 'Texto', references, warnings: [], missingInformation: [] };
  const sourceReport = [{ sourceKey: 's1', title: 'Material', kind: 'MATERIAL', documentKeys: ['d1'],
    citations: [{ sourceId: material, documentKey: 'd1', page: 2 }] },
  { sourceKey: 's2', title: 'Actividad', kind: 'ACTIVITY', documentKeys: ['d2', 'd3'],
    citations: [{ sourceId: activity, documentKey: 'd2', page: 1 }, { sourceId: activity, documentKey: 'd3', page: 1 }] }];
  return { input: { answer, sourceReport, referenceMap, snapshot }, files, material, activity };
}
async function map(input) { const api = await import('./index.ts'); assert.equal(typeof api.mapFoxyCitations, 'function'); return api.mapFoxyCitations(input); }

test('maps globally numbered files and interleaved duplicate-page citations in answer order', async () => {
  const f = fixture(), result = await map(f.input);
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(c => c.citationKey), ['c1','c2','c3']);
  assert.deepEqual(result.map(c => c.sourceId), [f.activity,f.material,f.activity]);
  assert.deepEqual(result.map(c => c.file?.fileId), [f.files[1].fileId,f.files[0].fileId,f.files[2].fileId]);
  assert.deepEqual(result.map(c => c.page), [1,2,1]); assert.ok(result.every(c => c.available));
  assert.deepEqual(result.map(c => [c.sourceTitle,c.sourceKind]), [['Actividad','ACTIVITY'],['Material','MATERIAL'],['Actividad','ACTIVITY']]);
});

test('inconsistent mapping, missing evidence or altered page never guesses a file', async () => {
  const mutations = [
    x => { x.referenceMap[1].documentKeys = ['d1','d3']; },
    x => { x.snapshot.sources[1].files.pop(); },
    x => { x.sourceReport[1].citations[0].documentKey = 'd999'; },
    x => { x.sourceReport[1].citations[0].page = 8; },
    x => { x.sourceReport[1].citations.shift(); },
    x => { x.snapshot.sources[1].sourceId = `activity:${randomUUID()}`; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f.input); const result = await map(f.input);
    assert.equal(result[0].citationKey, 'c1'); assert.equal(result[0].available, false); assert.equal(result[0].file, null);
  }
});

test('unavailable mapping does not leak a source or file from another citation', async () => {
  const f = fixture(); f.input.sourceReport[1].citations[0].sourceId = f.material;
  const result = await map(f.input); assert.equal(result[0].available, false); assert.equal(result[0].file, null);
  assert.notEqual(result[0].sourceId, f.material);
});

test('a text-only source citation with no document and no page remains valid', async () => {
  const f = fixture(), source = f.input.snapshot.sources[1], mapping = f.input.referenceMap[1], report = f.input.sourceReport[1];
  source.files = []; mapping.documentKeys = []; report.documentKeys = [];
  report.citations = [{ sourceId: f.activity, documentKey: null, page: null }];
  f.input.answer.references = [{ sourceId: f.activity, page: null }];
  const [citation] = await map(f.input); assert.equal(citation.citationKey, 'c1');
  assert.equal(citation.available, true); assert.equal(citation.file, null); assert.equal(citation.page, null);
});

test('duplicate source UUIDs differing only by case fail closed for every citation', async () => {
  const f = fixture(), source = f.input.snapshot.sources[1], upper = `activity:${source.sourceId.slice(9).toUpperCase()}`;
  f.input.snapshot.sources = [source, { ...structuredClone(source), sourceId: upper }];
  f.input.referenceMap = [{ sourceKey: 's1', sourceId: f.activity, documentKeys: ['d1', 'd2'] },
    { sourceKey: 's2', sourceId: upper, documentKeys: ['d1', 'd2'] }];
  f.input.sourceReport = [{ sourceKey: 's1', title: source.title, kind: source.kind, documentKeys: ['d1', 'd2'],
    citations: [{ sourceId: f.activity, documentKey: 'd1', page: 1 }] },
  { sourceKey: 's2', title: source.title, kind: source.kind, documentKeys: ['d1', 'd2'],
    citations: [{ sourceId: upper, documentKey: 'd1', page: 1 }] }];
  f.input.answer.references = [{ sourceId: f.activity, page: 1 }, { sourceId: upper, page: 1 }];
  const result = await map(f.input); assert.equal(result.length, 2);
  for (const citation of result) { assert.equal(citation.available, false); assert.equal(citation.file, null); }
});
