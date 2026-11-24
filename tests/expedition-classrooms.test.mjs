import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { appStylesheets } from './helpers/global-style-fixture.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';

const textOf = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children);
const sheet = name => {
  const path = appStylesheets().find(item => item.endsWith(name));
  assert.ok(path, `${name} debe formar parte de la cascada real`);
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
};
const selectorsOf = css => [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));
export function assertAnchored(css) {
  const selectors = selectorsOf(css);
  assert.ok(selectors.length > 10);
  for (const selector of selectors) {
    let depth = 0, part = '';
    for (const char of `${selector},`) {
      if (char === '(') depth++; if (char === ')') depth--;
      if (char === ',' && depth === 0) { assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme /, part.trim()); part = ''; } else part += char;
    }
  }
}
const sources = dir => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? sources(path) : /\.(tsx?|mjs)$/.test(name) ? [path] : []; });

test('Mis aulas: la hoja Expedición de la lista está en la cascada y cada regla se ancla con el id raíz duplicado', () => {
  assertAnchored(sheet('expedition-classrooms.css'));
});

test('Mis aulas: el contador de cada pestaña centra su número dentro del círculo', () => {
  const css = sheet('expedition-classrooms.css');
  const rule = css.match(/\.collection-toolbar \.collection-count \{([^}]*)\}/)?.[1] ?? '';
  for (const declaration of [/display:\s*inline-grid/, /place-items:\s*center/, /\/1 var/, /height:\s*24px/]) assert.match(rule, declaration);
});

test('portadas: cada una de las 7 del catálogo tiene su propia ilustración y las claves heredadas conservan un equivalente', () => {
  const { learningCover } = loadTsModule('apps/shared-ui/parity-assets.ts');
  const { coverCatalog } = loadTsModule('apps/shared-ui/academic-cover.tsx');
  assert.equal(coverCatalog.length, 7);
  const images = coverCatalog.map(cover => learningCover(cover.key));
  assert.equal(new Set(images).size, 7, 'ninguna portada repite imagen');
  for (const image of images) assert.ok(existsSync(join('apps/web/public', image)), image);
  assert.equal(learningCover('create'), learningCover('creative'));
  assert.equal(learningCover('explore'), learningCover('general'));
  assert.equal(learningCover(undefined), learningCover('general'));
});

test('borradores: un solo nombre, «Borrador», con el paso visible y sin «pendiente» en acciones', () => {
  const { PendingClassroomCard } = loadTsModule('apps/web/src/features/classrooms/collection/PendingClassroomCard.tsx');
  const card = PendingClassroomCard({ draft: { id: 'd', revision: '1', publishedClassroomId: null, payload: { name: 'Química', subject: 'Química', division: '6.° A', wizardStep: 1 } },
    busy: false, onContinue() {}, onDelete() {} });
  const text = textOf(card);
  assert.match(text, /Borrador/); assert.match(text, /Paso 2 de 4/);
  assert.ok(descendants(card, node => node.props?.['aria-label'] === 'Eliminar borrador Química').length);
  const leftovers = sources('apps/web/src').filter(path => /Eliminar pendiente|eliminar el pendiente|Pendiente de creación/.test(readFileSync(path, 'utf8')));
  assert.deepEqual(leftovers, []);
});

test('asistente: la hoja Expedición está en la cascada, anclada, y el tilde de la portada elegida no desplaza su nombre', () => {
  const css = sheet('expedition-wizard.css');
  assertAnchored(css);
  assert.match(css, /\.class-cover-option:has\(input:checked\) svg \{[^}]*position: absolute/);
});

test('interior del aula: la hoja está en la cascada y suma #classroom-main al anclaje para ganarle a las hojas del aula', () => {
  const css = sheet('expedition-room.css');
  assertAnchored(css);
  for (const selector of selectorsOf(css)) assert.match(selector, /^#foxmind-product#foxmind-product\.fm3d-theme #classroom-main /, selector);
  // Una regla heredada oculta el ::before del encabezado; el banner necesita mostrarlo para oscurecer la portada.
  assert.match(css, /\.parity-room-header::before \{[^}]*display: block/);
});

test('interior del aula: el encabezado conserva identidad, accesos y acción por rol sobre la portada', () => {
  const { ClassroomHeader } = loadTsModule('apps/web/src/features/classrooms/workspace/ClassroomHeader.tsx');
  const room = role => ({ id: 'r', name: 'Biología 3.° B', subject: 'Biología', division: '3.° B', academicYear: 2026, timezone: 'UTC', coverKey: 'biology', archived: false,
    teacher: 'Lucía Demo', role, revision: '1', studentCount: 24, units: [{ name: 'La célula', topics: [{ name: 'A', status: 'TAUGHT' }, { name: 'B', status: 'PENDING' }] }], plans: [] });
  const teacher = ClassroomHeader({ room: room('teacher'), pendingCount: 5 });
  assert.equal(descendants(teacher, node => node.type === 'img')[0].props.src, '/foxmind-3d/covers/biology-640.webp');
  assert.match(textOf(teacher), /5por revisar/); assert.match(textOf(teacher), /1 \/ 2temas trabajados/);
  assert.ok(descendants(teacher, node => node.props?.['aria-label'] === 'Invitar estudiantes').length);
  assert.ok(descendants(ClassroomHeader({ room: room('student') }), node => node.props?.['aria-label'] === 'Mi progreso').length);
});
