import test from 'node:test';
import assert from 'node:assert/strict';
import { foxyQuizBrief, foxyQuizFormat, foxyQuizQuestionCount, foxyQuizRequest } from '../src/core/domain/foxy/foxy-quiz.ts';
import { foxyQuizInstruction, foxyQuizResponseSchema } from '../apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-prompt.ts';

test('el pedido de quiz lleva su formato sin romper la cantidad ni el texto del docente', () => {
  const choice = foxyQuizRequest(5, 'Mitosis para 2.º año');
  assert.equal(choice, 'Prepará un quiz interactivo de 5 preguntas.\nMitosis para 2.º año', 'opción múltiple conserva el pedido histórico');
  assert.equal(foxyQuizFormat(choice), 'CHOICE');
  for (const format of ['TRUE_FALSE', 'MIXED']) {
    const request = foxyQuizRequest(1, 'Fases de la mitosis', format);
    assert.equal(foxyQuizQuestionCount(request), 1);
    assert.equal(foxyQuizFormat(request), format);
    assert.equal(foxyQuizBrief(request), 'Fases de la mitosis', 'volver a preparar recupera sólo la idea del docente');
  }
  assert.equal(foxyQuizFormat('Formato: verdadero o falso.\nSin pedido de quiz'), 'CHOICE', 'el formato sólo cuenta en un pedido de quiz');
});

test('verdadero o falso exige dos opciones en el esquema y lo explica al modelo; mixto sólo lo explica', () => {
  const options = schema => schema.properties.quiz.anyOf[0].properties.questions.items.properties.options;
  assert.deepEqual([options(foxyQuizResponseSchema(3)).minItems, options(foxyQuizResponseSchema(3)).maxItems], [2, 5]);
  assert.deepEqual([options(foxyQuizResponseSchema(3, 'TRUE_FALSE')).minItems, options(foxyQuizResponseSchema(3, 'TRUE_FALSE')).maxItems], [2, 2]);
  assert.deepEqual([options(foxyQuizResponseSchema(3, 'MIXED')).minItems, options(foxyQuizResponseSchema(3, 'MIXED')).maxItems], [2, 5]);
  assert.match(foxyQuizInstruction(3, 'TRUE_FALSE'), /«Verdadero» and «Falso»/);
  assert.match(foxyQuizInstruction(3, 'MIXED'), /true-or-false/);
  assert.doesNotMatch(foxyQuizInstruction(3), /Verdadero/);
});
