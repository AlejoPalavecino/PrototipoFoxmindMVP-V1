import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const domain = () => import('./index.ts');
const general = { kind: 'GENERAL' };
const classroom = { kind: 'CLASSROOM', classroomId: randomUUID() };
const invalid = (fn) => assert.throws(fn, { code: 'INVALID_INPUT', message: 'INVALID_INPUT' });
const start = (changes = {}) => ({ requestId: randomUUID(), revision: '4', kind: 'DIAGRAM', prompt: 'Mostrá la fotosíntesis',
  selection: { topicIds: [], sourceIds: [] }, aspectRatio: '1:1', ...changes });
const diagram = (changes = {}) => ({ schemaVersion: 'foxy-diagram-v1', title: 'Fotosíntesis',
  nodes: [{ id: 'light', label: 'Luz' }, { id: 'plant', label: 'Planta' }],
  edges: [{ from: 'light', to: 'plant', label: 'absorbe' }], direction: 'TOP_DOWN', description: 'Luz hacia planta', ...changes });
function exact(parse, value) {
  invalid(() => parse({ ...value, extra: true }));
  for (const key of Object.keys(value)) { const changed = { ...value }; delete changed[key]; invalid(() => parse(changed)); }
}

test('visual start accepts both kinds and aspect ratios, with context-scoped selection', async () => {
  const { parseStartFoxyVisual: parse } = await domain();
  assert.equal(typeof parse, 'function');
  for (const kind of ['DIAGRAM', 'IMAGE']) for (const aspectRatio of ['1:1', '4:3', '3:4', '16:9']) {
    const request = start({ kind, aspectRatio });
    assert.deepEqual(parse(request, general), request);
  }
  const request = start({ selection: { topicIds: [randomUUID()], sourceIds: [`plan:${randomUUID()}`, `activity:${randomUUID()}`] } });
  assert.deepEqual(parse(request, classroom), request);
});

test('visual start rejects invalid fields, overlong prompt and cross-context selection', async () => {
  const { parseStartFoxyVisual: parse } = await domain();
  const value = start();
  const wrapper = candidate => parse(candidate, general);
  exact(wrapper, value);
  for (const bad of [null, [], { ...value, context: classroom }, { ...value, requestId: 'invalid' },
    { ...value, revision: 4 }, { ...value, revision: '-1' }, { ...value, revision: '1\n' },
    { ...value, revision: '9223372036854775808' }, { ...value, kind: 'OTHER' },
    { ...value, prompt: '' }, { ...value, prompt: ' ' }, { ...value, prompt: '🦊'.repeat(5001) },
    { ...value, prompt: 'a\u0000b' }, { ...value, aspectRatio: '9:16' },
    { ...value, selection: { topicIds: [randomUUID()], sourceIds: [] } },
    { ...value, selection: { topicIds: [], sourceIds: [`material:${randomUUID()}`] } }]) invalid(() => wrapper(bad));
  assert.equal(parse(start({ prompt: '🦊'.repeat(5000), revision: '9223372036854775807' }), general).prompt, '🦊'.repeat(5000));
});

test('visual start validates source and topic selection with F0 limits', async () => {
  const { parseStartFoxyVisual: parse } = await domain();
  const topic = randomUUID(), material = randomUUID();
  const topics = Array.from({ length: 100 }, () => randomUUID());
  const docs = Array.from({ length: 6 }, () => `material:${randomUUID()}`);
  const activities = Array.from({ length: 14 }, () => `activity:${randomUUID()}`);
  const selection = { topicIds: topics, sourceIds: [...docs, ...activities] };
  assert.deepEqual(parse(start({ selection }), classroom).selection, selection);
  for (const bad of [
    { topicIds: [...topics, randomUUID()], sourceIds: [] }, { topicIds: [topic, topic.toUpperCase()], sourceIds: [] },
    { topicIds: [], sourceIds: [`material:${material}`, `material:${material.toUpperCase()}`] },
    { topicIds: [], sourceIds: [...docs, `plan:${randomUUID()}`] },
    { topicIds: [], sourceIds: [...selection.sourceIds, `activity:${randomUUID()}`] },
    { topicIds: ['invalid'], sourceIds: [] }, { topicIds: [], sourceIds: ['file:invalid'] },
    { topicIds: [], sourceIds: [], extra: true }, { topicIds: null, sourceIds: [] }
  ]) invalid(() => parse(start({ selection: bad }), classroom));
});

test('diagram requires an exact structured graph and valid direction', async () => {
  const { parseFoxyDiagram: parse } = await domain();
  assert.equal(typeof parse, 'function');
  const value = diagram();
  assert.deepEqual(parse(value), value);
  const horizontal = diagram({ direction: 'LEFT_RIGHT' });
  assert.deepEqual(parse(horizontal), horizontal);
  exact(parse, value);
  for (const bad of [null, [], { ...value, schemaVersion: 'foxy-diagram-v2' }, { ...value, title: '' },
    { ...value, title: 'x'.repeat(201) }, { ...value, direction: 'DOWN' },
    { ...value, nodes: null }, { ...value, edges: null }, { ...value, description: null },
    { ...value, nodes: [{ ...value.nodes[0], extra: true }, value.nodes[1]] },
    { ...value, nodes: [{ label: 'Luz' }, value.nodes[1]] },
    { ...value, edges: [{ ...value.edges[0], extra: true }] },
    { ...value, edges: [{ from: 'light', to: 'plant' }] }]) invalid(() => parse(bad));
});

test('diagram bounds nodes and edges and rejects duplicate IDs and dangling references', async () => {
  const { parseFoxyDiagram: parse } = await domain();
  const nodes = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, label: `Nodo ${i}` }));
  const edges = Array.from({ length: 60 }, (_, i) => ({ from: nodes[i % 30].id, to: nodes[(i + 1 + Math.floor(i / 30)) % 30].id, label: 'conecta' }));
  const value = diagram({ nodes, edges });
  assert.deepEqual(parse(value), value);
  for (const bad of [
    { ...value, nodes: [...nodes, { id: 'n30', label: 'Extra' }] },
    { ...value, edges: [...edges, { from: 'n0', to: 'n1', label: 'extra' }] },
    diagram({ nodes: [{ id: 'same', label: 'A' }, { id: 'same', label: 'B' }], edges: [] }),
    diagram({ edges: [{ from: 'missing', to: 'plant', label: 'x' }] }),
    diagram({ edges: [{ from: 'light', to: 'missing', label: 'x' }] })
  ]) invalid(() => parse(bad));
});
