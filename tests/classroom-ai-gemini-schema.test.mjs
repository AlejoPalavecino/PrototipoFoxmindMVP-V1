import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiExtractionAdapter } from '../apps/api/src/modules/curriculum/infrastructure/providers/gemini-adapter.ts';

const configuration = { model: 'gemini-schema-fixture', maxInputTokens: 100000,
  maxOutputTokens: 16384, deadlineMs: 1000 };
const input = () => ({ document: { kind: 'text', text: 'Synthetic study plan' },
  schemaVersion: 'study-plan-v1', signal: new AbortController().signal });
const curriculum = () => ({ units: [
  { name: 'Luz', topics: [{ name: 'Exposición' }, { name: 'Color' }] },
  { name: 'Sonido', topics: [{ name: 'Ritmo' }, { name: 'Tono' }] },
], warnings: [] });
const units = (count, topics) => Array.from({ length: count }, (_, index) => ({
  name: `Unidad ${index}`, topics: Array.from({ length: topics }, () => ({ name: 'Tema' })),
}));
function containsMaxItems(value) {
  return value !== null && typeof value === 'object'
    && (Object.hasOwn(value, 'maxItems') || Object.values(value).some(containsMaxItems));
}
function fixture(json, inspect = () => {}) {
  const calls = [];
  const client = { models: {
    countTokens: async () => ({ totalTokens: 599 }),
    generateContent: async params => {
      calls.push(params); inspect(params.config.responseJsonSchema);
      return { text: JSON.stringify(json), candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 599, candidatesTokenCount: 141 } };
    },
  } };
  return { calls, adapter: new GeminiExtractionAdapter({ client, configuration }) };
}
function assertRemainingSchema(schema) {
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), ['units', 'warnings']);
  const unit = schema.properties.units.items;
  const topic = unit.properties.topics.items;
  assert.equal(schema.properties.units.type, 'array');
  assert.equal(schema.properties.units.minItems, 0);
  assert.equal(unit.additionalProperties, false);
  assert.deepEqual([...unit.required].sort(), ['name', 'topics']);
  assert.equal(unit.properties.topics.type, 'array');
  assert.equal(unit.properties.topics.minItems, 1);
  assert.equal(topic.additionalProperties, false);
  assert.deepEqual(topic.required, ['name']);
  for (const name of [unit.properties.name, topic.properties.name]) {
    assert.equal(name.type, 'string');
    assert.equal(name.minLength, 1); assert.equal(name.maxLength, 120);
  }
  assert.equal(schema.properties.warnings.type, 'array');
  assert.equal(schema.properties.warnings.uniqueItems, true);
  assert.deepEqual(schema.properties.warnings.items.enum, ['PARTIAL_STRUCTURE', 'DOCX_IMAGES_OMITTED']);
}

test('Gemini accepts the dispatched schema while all remaining structural restrictions survive', async () => {
  const expected = curriculum();
  let rejectedMaxItems = false;
  const { adapter, calls } = fixture(expected, schema => {
    assertRemainingSchema(schema);
    rejectedMaxItems = containsMaxItems(schema);
    if (rejectedMaxItems) throw Object.assign(new Error('Synthetic Gemini 400: unsupported maxItems'), { status: 400 });
  });
  let result;
  await assert.doesNotReject(async () => { result = await adapter.extractStudyPlan(input()); },
    'Gemini must accept the actual responseJsonSchema; recursive maxItems triggers synthetic HTTP 400');
  assert.equal(rejectedMaxItems, false);
  assert.equal(calls.length, 1);
  assert.deepEqual(result, { json: expected, inputTokens: 599, outputTokens: 141 });
});

const invalidOutputs = [
  ['101 units', () => ({ units: units(101, 1), warnings: [] })],
  ['101 topics in one unit', () => ({ units: units(1, 101), warnings: [] })],
  ['501 topics overall', () => ({ units: [...units(5, 100), ...units(1, 1)], warnings: [] })],
  ['121 Unicode code points in unit name', () => {
    const value = curriculum(); value.units[0].name = '🦊'.repeat(121); return value;
  }],
  ['121 Unicode code points in topic name', () => {
    const value = curriculum(); value.units[0].topics[0].name = '🦊'.repeat(121); return value;
  }],
  ['more than two warnings', () => ({ ...curriculum(),
    warnings: ['PARTIAL_STRUCTURE', 'DOCX_IMAGES_OMITTED', 'PARTIAL_STRUCTURE'] })],
  ['duplicate warnings', () => ({ ...curriculum(), warnings: ['PARTIAL_STRUCTURE', 'PARTIAL_STRUCTURE'] })],
];
for (const [scenario, build] of invalidOutputs) {
  test(`Local validation rejects ${scenario} after exactly one generation`, async () => {
    const { adapter, calls } = fixture(build());
    await assert.rejects(adapter.extractStudyPlan(input()), { code: 'INVALID_AI_OUTPUT' });
    assert.equal(calls.length, 1);
  });
}

test('Local validation accepts 100 units, 500 topics, 120 Unicode code points and both distinct warnings', async () => {
  const expected = { units: units(100, 5), warnings: ['PARTIAL_STRUCTURE', 'DOCX_IMAGES_OMITTED'] };
  expected.units[0].name = '🦊'.repeat(120);
  expected.units[0].topics[0].name = '🦊'.repeat(120);
  const { adapter, calls } = fixture(expected);
  const result = await adapter.extractStudyPlan(input());
  assert.deepEqual(result.json, expected);
  assert.equal(calls.length, 1);
});
