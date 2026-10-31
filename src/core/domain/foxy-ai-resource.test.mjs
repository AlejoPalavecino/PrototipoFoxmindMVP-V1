import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const domain = () => import('./index.ts');
const invalid = (fn) => assert.throws(fn, { code: 'INVALID_INPUT', message: 'INVALID_INPUT' });
const answer = (changes = {}) => ({ schemaVersion: 'foxy-answer-v1', title: 'Repaso', markdown: '## Contenido\nTexto.',
  references: [{ sourceId: `material:${randomUUID()}`, page: 1 }], warnings: [], missingInformation: [], ...changes });
const edit = (changes = {}) => ({ requestId: randomUUID(), revision: '4', title: 'Repaso', markdown: 'Texto revisado', ...changes });
const prepare = (changes = {}) => ({ requestId: randomUUID(), resourceRevision: '4', classroomId: randomUUID(), title: 'Repaso',
  unitId: null, topicId: null, ...changes });
const confirm = (changes = {}) => ({ requestId: randomUUID(), publicationRevision: '4', classroomRevision: '5', confirm: true, ...changes });
const revisionBad = [1, '', '-1', '1\n', '9223372036854775808'];

function requiredAndExact(parse, value) {
  invalid(() => parse({ ...value, unexpected: true }));
  for (const key of Object.keys(value)) { const changed = { ...value }; delete changed[key]; invalid(() => parse(changed)); }
}

test('answer requires a versioned response and exact valid reference shapes', async () => {
  const { parseFoxyAnswer: parse } = await domain();
  assert.equal(typeof parse, 'function');
  const value = answer();
  assert.deepEqual(parse(value), value);
  const withoutPage = answer({ references: [{ sourceId: `plan:${randomUUID()}`, page: null }] });
  assert.deepEqual(parse(withoutPage), withoutPage);
  requiredAndExact(parse, value);
  for (const bad of [null, [], { ...value, schemaVersion: 'foxy-answer-v2' }, { ...value, title: '' },
    { ...value, title: 'x'.repeat(201) }, { ...value, markdown: '' }, { ...value, references: null },
    { ...value, warnings: null }, { ...value, missingInformation: null },
    { ...value, references: [{ sourceId: `material:${randomUUID()}`, page: 0 }] },
    { ...value, references: [{ sourceId: `material:${randomUUID()}`, page: 1.5 }] },
    { ...value, references: [{ sourceId: 'file:invalid', page: null }] },
    { ...value, references: [{ sourceId: 'plan:invalid', page: null }] },
    { ...value, references: [{ ...value.references[0], extra: true }] },
    { ...value, references: [{ sourceId: value.references[0].sourceId }] }]) invalid(() => parse(bad));
});

test('resource edit retains reviewed text and rejects stale-contract shapes', async () => {
  const { parseEditFoxyResource: parse } = await domain();
  assert.equal(typeof parse, 'function');
  const value = edit();
  assert.deepEqual(parse(value), value);
  requiredAndExact(parse, value);
  for (const bad of [null, [], { ...value, requestId: 'bad' }, { ...value, title: '' },
    { ...value, title: 'x'.repeat(201) }, { ...value, markdown: '' },
    ...revisionBad.map(revision => ({ ...value, revision }))]) invalid(() => parse(bad));
  assert.equal(parse(edit({ revision: '9223372036854775807' })).revision, '9223372036854775807');
});

test('preparing publication selects an authorized destination shape and valid topic-unit relation', async () => {
  const { parsePrepareFoxyPublication: parse } = await domain();
  assert.equal(typeof parse, 'function');
  const value = prepare();
  assert.deepEqual(parse(value), value);
  const associated = prepare({ unitId: randomUUID(), topicId: randomUUID() });
  assert.deepEqual(parse(associated), associated);
  const unitOnly = prepare({ unitId: randomUUID() });
  assert.deepEqual(parse(unitOnly), unitOnly);
  requiredAndExact(parse, value);
  for (const bad of [null, [], { ...value, requestId: 'bad' }, { ...value, classroomId: 'bad' },
    { ...value, title: '' }, { ...value, title: 'x'.repeat(201) }, { ...value, unitId: 'bad' },
    { ...value, unitId: randomUUID(), topicId: 'bad' }, { ...value, unitId: null, topicId: randomUUID() },
    ...revisionBad.map(resourceRevision => ({ ...value, resourceRevision }))]) invalid(() => parse(bad));
});

test('publication requires explicit confirmation and both current revisions', async () => {
  const { parseConfirmFoxyPublication: parse } = await domain();
  assert.equal(typeof parse, 'function');
  const value = confirm();
  assert.deepEqual(parse(value), value);
  requiredAndExact(parse, value);
  for (const bad of [null, [], { ...value, requestId: 'bad' }, { ...value, confirm: false }, { ...value, confirm: 'true' },
    ...revisionBad.flatMap(revision => [{ ...value, publicationRevision: revision }, { ...value, classroomRevision: revision }])]) invalid(() => parse(bad));
});

test('publication title rejects tabs and newlines, matching library titles', async () => {
  const { parsePrepareFoxyPublication: parse } = await domain();
  for (const title of ['Resumen\nBiología', 'Resumen\tBiología']) invalid(() => parse(prepare({ title })));
});
