import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';
import { collectionView } from './helpers/classrooms-reference/collection-view.mjs';
const text = n => typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : n?.props ? text(n.props.children) : '';
const room = (id, extra = {}) => ({ id, role: 'teacher', name: id, subject: 'Ciencias', division: 'A', academicYear: 2026, timezone: 'UTC', coverKey: 'biology', teacher: 'Ada', revision: '1', archived: false, ...extra });
const button = (v, label) => descendants(v.tree, n => n.type === 'button').find(n => n.props['aria-label'] === label || text(n).startsWith(label));
const ids = v => descendants(v.tree, n => n.type?.name === 'ClassroomCard').map(n => n.props.room.id);
const select = (v, label) => descendants(v.tree, n => n.type === 'select' && n.props['aria-label'] === label)[0];
test('collection starts active with authoritative counts and archived is an explicit view', async () => {
 const { ClassroomCollection } = loadTsModule('apps/web/src/features/classrooms/ui/ClassroomCollection.tsx');
 const view = collectionView(ClassroomCollection, { accountRole: 'teacher', teach: [room('current'), room('old', { archived: true })], study: [room('current', { role: 'student', archived: true })], search: '', onEnter() {} });
 try { await view.flush(); assert.deepEqual(ids(view), ['current']); assert.equal(text(button(view, 'Activas')), 'Activas 1'); assert.equal(button(view, 'Activas').props['aria-pressed'], true); assert.equal(text(button(view, 'Archivadas')), 'Archivadas 1'); button(view, 'Archivadas').props.onClick(); await view.flush(); assert.deepEqual(ids(view), ['old']); } finally { view.close(); }
});
test('búsqueda se combina con pestaña activa sin controles adicionales', async () => {
 const {ClassroomCollection}=loadTsModule('apps/web/src/features/classrooms/ui/ClassroomCollection.tsx');
 const searched=[];const view=collectionView(ClassroomCollection,{accountRole:'teacher',teach:[room('new'),room('older'),room('archived',{archived:true})],study:[],search:'older',onSearch:value=>searched.push(value),onEnter(){}});
 try {await view.flush();assert.deepEqual(ids(view),['older']);assert.equal(button(view,'Filtros'),undefined);
 const input=descendants(view.tree,n=>n.type==='input'&&n.props.type==='search')[0];input.props.onChange({target:{value:''}});assert.deepEqual(searched,['']);
 button(view,'Archivadas').props.onClick();await view.flush();assert.deepEqual(ids(view),[]);
 } finally {view.close();}
});

test('collection cards expose one entry action and subject and archive context without repeating ownership', () => {
 const { ClassroomCard } = loadTsModule('apps/web/src/features/classrooms/ui/ClassroomCollectionCard.tsx');
 const entered = [];
 for (const role of ['teacher', 'student']) {
  const card = ClassroomCard({ room: room(role, { role, archived: role === 'student' }), onEnter: id => entered.push(id) });
  const actions = descendants(card, n => n.type === 'a');
  assert.equal(actions.length, 1); actions[0].props.onClick({button:0,preventDefault(){}});
  assert.doesNotMatch(text(card), /Docente: Vos|Donde enseño|Donde estudio/);
  if (role === 'student') { assert.match(text(card), /Ciencias/); assert.match(text(card), /Archivada/); }
  else assert.doesNotMatch(text(card), /Docente:/);
 }
 assert.deepEqual(entered, ['teacher', 'student']);
});
