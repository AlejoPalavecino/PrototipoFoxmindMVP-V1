import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as legacy from '../../../mockData';
import { sharedActivities as importedActivities } from '../../../mockData';

// These assertions run against mockData before and unchanged after ownership migration.
test('activity fixtures retain complete values and order', () => {
  assert.deepEqual(legacy.sharedActivities, [
    {
      id: 1,
      title: 'Ensayo: Vanguardias Literarias',
      type: 'Evaluación',
      status: 'Activa',
      due: 'Mañana',
      submissions: '23/28',
      description: 'Lee los manifiestos adjuntos de Vicente Huidobro y Guillermo de Torre. Luego, redacta un breve ensayo (max. 500 palabras) comparando cómo cada movimiento aborda la creación de imágenes poéticas.',
      longInstructions: [
        { title: 'Lectura y Análisis', content: 'Debes leer cuidadosamente el "Manifiesto Non Serviam" de Huidobro y "Hélices" de Guillermo de Torre. Toma nota de los conceptos principales sobre la creación poética.' },
        { title: 'Estructura del Ensayo', content: 'El ensayo debe estructurarse en tres partes: una breve introducción presentando ambos movimientos, el cuerpo principal donde contrastarás las ideas de los autores, y la conclusión personal.' },
        { title: 'Extensión y Formato', content: 'El ensayo debe tener entre 300 y 500 palabras. Utiliza fuente tipográfica legible.' },
        { title: 'Citas y Referencias', content: 'Al menos debes incorporar dos citas textuales de cada autor para respaldar tus argumentos.' },
      ],
      attachment: { name: 'Instrucciones_Ensayo.pdf', size: '2.4 MB', url: '#' },
    },
    { id: 2, title: 'Foro: El Boom Latinoamericano', type: 'Participación', status: 'Activa', due: 'En 3 días', submissions: '15/28', description: 'Participa en el foro debatiendo sobre el impacto del Realismo Mágico en la literatura europea. Debes comentar al menos a dos compañeros.', longInstructions: [] },
    { id: 3, title: 'Cuestionario: Modernismo', type: 'Práctica', status: 'Cerrada', due: 'Semana pasada', submissions: '28/28', description: 'Cuestionario de opción múltiple sobre las características principales del Modernismo y la obra de Rubén Darío.', longInstructions: [] },
  ]);
});

test('legacy replacement is synchronous and keeps the exact array and live import', () => {
  const original = legacy.sharedActivities;
  const replacement = original.map(act => act.id === 1 ? { ...act, title: 'Título editado' } : act);
  try {
    assert.equal(legacy.updateSharedActivities(replacement), undefined);
    assert.strictEqual(legacy.sharedActivities, replacement);
    assert.strictEqual(importedActivities, replacement);
    assert.notStrictEqual(original, replacement);
    assert.equal(original[0].title, 'Ensayo: Vanguardias Literarias');
    assert.strictEqual(replacement[1], original[1]);
  } finally {
    legacy.updateSharedActivities(original);
  }
});

test('legacy replacement accepts empty and reordered arrays without merging', () => {
  const original = legacy.sharedActivities;
  try {
    const empty: typeof original = [];
    legacy.updateSharedActivities(empty);
    assert.strictEqual(importedActivities, empty);
    const reordered = [original[2], original[0]];
    legacy.updateSharedActivities(reordered);
    assert.strictEqual(importedActivities, reordered);
    assert.deepEqual(importedActivities.map(act => act.id), [3, 1]);
  } finally {
    legacy.updateSharedActivities(original);
  }
});

test('legacy reads expose record and nested references, not snapshots', () => {
  assert.strictEqual(importedActivities, legacy.sharedActivities);
  assert.strictEqual(importedActivities[0].longInstructions, legacy.sharedActivities[0].longInstructions);
  const original = legacy.sharedActivities;
  const replacement = [...original];
  try {
    legacy.updateSharedActivities(replacement);
    assert.strictEqual(importedActivities[0], original[0]);
    assert.strictEqual(importedActivities[0].attachment, original[0].attachment);
  } finally {
    legacy.updateSharedActivities(original);
  }
});

test('legacy assignment-style prepend keeps old snapshot and remaining order', () => {
  const original = legacy.sharedActivities;
  const assigned = { ...original[0], id: 99, title: 'Asignada desde copilot' };
  const next = [assigned, ...importedActivities];
  try {
    legacy.updateSharedActivities(next);
    assert.strictEqual(importedActivities, next);
    assert.deepEqual(importedActivities.map(act => act.id), [99, 1, 2, 3]);
    assert.deepEqual(original.map(act => act.id), [1, 2, 3]);
    assert.strictEqual(importedActivities[1], original[0]);
  } finally {
    legacy.updateSharedActivities(original);
  }
});
