import test from 'node:test';
import assert from 'node:assert/strict';
import { homeFoxySuggestion } from '../apps/classrooms-ui/home-presentation.ts';
import { parseHomePage } from '../src/core/domain/home-rows-validation.ts';

test('Foxy suggests the first actionable delivery and ignores closed reception', () => {
  const modules = { pending: { status: 'ready', items: [
    { title: 'Cerrada', reception: 'closed' }, { title: 'Geometría', reception: 'open' }
  ] } };
  assert.match(homeFoxySuggestion('student', modules).detail, /Geometría/);
  assert.doesNotMatch(homeFoxySuggestion('student', modules).detail, /Cerrada/);
});

test('Foxy prioritizes reviews and falls back to unanswered questions', () => {
  const queries = { status: 'ready', items: [{ classroom: { name: 'Historia' } }] };
  const review = { status: 'ready', items: [{ title: 'Mapas', needsReview: 2 }] };
  assert.match(homeFoxySuggestion('teacher', { review, queries }).detail, /Mapas/);
  assert.match(homeFoxySuggestion('teacher', { review: { status: 'error' }, queries }).detail, /Historia/);
  assert.equal(homeFoxySuggestion('student', { review, queries }).title, 'Cada paso cuenta.');
});

test('Classroom summaries accept optional progress only for active teacher rooms', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const classroom = { id, name: 'Historia', division: 'A', subject: 'Historia', role: 'teacher',
    coverKey: 'general', archived: false, timeZone: 'UTC' };
  const item = { id, title: classroom.name, classroom, target: { kind: 'classroom', classroomId: id, section: 'plan' } };
  const read = row => parseHomePage('classrooms', { status: 'ready', items: [row], totalItems: 1, nextCursor: null });
  assert.deepEqual(read(item).items[0], item);
  const planProgress = { taught: 1, total: 3 };
  assert.deepEqual(read({ ...item, planProgress }).items[0].planProgress, planProgress);
  for (const patch of [{ role: 'student' }, { archived: true }]) {
    assert.throws(() => read({ ...item, classroom: { ...classroom, ...patch }, planProgress }), { code: 'INVALID_INPUT' });
  }
  assert.throws(() => read({ ...item, planProgress: { taught: 4, total: 3 } }), { code: 'INVALID_INPUT' });
});
