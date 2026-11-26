import test from 'node:test';
import assert from 'node:assert/strict';
import { studyFolderProgress } from '../src/core/domain/study/progress.ts';

const topics = [{ id: 'luz', title: 'Luz' }, { id: 'contraste', title: 'Contraste' }, { id: 'apertura', title: 'Apertura' }];

test('el avance cuenta temas de la carpeta con evidencia puntuada, sin inventar dominio', () => {
  assert.deepEqual(studyFolderProgress(topics, []), { topics: 3, practicedTopics: 0 });
  assert.deepEqual(studyFolderProgress([], [{ topicId: 'luz', score: 1 }]), { topics: 0, practicedTopics: 0 }, 'un tema borrado no suma');
  const progress = studyFolderProgress(topics, [
    { topicId: 'luz', score: 1 }, { topicId: 'luz', score: 1 },
    { topicId: 'contraste', score: 0.5 }, { topicId: 'contraste', score: 0 },
    { topicId: 'apertura', score: null }, { topicId: 'borrado', score: 0 },
  ]);
  assert.equal(progress.topics, 3);
  assert.equal(progress.practicedTopics, 2, 'el desarrollo sin puntaje no cuenta como practicado');
  assert.deepEqual(progress.weakestTopic, { id: 'contraste', title: 'Contraste' });
});

test('el tema más flojo sólo aparece cuando hay uno por debajo del dominio logrado', () => {
  // Mismo umbral que el riel: promedio de 0,8 o más es «logrado».
  assert.equal(studyFolderProgress(topics, [{ topicId: 'luz', score: 1 }, { topicId: 'contraste', score: 0.8 }]).weakestTopic, undefined);
  assert.deepEqual(studyFolderProgress(topics, [{ topicId: 'luz', score: 0.6 }, { topicId: 'contraste', score: 0.4 }]).weakestTopic,
    { id: 'contraste', title: 'Contraste' });
  // Empates: gana el primero en el orden de la carpeta.
  assert.deepEqual(studyFolderProgress(topics, [{ topicId: 'contraste', score: 0 }, { topicId: 'luz', score: 0 }]).weakestTopic,
    { id: 'luz', title: 'Luz' });
});
