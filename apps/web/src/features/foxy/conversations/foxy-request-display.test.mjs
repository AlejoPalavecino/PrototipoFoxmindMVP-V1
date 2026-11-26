import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from '../../../../../../tests/helpers/load-ts-module.mjs';

test('a quiz request shows the teacher words and a readable label instead of the internal prefix', () => {
  const { foxyRequestDisplay } = loadTsModule('apps/web/src/features/foxy/conversations/foxy-request-display.ts');
  assert.deepEqual(foxyRequestDisplay('Prepará un quiz interactivo de 5 preguntas.\nCuestionario sobre la fotosíntesis.'),
    { label: 'Quiz · 5 preguntas', text: 'Cuestionario sobre la fotosíntesis.' });
  assert.deepEqual(foxyRequestDisplay('Prepará un quiz interactivo de 1 pregunta.\nMitosis'), { label: 'Quiz · 1 pregunta', text: 'Mitosis' });
  assert.deepEqual(foxyRequestDisplay('¿Cómo explico la fotosíntesis?'), { label: null, text: '¿Cómo explico la fotosíntesis?' });
});

test('a quiz in another format names it in the label and hides the format line from the teacher words', () => {
  const { foxyRequestDisplay } = loadTsModule('apps/web/src/features/foxy/conversations/foxy-request-display.ts');
  assert.deepEqual(foxyRequestDisplay('Prepará un quiz interactivo de 4 preguntas.\nFormato: verdadero o falso.\nMitosis'),
    { label: 'Quiz · 4 preguntas · Verdadero o falso', text: 'Mitosis' });
  assert.deepEqual(foxyRequestDisplay('Prepará un quiz interactivo de 6 preguntas.\nFormato: mixto, opción múltiple y verdadero o falso.\nMeiosis'),
    { label: 'Quiz · 6 preguntas · Mixto', text: 'Meiosis' });
});
