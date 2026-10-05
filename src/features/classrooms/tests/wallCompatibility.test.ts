import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as legacy from '../../../mockData';
import { sharedMuroPosts as importedPosts } from '../../../mockData';

// Characterization runs unchanged before and after moving the session owner.
test('wall fixtures retain complete values and order', () => {
  assert.deepEqual(legacy.sharedMuroPosts, [
    {
      id: 'post-1',
      authorName: 'Profa. Martínez',
      authorRole: 'docente',
      timestamp: 'Hoy a las 09:30',
      title: '📢 Pautas para la entrega del Ensayo de Vanguardias',
      content: 'Estimados alumnos: Recuerden que para la entrega de mañana deben incluir al menos 2 citas textuales de los manifiestos trabajados en clase (Huidobro y De Torre). Quienes tengan dudas sobre la citación pueden consultar los materiales en la Biblioteca.',
      isPinned: true,
      type: 'announcement',
      attachment: { name: 'Guia_Citacion_APA7.pdf', size: '1.2 MB', type: 'PDF' },
      likesCount: 14,
      isLiked: false,
      comments: [
        { id: 'c-1', authorName: 'Sofía Herrera', authorRole: 'alumno', timestamp: 'Hoy a las 10:15', content: '¡Gracias profe! ¿La extensión máxima sigue siendo de 500 palabras?' },
        { id: 'c-2', authorName: 'Profa. Martínez', authorRole: 'docente', timestamp: 'Hoy a las 10:20', content: 'Exactamente Sofía, entre 300 y 500 palabras. ¡Éxitos!' },
      ],
    },
    {
      id: 'post-2',
      authorName: 'Foxy Copiloto',
      authorRole: 'foxy',
      timestamp: 'Ayer a las 16:00',
      title: '✨ Nuevo material disponible en la Biblioteca',
      content: 'Se ha agregado el documento "Manual de Biología Celular y Guía de Trabajos Prácticos" a la pestaña de Biblioteca del aula para consulta libre.',
      isPinned: false,
      type: 'material_notice',
      likesCount: 9,
      isLiked: true,
      comments: [],
    },
    {
      id: 'post-3',
      authorName: 'Lucas Díaz',
      authorRole: 'alumno',
      timestamp: 'Hace 2 días',
      title: 'Consulta sobre el grupo de estudio de literatura',
      content: 'Hola a todos, armamos una sala de estudio colaborativo con Foxy para repasar el Modernismo este jueves a las 18 hs. ¡El que quiera sumarse es bienvenido!',
      isPinned: false,
      type: 'doubt',
      likesCount: 11,
      isLiked: false,
      comments: [
        { id: 'c-3', authorName: 'Valentina Gómez', authorRole: 'alumno', timestamp: 'Hace 2 días', content: '¡Me sumo! Paso el enlace por el chat de grupo.' },
      ],
    },
  ]);
});

test('legacy wall replacement is synchronous and exposes the supplied array through live imports', () => {
  const original = legacy.sharedMuroPosts;
  const replacement = original.map(post => post.id === 'post-1' ? { ...post, likesCount: 15 } : post);
  try {
    assert.equal(legacy.updateSharedMuroPosts(replacement), undefined);
    assert.strictEqual(legacy.sharedMuroPosts, replacement);
    assert.strictEqual(importedPosts, replacement);
    assert.equal(original[0].likesCount, 14);
    assert.strictEqual(replacement[1], original[1]);
    assert.strictEqual(replacement[0].comments, original[0].comments);
    assert.strictEqual(replacement[0].attachment, original[0].attachment);
  } finally {
    legacy.updateSharedMuroPosts(original);
  }
});

test('legacy wall accepts empty and reordered arrays without merging or sorting pins', () => {
  const original = legacy.sharedMuroPosts;
  try {
    const empty: typeof original = [];
    legacy.updateSharedMuroPosts(empty);
    assert.strictEqual(importedPosts, empty);
    const reordered = [original[2], original[0]];
    legacy.updateSharedMuroPosts(reordered);
    assert.strictEqual(importedPosts, reordered);
    assert.deepEqual(importedPosts.map(post => post.id), ['post-3', 'post-1']);
  } finally {
    legacy.updateSharedMuroPosts(original);
  }
});

test('legacy prepend retains existing records and leaves mounted snapshots unchanged', () => {
  const mounted = legacy.sharedMuroPosts;
  const next = [{ ...mounted[2], id: 'post-99' }, ...mounted];
  try {
    legacy.updateSharedMuroPosts(next);
    assert.strictEqual(importedPosts, next);
    assert.deepEqual(mounted.map(post => post.id), ['post-1', 'post-2', 'post-3']);
    assert.strictEqual(importedPosts[1], mounted[0]);
  } finally {
    legacy.updateSharedMuroPosts(mounted);
  }
});
