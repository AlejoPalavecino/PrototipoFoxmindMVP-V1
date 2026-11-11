import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('Biblioteca publishes FILE and TEXT through explicit modes and never treats a description as an attachment', async () => {
  const { Library } = loadTsModule('apps/web/src/features/materials/ui/Library.tsx');
  const publications = [], uploads = [];
  let failRefresh = false;
  const view = hookView(Library, {
    room: { id: 'aula', revision: '1', role: 'teacher', units: [] }, reload: async () => { if (failRefresh) throw new Error('Timeout en la lectura'); },
    openUpload: true, api: {
      call: async (_path, method, request) => { if (method === 'POST') publications.push(request.operation); return []; },
      uploadClassroom: async (_room, file) => { uploads.push(file); return { id: 'approved', ready: true }; },
    },
  });
  const find = predicate => descendants(view.tree, predicate);
  const form = () => find(node => node.type?.name === 'MaterialForm')[0].props;
  const save = () => form().onSave;
  const metadata = { title: 'Lectura', body: 'Una explicación', unitId: null, topicId: null };
  try {
    await view.flush();
    const fileMode = () => find(node => node.type === 'button' && node.props['aria-label'] === 'Subir archivo')[0];
    const textMode = () => find(node => node.type === 'button' && node.props['aria-label'] === 'Escribir material')[0];
    assert.equal(fileMode()?.props['aria-pressed'], true);
    await save()(metadata); await view.flush();
    assert.deepEqual(uploads, []); assert.deepEqual(publications, []);
    form().onDraft({ ...metadata, title: 'Archivo preparado' }); await view.flush();
    textMode().props.onClick(); await view.flush();
    assert.equal(form().draft.title, '');
    form().onDraft(metadata); await view.flush();
    fileMode().props.onClick(); await view.flush();
    assert.equal(form().draft.title, 'Archivo preparado');
    textMode().props.onClick(); await view.flush();
    assert.equal(form().draft.body, 'Una explicación');
    assert.equal(textMode().props['aria-pressed'], true);
    assert.equal(find(node => node.type === 'input' && node.props.type === 'file').length, 0);
    await save()(metadata); await view.flush();
    assert.equal(uploads[0].name, 'material.docx');
    assert.deepEqual(publications, [{ action: 'publish', fileId: 'approved', ...metadata, contentKind: 'TEXT' }]);
    const add = find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.includes('Agregar material'))[0];
    add.props.onClick(); await view.flush();
    const attachment = new File(['archivo original'], 'guia.pdf');
    find(node => node.type === 'input' && node.props.type === 'file')[0].props.onChange({ target: { files: [attachment], value: '' } });
    await view.flush();
    failRefresh = true;
    await save()(metadata); await view.flush();
    assert.equal(uploads[1], attachment);
    assert.deepEqual(publications[1], { action: 'publish', fileId: 'approved', ...metadata, contentKind: 'FILE' });
    assert.equal(find(node => node.type?.name === 'MaterialForm').length, 0, 'a confirmed publication closes even when the refresh fails');
    assert.ok(find(node => node.type?.name === 'Notice' && node.props.error).length);
  } finally { view.close(); }
});
