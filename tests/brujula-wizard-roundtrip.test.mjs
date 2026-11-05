import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClassroomPlan, formatClassroomPlan, prepareClassroomPlan } from '../apps/classrooms-ui/WizardPlanText.ts';

test('formatear y editar el plan preserva nombres arbitrarios y temas que empiezan con Unidad', () => {
  const units = [
    { name: 'Medidas', topics: [{ name: 'Unidad de longitud' }, { name: 'Unidad 2' }, { name: '- Tema con guion' }, { name: '• Tema con viñeta' }] },
    { name: 'Unidad: nombres con dos puntos', topics: [{ name: 'Unidad: tema que parece encabezado' }, { name: 'Razón · proporción: “casos”' }] },
    { name: 'Unidad 3 · Geometría', topics: [{ name: 'Ángulos' }] },
  ];
  assert.deepEqual(parseClassroomPlan(formatClassroomPlan(units)), units);
  assert.deepEqual(parseClassroomPlan(prepareClassroomPlan(formatClassroomPlan(units))), units);
});

test('sintaxis manual explícita y numerada conservan temas ambiguos sin inventar contenido', () => {
  assert.deepEqual(parseClassroomPlan('Unidad: Medidas\n- Unidad de longitud\n- Unidad 2\n- - Tema'), [
    { name: 'Medidas', topics: [{ name: 'Unidad de longitud' }, { name: 'Unidad 2' }, { name: '- Tema' }] },
  ]);
  assert.deepEqual(parseClassroomPlan('Unidad 1 · Medidas\nUnidad de longitud\n- Unidad 2'), [
    { name: 'Unidad 1 · Medidas', topics: [{ name: 'Unidad de longitud' }, { name: 'Unidad 2' }] },
  ]);
  assert.deepEqual(parseClassroomPlan('Unidad: Incompleta\n-'), [{ name: 'Incompleta', topics: [{ name: '' }] }]);
});
