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
  const node = descendants(view.tree, n => n.type === 'select' && n.props['aria-label'] === label)[0];
  assert.ok(node, `${label} select is available`); return node;
}
const cards = view => descendants(view.tree, n => n.type?.name === 'ClassroomCard');
async function setup(search = '') {
  const entered = [], searched = [], fixture = data();
  const { ClassroomCollection } = loadTsModule('apps/web/src/features/classrooms/ui/ClassroomCollection.tsx');
  const view = collectionView(ClassroomCollection, { ...fixture, search, onEnter: id => entered.push(id), onSearch: value => searched.push(value) });
  await view.flush(); return { view, entered, searched, fixture };
}

test('el catálogo ofrece sólo tabs y búsqueda aprobados y conserva entrada exacta', async () => {
 const {view,entered,searched,fixture}=await setup(); const before=structuredClone(fixture);
 try {
  assert.equal(button(view,'Filtros'),undefined);
  assert.equal(button(view,'Vista de lista'),undefined);
  assert.equal(button(view,'Vista de tarjetas'),undefined);
  assert.equal(descendants(view.tree,n=>n.type==='select').length,0);
  button(view,'Archivadas').props.onClick(); await view.flush();
  assert.deepEqual(cards(view).map(n=>n.props.room.id),['old']);
  const input=descendants(view.tree,n=>n.type==='input'&&n.props.type==='search')[0];
  input.props.onChange({target:{value:'Historia'}}); assert.deepEqual(searched,['Historia']);
  button(view,'Activas').props.onClick(); await view.flush();
  for(const card of cards(view)) descendants(card.type(card.props),n=>n.type==='a')[0].props.onClick({button:0,preventDefault(){}});
  assert.deepEqual(entered,['student','teacher']); assert.deepEqual(fixture,before);
 } finally {view.close();}
});
