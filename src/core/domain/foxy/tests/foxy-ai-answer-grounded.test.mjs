import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const domain = () => import('../../index.ts');
const invalid = fn => assert.throws(fn, { code: 'INVALID_INPUT', message: 'INVALID_INPUT' });
const sourceA = `material:${randomUUID()}`, sourceB = `plan:${randomUUID()}`, sourceC = `activity:${randomUUID()}`;
const mapping = { sources: [
  { sourceKey: 's1', sourceId: sourceA, documentKeys: ['d1'] },
  { sourceKey: 's2', sourceId: sourceB, documentKeys: ['d2'] },
  { sourceKey: 's3', sourceId: sourceC, documentKeys: [] }
], documents: [{ documentKey: 'd1', pageCount: 4 }, { documentKey: 'd2', pageCount: null }] };
const answer = (changes = {}) => ({ schemaVersion: 'foxy-answer-v1', title: 'Resumen', markdown: 'Contenido sintético',
  references: [{ sourceKey: 's1', documentKey: 'd1', page: 2 }], warnings: [], missingInformation: [], ...changes });
async function parser() {
  const { parseGroundedFoxyAnswer } = await domain(); assert.equal(typeof parseGroundedFoxyAnswer, 'function');
  return parseGroundedFoxyAnswer;
}

test('grounded references resolve only through private source/document mapping', async () => {
  const parse = await parser();
  const value = answer({ references: [
    { sourceKey: 's1', documentKey: 'd1', page: 4 },
    { sourceKey: 's2', documentKey: 'd2', page: null },
    { sourceKey: 's3', documentKey: null, page: null }
  ] });
  const result = parse(value, mapping);
  assert.equal(result.schemaVersion, value.schemaVersion); assert.equal(result.markdown, value.markdown);
  assert.deepEqual(result.references, [
    { sourceId: sourceA, documentKey: 'd1', page: 4 },
    { sourceId: sourceB, documentKey: 'd2', page: null },
    { sourceId: sourceC, documentKey: null, page: null }
  ]);
  assert.equal(JSON.stringify(result.references).includes('sourceKey'), false);
});

test('invented, unlinked and private IDs cannot appear in model references', async () => {
  const parse = await parser();
  for (const reference of [
    { sourceKey: 's99', documentKey: 'd1', page: 1 }, { sourceKey: 's1', documentKey: 'd99', page: 1 },
    { sourceKey: 's1', documentKey: 'd2', page: null }, { sourceKey: 's3', documentKey: 'd1', page: null },
    { sourceKey: sourceA, documentKey: 'd1', page: 1 }, { sourceId: sourceA, documentKey: 'd1', page: 1 },
    { sourceKey: 's1', documentKey: 'd1', page: 1, sourceId: sourceA },
    { sourceKey: 's1', documentKey: 'd1' }, { sourceKey: 's1', page: null }
  ]) invalid(() => parse(answer({ references: [reference] }), mapping));
});

test('page must exist in its linked PDF; no pages on text or no-document references', async () => {
  const parse = await parser();
  for (const reference of [
    { sourceKey: 's1', documentKey: 'd1', page: 0 }, { sourceKey: 's1', documentKey: 'd1', page: 5 },
    { sourceKey: 's1', documentKey: 'd1', page: -1 }, { sourceKey: 's1', documentKey: 'd1', page: 1.5 },
    { sourceKey: 's1', documentKey: 'd1', page: '1' }, { sourceKey: 's2', documentKey: 'd2', page: 1 },
    { sourceKey: 's3', documentKey: null, page: 1 }, { sourceKey: 's1', documentKey: null, page: 1 }
  ]) invalid(() => parse(answer({ references: [reference] }), mapping));
  assert.deepEqual(parse(answer({ references: [{ sourceKey: 's1', documentKey: 'd1', page: null }] }), mapping).references,
    [{ sourceId: sourceA, documentKey: 'd1', page: null }]);
});

test('response fields have bounded Unicode lengths and strict structure', async () => {
  const parse = await parser();
  const warnings = Array.from({ length: 10 }, (_, i) => `Aviso ${i} ${'🦊'.repeat(492)}`);
  const missingInformation = Array.from({ length: 10 }, (_, i) => `Falta ${i} ${'x'.repeat(492)}`);
  assert.equal([...parse(answer({ markdown: '🦊'.repeat(50_000), warnings, missingInformation }), mapping).markdown].length, 50_000);
  for (const bad of [null, [], { ...answer(), extra: true }, answer({ schemaVersion: 'v2' }), answer({ title: '' }),
    answer({ title: 'x'.repeat(201) }), answer({ markdown: '' }), answer({ markdown: '🦊'.repeat(50_001) }),
    answer({ warnings: Array(11).fill('aviso') }), answer({ warnings: ['🦊'.repeat(501)] }),
    answer({ missingInformation: Array(11).fill('falta') }), answer({ missingInformation: ['x'.repeat(501)] }),
    answer({ warnings: [null] }), answer({ missingInformation: null }), answer({ references: null })]) invalid(() => parse(bad, mapping));
  const value = answer(); for (const key of Object.keys(value)) { const changed = { ...value }; delete changed[key]; invalid(() => parse(changed, mapping)); }
});

test('reference count accepts 100 and rejects 101 without inventing map entries', async () => {
  const parse = await parser();
  const referenceMap = { sources: [{ sourceKey: 's1', sourceId: sourceA, documentKeys: ['d1'] }],
    documents: [{ documentKey: 'd1', pageCount: 100 }] };
  const references = Array.from({ length: 100 }, (_, page) => ({ sourceKey: 's1', documentKey: 'd1', page: page + 1 }));
  assert.equal(parse(answer({ references }), referenceMap).references.length, 100);
  invalid(() => parse(answer({ references: [...references, { sourceKey: 's1', documentKey: 'd1', page: null }] }), referenceMap));
});
