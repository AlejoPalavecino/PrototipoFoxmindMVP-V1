import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';
import { collectionView as hookView } from './helpers/classrooms-reference/collection-view.mjs';

const room = (id, role, name = id, subject = 'Biología', division = 'A') => ({ id, role, name, subject, division,
  academicYear: 2026, timezone: 'UTC', coverKey: 'biology', teacher: 'Synthetic', revision: '0', archived: false });
const filter = () => loadTsModule('apps/classrooms-ui/collection-filter.ts').filterClassroomCards;

test('D3 combined collection keeps stable study/teach order and teacher payload wins duplicate identity in place', () => {
  const study = [room('study', 'student'), room('both', 'student', 'Old study payload')];
  const teach = [room('both', 'teacher', 'Authoritative teacher payload'), room('teach', 'teacher')];
  assert.deepEqual(filter()(teach, study, 'all', '').map(x => [x.id, x.role, x.name]), [
    ['study', 'student', 'study'], ['both', 'teacher', 'Authoritative teacher payload'], ['teach', 'teacher', 'teach'],
  ]);
});

test('D3 study/teach filters retain exact scoped collections and search never fabricates membership', () => {
  const study = [room('study', 'student', 'Lecturas', 'Literatura', 'B')], teach = [room('teach', 'teacher', 'Números', 'Matemática', 'C')];
  assert.deepEqual(filter()(teach, study, 'study', '').map(x => x.id), ['study']);
  assert.deepEqual(filter()(teach, study, 'teach', '').map(x => x.id), ['teach']);
  assert.deepEqual(filter()(teach, study, 'all', '  literatura ').map(x => x.id), ['study']);
  assert.deepEqual(filter()(teach, study, 'all', '  C ').map(x => x.id), ['study', 'teach']);
  assert.deepEqual(filter()(teach, study, 'teach', 'Lecturas'), []);
  assert.deepEqual(filter()([], [], 'all', ''), []);
});

test('D3 search normalizes Unicode compatibility and case across name, subject and division without mutating inputs', () => {
  const study = [room('study', 'student', 'Árboles', 'ＢＩＯＬＯＧＩＡ', 'Ⅱ')], teach = [room('teach', 'teacher', 'Other', 'Other', 'Other')];
  const before = structuredClone({ study, teach });
  assert.deepEqual(filter()(teach, study, 'all', ' biologia ').map(x => x.id), ['study']);
  assert.deepEqual(filter()(teach, study, 'all', 'ii').map(x => x.id), ['study']);
  assert.deepEqual(filter()(teach, study, 'all', 'ÁRBOLES').map(x => x.id), ['study']);
  assert.deepEqual({ study, teach }, before);
});

const text = value => typeof value === 'string' || typeof value === 'number' ? String(value)
  : Array.isArray(value) ? value.map(text).join('') : value?.props ? text(value.props.children) : '';
test('D3 collection defaults to all cards and role controls filter the same scoped collection accessibly', async () => {
  const { ClassroomCollection } = loadTsModule('apps/classrooms-ui/ClassroomCollection.tsx');
  const view = hookView(ClassroomCollection, { teach: [room('teach', 'teacher')], study: [room('study', 'student')], search: '', onEnter() {} });
  try {
    await view.flush();
    const buttons = () => descendants(view.tree, node => node.type === 'button');
    const all = buttons().find(node => /Todas/.test(text(node)));
    assert.ok(all, 'All roles have one default collection'); assert.equal(all.props['aria-pressed'], true);
    assert.equal(text(all), 'Todas · 2');
    const cards = () => descendants(view.tree, node => node.type?.name === 'ClassroomCard').map(node => node.props.room.id);
    assert.deepEqual(cards(), ['study', 'teach']);
    const study = buttons().find(node => /Donde estudio/.test(text(node))); assert.ok(study);
    assert.equal(text(study), 'Donde estudio · 1');
    study.props.onClick(); await view.flush(); assert.deepEqual(cards(), ['study']);
    assert.equal(buttons().find(node => /Donde estudio/.test(text(node))).props['aria-pressed'], true);
    const teach = buttons().find(node => /Donde enseño/.test(text(node))); assert.ok(teach);
    assert.equal(text(teach), 'Donde enseño · 1');
    teach.props.onClick(); await view.flush(); assert.deepEqual(cards(), ['teach']);
  } finally { view.close(); }
});

test('D3 a search with no matches never claims the account has no memberships', async () => {
  const { ClassroomCollection } = loadTsModule('apps/classrooms-ui/ClassroomCollection.tsx');
  const view = hookView(ClassroomCollection, { teach: [room('teach', 'teacher')], study: [], search: 'no-match-unique', onEnter() {} });
  try {
    await view.flush(); assert.match(text(view.tree), /No hay coincidencias/i);
    assert.doesNotMatch(text(view.tree), /Aún no tenés aulas/i);
    assert.equal(text(descendants(view.tree, node => node.type === 'button').find(node => /Todas/.test(text(node)))), 'Todas · 1');
  } finally { view.close(); }
});
