import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';
import { collectionView } from './helpers/classrooms-reference/collection-view.mjs';

const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
const room = (id, role, extra = {}) => ({ id, role, name: id, subject: 'Ciencias', division: 'A',
  academicYear: 2026, timezone: 'UTC', coverKey: 'biology', teacher: 'Ada Sintética',
  revision: '1', archived: false, ...extra });
const data = () => ({ teach: [room('teacher', 'teacher'), room('old', 'teacher', { archived: true, academicYear: 2025, division: 'B' })],
  study: [room('student', 'student', { division: 'C' }), room('teacher', 'student', { academicYear: 1900, division: 'Discarded' })] });
const button = (view, label) => descendants(view.tree, n => n.type === 'button')
  .find(n => n.props['aria-label'] === label || text(n).startsWith(label));
function select(view, label) {
  const wrapper = descendants(view.tree, n => n.type === 'label' && text(n).startsWith(label))[0];
  const node = wrapper && descendants(wrapper, n => n.type === 'select')[0];
  assert.ok(node, `${label} select is available`); return node;
}
const cards = view => descendants(view.tree, n => n.type?.name === 'ClassroomCard');
async function setup(search = '') {
  const entered = [], searched = [];
  const { ClassroomCollection } = loadTsModule('apps/classrooms-ui/ClassroomCollection.tsx');
  const view = collectionView(ClassroomCollection, { ...data(), search, onEnter: id => entered.push(id), onSearch: value => searched.push(value) });
  await view.flush(); return { view, entered, searched };
}

test('advanced controls derive global options and preserve criteria when closed', async () => {
  const { view } = await setup();
  try {
    const more = button(view, 'Más filtros'); assert.ok(more, 'advanced filter disclosure exists');
    assert.equal(more.props['aria-expanded'], false); assert.ok(more.props['aria-controls']);
    more.props.onClick(); await view.flush();
    assert.equal(button(view, 'Más filtros').props['aria-expanded'], true);
    const options = label => descendants(select(view, label), n => n.type === 'option').map(n => String(n.props.value));
    assert.deepEqual(options('Ciclo lectivo'), ['', '2026', '2025']);
    assert.deepEqual(options('División'), ['', 'A', 'B', 'C']);
    button(view, 'Archivadas').props.onClick(); await view.flush();
    assert.deepEqual(cards(view).map(n => n.props.room.id), ['old']);
    assert.equal(text(button(view, 'Archivadas')), 'Archivadas · 1');
    assert.match(text(view.tree), /Mostrando 1 de 3 aulas/);
    assert.deepEqual(options('Ciclo lectivo'), ['', '2026', '2025']);
    button(view, 'Más filtros').props.onClick(); await view.flush();
    assert.equal(button(view, 'Más filtros').props['aria-expanded'], false);
    assert.deepEqual(cards(view).map(n => n.props.room.id), ['old']);
    assert.equal(button(view, 'Archivadas').props['aria-pressed'], true, 'state remains visible outside the disclosure');
  } finally { view.close(); }
});

test('clearing only advanced criteria preserves state and parent-owned search', async () => {
  const { view, searched } = await setup('Ada');
  try {
    button(view, 'Archivadas').props.onClick(); await view.flush();
    const more = button(view, 'Más filtros'); assert.ok(more); more.props.onClick(); await view.flush();
    select(view, 'Ciclo lectivo').props.onChange({ target: { value: '2025' } }); await view.flush();
    select(view, 'División').props.onChange({ target: { value: 'C' } }); await view.flush();
    assert.equal(cards(view).length, 0); assert.match(text(view.tree), /No hay coincidencias/i);
    const clear = button(view, 'Limpiar filtros'); assert.ok(clear); clear.props.onClick(); await view.flush();
    assert.equal(button(view, 'Archivadas').props['aria-pressed'], true);
    assert.deepEqual(cards(view).map(n => n.props.room.id), ['old']);
    assert.equal(descendants(view.tree, n => n.type === 'input' && n.props.type === 'search')[0].props.value, 'Ada');
    assert.deepEqual(searched, [], 'clearing advanced criteria does not clear the parent search');
  } finally { view.close(); }
});

test('grid/list switches preserve result ordering and exact entry callbacks', async () => {
  const { view, entered } = await setup();
  try {
    const grid = button(view, 'Vista de tarjetas'), list = button(view, 'Vista de lista');
    assert.ok(grid); assert.ok(list); assert.equal(grid.props['aria-pressed'], true);
    assert.equal(list.props.type, 'button');
    const before = cards(view).map(n => n.props.room.id);
    list.props.onClick(); await view.flush();
    assert.equal(button(view, 'Vista de lista').props['aria-pressed'], true);
    assert.deepEqual(cards(view).map(n => n.props.room.id), before);
    for (const card of cards(view)) {
      const enter = descendants(card.type(card.props), n => n.type === 'button' && text(n).startsWith('Entrar al aula'))[0];
      assert.ok(enter); enter.props.onClick();
    }
    assert.deepEqual(entered, ['student', 'teacher']);
    button(view, 'Vista de tarjetas').props.onClick(); await view.flush();
    assert.deepEqual(cards(view).map(n => n.props.room.id), before);
  } finally { view.close(); }
});
