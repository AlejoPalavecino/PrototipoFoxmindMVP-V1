import assert from 'node:assert/strict';
import test from 'node:test';
import { readTeacherLessonPhase, readTeacherRubric, teacherTextSections, writeTeacherRubric } from './teacher-planning-model.ts';

test('the rubric editor retains the objective, weights, levels and edited evidence', () => {
  const generated = [
    '## Objetivo', 'Distinguir metafase y anafase.', '',
    '## Representación (60 %)', '- **Logrado:** Dibuja ambas fases.', '- **En proceso**: Confunde las fases.', '', '---', '',
    '## Argumentación (40 %)', '- **Logrado**: Explica los dos dibujos.', '- **En proceso:** Describe un dibujo.',
  ].join('\n');
  const parsed = readTeacherRubric(generated);
  assert.equal(parsed.introduction, '## Objetivo\n\nDistinguir metafase y anafase.');
  assert.equal(parsed.criteria[0].title, 'Representación (60 %)');
  assert.equal(parsed.criteria[1].levels[1].label, 'En proceso');
  parsed.criteria[1].levels[1].description = 'Describe sólo el dibujo de metafase.';
  assert.deepEqual(readTeacherRubric(writeTeacherRubric(parsed)), parsed);
});

test('lesson minutes remain visible for headings with a phase subtitle', () => {
  assert.deepEqual(readTeacherLessonPhase('Inicio · 5 minutos'), { title: 'Inicio', minutes: '5 minutos' });
  assert.deepEqual(readTeacherLessonPhase('Desarrollo (18 minutos): Modelado y práctica'), { title: 'Desarrollo · Modelado y práctica', minutes: '18 minutos' });
  assert.equal(readTeacherLessonPhase('Materiales necesarios'), undefined);
});

test('free-form resources use the editor fallback rather than dropping unmatched content', () => {
  assert.equal(readTeacherRubric('## Criterio\n- Logrado: correcto\nNota libre'), undefined);
  assert.deepEqual(teacherTextSections('Objetivo\n\n## Inicio · 5 minutos\nPreguntá por las fases.\n\n## Cierre · 3 minutos\nEntregan una respuesta.').map(section => section.heading),
    ['', 'Inicio · 5 minutos', 'Cierre · 3 minutos']);
});
