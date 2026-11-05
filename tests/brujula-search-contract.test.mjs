import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrujulaSearchQuery, parseBrujulaSearchPage, brujulaSearchHref } from '../src/core/domain/brujula-search.ts';

const id = '11111111-1111-4111-8111-111111111111';
test('la consulta global acota texto y rechaza autoridad, duplicados y cursores arbitrarios', () => {
  assert.deepEqual(parseBrujulaSearchQuery(new URLSearchParams('q=Biolog%C3%ADa')), { q: 'biologia', cursor: null });
  assert.deepEqual(parseBrujulaSearchQuery(new URLSearchParams()), { q: '', cursor: null });
  for (const query of ['q=a&q=b', 'q='+ 'a'.repeat(121), 'actor='+id, 'limit=100', 'cursor=forged', 'q=%00']) assert.throws(() => parseBrujulaSearchQuery(new URLSearchParams(query)));
});
test('resultados validan destinos exactos y no aceptan campos privados ni URL libre', () => {
  const item = { id, kind: 'topic', title: 'Célula', classroomId: id, classroomName: 'Biología', division: 'A', target: { kind: 'classroom', classroomId: id, section: 'plan', topicId: id } };
  assert.deepEqual(parseBrujulaSearchPage({ items: [item], nextCursor: null }).items[0], item);
  assert.match(brujulaSearchHref(item.target), /destino=classroom&section=plan&topicId=/);
  for (const bad of [{ ...item, aiGradingRubric: 'privado' }, { ...item, target: { href: 'https://external.test' } }, { ...item, target: { kind: 'classroom', classroomId: id, section: 'settings' } }]) assert.throws(() => parseBrujulaSearchPage({ items: [bad], nextCursor: null }));
});
