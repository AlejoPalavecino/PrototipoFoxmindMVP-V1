import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';

test('Biblioteca: la hoja de elección está en la cascada y se ancla como el interior del aula', () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-library.css'));
  assert.ok(path, 'expedition-library.css debe formar parte de la cascada real');
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));
  assert.ok(selectors.length >= 8);
  for (const selector of selectors) assert.match(selector, /^#foxmind-product#foxmind-product\.fm3d-theme #classroom-main /, selector);
});

test('Biblioteca: el docente elige escribir un apunte y se publica como TEXT con su documento generado; los caracteres invisibles se frenan antes de subir', async () => {
  const { hookView } = await import('./agenda-ui-helpers.test.mjs');
  const { MaterialPublishing } = loadTsModule('apps/web/src/features/materials/publishing/MaterialPublishing.tsx');
  const uploads = [], changes = [];
  const api = { list: async () => [], findMaterial: async () => undefined, listActivities: async () => [],
    change: async (...args) => { changes.push(args); }, upload: async (_room, file) => { uploads.push(file); return { id: 'doc', name: file.name, ready: true, validation: 'APPROVED', scan: 'CLEAN' }; },
    fileStatus: async () => ({ id: 'doc', ready: true }), fileUrl: () => '/file' };
  const view = hookView(MaterialPublishing, { api, room: { id: 'room', revision: '1', role: 'teacher', units: [] }, reload: async () => {}, presentation: 'upload', active: true });
  const form = () => descendants(view.tree, node => node.type?.name === 'MaterialForm')[0].props;
  const radio = value => descendants(view.tree, node => node.type === 'input' && node.props.name === 'material-kind' && node.props.value === value)[0];
  try {
    await view.flush();
    assert.equal(radio('FILE').props.checked, true, 'subir un archivo sigue siendo la opción inicial');
    radio('TEXT').props.onChange(); await view.flush();
    assert.equal(form().kind, 'TEXT');
    assert.ok(descendants(view.tree, node => node.type?.name === 'Dialog' && node.props.title === 'Escribir un apunte').length);
    await form().onContinue({ title: 'Apunte', body: 'Hola\u0007', description: null, unitId: null, topicId: null, activityIds: [] }); await view.flush();
    assert.equal(uploads.length, 0, 'un cuerpo con caracteres invisibles no sube el documento');
    await form().onContinue({ title: 'Apunte', body: 'Cortá una cebolla.\n\nMirá su piel.', description: null, unitId: null, topicId: null, activityIds: [] }); await view.flush();
    assert.equal(uploads.length, 1); assert.match(uploads[0].name, /\.docx$/);
    await form().onSave({ title: 'Apunte', body: 'Cortá una cebolla.\n\nMirá su piel.', description: null, unitId: null, topicId: null, activityIds: [] }); await view.flush();
    const operation = changes.at(-1)[2];
    assert.equal(operation.action, 'publish'); assert.equal(operation.contentKind, 'TEXT'); assert.equal(operation.fileId, 'doc');
    assert.equal(uploads.length, 1, 'el mismo contenido reutiliza el documento ya subido');
  } finally { view.close(); }
});
