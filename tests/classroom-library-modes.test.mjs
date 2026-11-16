import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('Biblioteca publishes the approved file only after organization; a description never becomes an attachment', async () => {
  const { Library } = loadTsModule('apps/web/src/features/materials/ui/Library.tsx');
  const publications = [], uploads = [];
  let failRefresh = false;
  const view = hookView(Library, {
    room: { id: 'aula', revision: '1', role: 'teacher', units: [] },
    reload: async () => { if (failRefresh) throw new Error('Timeout en la lectura'); },
    api: {
      call: async (path, method, request) => { if (method === 'POST') publications.push({ path, ...request }); return []; },
      uploadClassroom: async (_room, file) => { uploads.push(file); return { id: 'approved', ready: true }; },
    },
  });
  const find = predicate => descendants(view.tree, predicate);
  const form = () => find(node => node.type?.name === 'MaterialForm')[0]?.props;
  const metadata = { title: 'Lectura', description: 'Una explicación', unitId: null, topicId: null };
  try {
    await view.flush();
    const add = find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.includes('Subir archivo'))[0];
    assert.ok(add);
    add.props.onClick();
    await view.flush();
    assert.equal(form().kind, 'FILE');
    assert.equal(form().step, 'details');
    form().onDraft(metadata);
    await view.flush();
    assert.equal(form().blocked, true);
    await form().onContinue(metadata);
    await view.flush();
    assert.equal(form().step, 'details');
    assert.deepEqual(uploads, []);
    assert.deepEqual(publications, []);

    const attachment = new File(['archivo original'], 'guia.pdf');
    const picker = find(node => node.type === 'input' && node.props['aria-label'] === 'Archivo del material')[0];
    assert.ok(picker);
    picker.props.onChange({ target: { files: [attachment], value: '' } });
    await view.flush();
    assert.equal(form().blocked, false);
    assert.equal(form().draft.description, metadata.description);
    assert.deepEqual(uploads, [attachment]);
    assert.deepEqual(publications, []);
    await form().onContinue(metadata);
    await view.flush();
    assert.equal(form().step, 'organization');
    assert.deepEqual(publications, []);

    failRefresh = true;
    await form().onSave(metadata);
    await view.flush();
    assert.deepEqual(publications, [{
      path: '/aula/library', revision: '1', operation: { action: 'publish', fileId: 'approved', ...metadata, contentKind: 'FILE' },
    }]);
    assert.equal(form(), undefined, 'a confirmed publication closes even when the refresh fails');
    const refresh = find(node => node.type === 'button' && node.props.children === 'Actualizar Biblioteca')[0];
    assert.ok(refresh);
    failRefresh = false;
    refresh.props.onClick();
    await view.flush();
    assert.equal(publications.length, 1, 'retrying refresh never republishes');
    assert.deepEqual(uploads, [attachment]);
  } finally { view.close(); }
});
