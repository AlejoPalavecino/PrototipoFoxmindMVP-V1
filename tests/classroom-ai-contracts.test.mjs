import test from 'node:test';
import assert from 'node:assert/strict';

const domain = () => import('../src/core/domain/index.ts');
const fileId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const unit = (name = 'Luz') => ({ name, topics: [{ name: 'Exposición' }] });
const proposal = () => ({ units: [unit()], warnings: [] });
const invalid = operation => assert.throws(operation, { code: 'INVALID_INPUT' });

test('C1 strict transport parsers preserve revisions, source identity and reviewed units', async () => {
  const { parseStartExtraction, parseRetryExtraction, parseApplyExtraction } = await domain();
  const start = { revision: '3', planFileId: fileId };
  const retry = { revision: '3', requestId };
  const apply = { ...retry, units: [unit()] };
  assert.deepEqual(parseStartExtraction(start), start);
  assert.deepEqual(parseRetryExtraction(retry), retry);
  assert.deepEqual(parseApplyExtraction(apply), apply);
  for (const [parse, valid] of [[parseStartExtraction, start], [parseRetryExtraction, retry], [parseApplyExtraction, apply]]) {
    for (const bad of [null, [], 'json', { ...valid, extra: true }, { ...valid, revision: 3 },
      { ...valid, revision: '' }, { ...valid, revision: '-1' }, { ...valid, revision: '1\n' }]) invalid(() => parse(bad));
    for (const key of Object.keys(valid)) invalid(() => parse({ ...valid, [key]: undefined }));
  }
  invalid(() => parseStartExtraction({ ...start, planFileId: 'file' }));
  invalid(() => parseRetryExtraction({ ...retry, requestId: 'retry' }));
  invalid(() => parseApplyExtraction({ ...apply, units: [] }));
});

test('C1 curriculum accepts Unicode code points and exact unit/topic bounds', async () => {
  const { parseExtractedCurriculum } = await domain();
  assert.deepEqual(parseExtractedCurriculum(proposal()), proposal());
  assert.equal(parseExtractedCurriculum({ units: [unit('🦊'.repeat(120))], warnings: [] }).units[0].name, '🦊'.repeat(120));
  const units = Array.from({ length: 100 }, (_, i) => ({ name: `Unidad ${i}`, topics: Array.from({ length: 5 }, () => ({ name: 'Tema' })) }));
  assert.equal(parseExtractedCurriculum({ units, warnings: ['PARTIAL_STRUCTURE', 'DOCX_IMAGES_OMITTED'] }).units.length, 100);
  assert.equal(parseExtractedCurriculum({ units: [{ name: 'U', topics: Array.from({ length: 100 }, () => ({ name: 'T' })) }], warnings: [] }).units[0].topics.length, 100);
});

test('C1 malformed curriculum, extra fields, controls and excessive bounds fail closed', async () => {
  const { parseExtractedCurriculum } = await domain();
  const bad = [null, [], '{}', { ...proposal(), instructions: 'publish now' }, { units: [], warnings: [] },
    { units: [unit()], warnings: ['UNKNOWN'] }, { units: [unit()], warnings: 'PARTIAL_STRUCTURE' },
    { units: [unit()] }, { units: [unit()], warnings: [], tools: ['fetch'] },
    { units: [{ ...unit(), id: fileId }], warnings: [] },
    { units: [{ name: 'U', topics: [{ name: 'T', action: 'publish' }] }], warnings: [] },
    { units: [{ name: 'U', topics: [] }], warnings: [] },
    { units: Array.from({ length: 101 }, () => unit()), warnings: [] },
    { units: [{ name: 'U', topics: Array.from({ length: 101 }, () => ({ name: 'T' })) }], warnings: [] },
    { units: Array.from({ length: 6 }, () => ({ name: 'U', topics: Array.from({ length: 100 }, () => ({ name: 'T' })) })), warnings: [] }];
  for (const name of ['', ' ', 123, 'a'.repeat(121), '🦊'.repeat(121), 'A\u0000B', 'A\u0085B']) {
    bad.push({ units: [unit(name)], warnings: [] });
    bad.push({ units: [{ name: 'U', topics: [{ name }] }], warnings: [] });
  }
  for (const value of bad) invalid(() => parseExtractedCurriculum(value));
});

test('C1 provider schema permits no structure while successful business proposal requires structure', async () => {
  const { studyPlanSchemaV1, parseExtractedCurriculum } = await domain();
  assert.equal(studyPlanSchemaV1.type, 'object');
  assert.equal(studyPlanSchemaV1.additionalProperties, false);
  assert.deepEqual([...studyPlanSchemaV1.required].sort(), ['units', 'warnings']);
  assert.equal(studyPlanSchemaV1.properties.units.type, 'array');
  assert.equal(studyPlanSchemaV1.properties.units.minItems ?? 0, 0);
  assert.equal(studyPlanSchemaV1.properties.units.items.additionalProperties, false);
  invalid(() => parseExtractedCurriculum({ units: [], warnings: [] }));
});

test('C1 manual incomplete drafts retain their pre-AI semantics', async () => {
  const { draftPayload } = await import("../apps/api/src/modules/classrooms/access/infrastructure/policy.ts");
  assert.deepEqual(draftPayload({}, false), {});
  assert.deepEqual(draftPayload({ units: [] }, false), { units: [] });
  assert.deepEqual(draftPayload({ units: [{ name: '', topics: [] }] }, false), { units: [{ name: '', topics: [] }] });
});
