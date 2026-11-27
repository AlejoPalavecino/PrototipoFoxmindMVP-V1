import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const button = (tree, label) => descendants(tree, node => node.type === 'button' &&
  (node.props['aria-label'] ?? node.props.children) === label)[0];
const noDisclosure = tree => assert.equal(descendants(tree, node => ['details', 'summary'].includes(node.type)).length, 0);
const props = { query: { q: 'mi búsqueda', context: 'ALL', type: 'ALL', status: 'ALL' }, classrooms: [],
  page: { items: [], next: null, loading: false, error: null } };

test('creation filter chips preserve the current search and issue complete queries', async () => {
  const {FoxyCollectionPanel}=componentWithPorts('apps/web/src/features/foxy/collections/foxy-collection-panel.tsx',{});
  const requests=[],view=hookView(FoxyCollectionPanel,{...props,onQuery:query=>requests.push(query)});
  try{await view.flush();noDisclosure(view.tree);assert.equal(button(view.tree,'Filtros'),undefined);button(view.tree,'Clases').props.onClick();assert.deepEqual(requests,[{...props.query,type:'PLAN'}]);assert.equal(descendants(view.tree,node=>node.type==='input')[0].props.value,'mi búsqueda');}finally{view.close();}
});

test('a ready Foxy visual opens the generator on demand and keeps the request draft', async () => {
  const { FoxyVisualWorkspace } = componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-workspace.tsx', {});
  const view = hookView(FoxyVisualWorkspace, { capabilities: { IMAGE: true, DIAGRAM: true }, kind: 'IMAGE',
    prompt: 'Borrador', aspectRatio: '1:1', jobs: [{ id: 'j', assetId: 'a', state: 'READY', kind: 'IMAGE' }],
    selectedId: 'j', assetFileUrl: (id, mode) => '/api/v1/foxy-ai/assets/' + id + '/file?mode=' + mode,
    actions: {}, busy: false });
  try {
    await view.flush();
    noDisclosure(view.tree);
    const trigger = () => button(view.tree, 'Nuevo recurso visual');
    const form = () => descendants(view.tree, node => node.type === 'form')[0];
    assert.equal(form().props.hidden, true);
    trigger().props.onClick();
    await view.flush();
    assert.equal(form().props.hidden, false);
    assert.equal(descendants(form(), node => node.type === 'textarea')[0].props.value, 'Borrador');
    trigger().props.onClick();
    await view.flush();
    assert.equal(form().props.hidden, true);
    assert.equal(descendants(view.tree, node => node.type === 'img').length, 1);
  } finally { view.close(); }
});


test('Study chat sources open in a dismissible dialog while the draft stays in the composer', async () => {
  const { StudyWorkspace } = componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx', {
    '../../../shared/use-chat-attachments': { useChatAttachments: () => ({ items: [] }) },
    '../../../../../shared-ui/use-chat-follow': { useChatFollow: () => ({}) },
  });
  const detail = {
    folder: { id: 'folder', name: 'Lectura', status: 'ACTIVE', units: [] },
    conversations: [{ id: 'chat', title: 'Tema', messages: [{ role: 'assistant', content: 'Resumen', sourceRefs: [
      { id: 'source', version: '1' }, { id: 'missing', version: '1' },
    ] }] }],
    sources: [{ id: 'source', version: '1', title: 'Apunte' }], creations: [], exams: [], practices: [],
  };
  const view = hookView(StudyWorkspace, { detail, catalog: { classrooms: [] } });
  try {
    await view.flush();
    noDisclosure(view.tree);
    const composer = () => descendants(view.tree, node => node.type === 'textarea')[0];
    composer().props.onChange({ target: { value: 'Mi pregunta' } });
    await view.flush();
    button(view.tree, 'Fuentes consultadas · 2').props.onClick();
    await view.flush();
    const dialog = descendants(view.tree, node => node.type?.name === 'Dialog' && node.props.title === 'Fuentes consultadas')[0];
    assert.deepEqual(descendants(dialog, node => node.type === 'li').map(node => node.props.children), ['Apunte', 'Fuente no disponible']);
    dialog.props.onClose();
    await view.flush();
    assert.ok(button(view.tree, 'Fuentes consultadas · 2'));
    assert.equal(composer().props.value, 'Mi pregunta');
  } finally { view.close(); }
});


for (const [scenario, expectedTarget] of [
  ['restores the originating Library button', 'launcher'],
  ['preserves focus chosen by navigation', 'destination'],
]) test(`closing Study context after a Library transition ${scenario}`, async () => {
  const { StudyWorkspace } = componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx', {
    '../../../shared/use-chat-attachments': { useChatAttachments: () => ({ items: [] }) },
    '../../../../../shared-ui/use-chat-follow': { useChatFollow: () => ({}) },
  });
  const detail = { folder: { id: 'folder', name: 'Lectura', status: 'ACTIVE', units: [] },
    conversations: [], sources: [], creations: [], exams: [], practices: [] };
  const view = hookView(StudyWorkspace, { detail, catalog: { classrooms: [] } });
  const ownerDocument = { body: {}, activeElement: null };
  const launcher = { ownerDocument, isConnected: true, focus() { ownerDocument.activeElement = this; } };
  const destination = {};
  const frames = [];
  const previousFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  try {
    await view.flush();
    const composer = () => descendants(view.tree, node => node.type === 'textarea')[0];
    composer().props.onChange({ target: { value: 'Mi borrador' } });
    await view.flush();
    const open = descendants(view.tree, node => node.type === 'button' && node.props['aria-label'] === 'Biblioteca')[0];
    const dialog = title => descendants(view.tree, node => node.type?.name === 'FoxyDialog' && node.props.title === title)[0];
    ownerDocument.activeElement = launcher;
    open.props.onClick({ currentTarget: launcher });
    await view.flush();
    descendants(dialog('Biblioteca de contexto'),node=>node.type?.name==='StudyLibrary')[0].props.onContext();
    await view.flush();
    dialog('El contexto de tu carpeta').props.onClose();
    ownerDocument.activeElement = expectedTarget === 'launcher' ? ownerDocument.body : destination;
    await view.flush();
    frames.splice(0).forEach(callback => callback());
    assert.equal(dialog('El contexto de tu carpeta'), undefined);
    assert.equal(ownerDocument.activeElement, expectedTarget === 'launcher' ? launcher : destination);
    assert.equal(composer().props.value, 'Mi borrador');
  } finally {
    globalThis.requestAnimationFrame = previousFrame;
    view.close();
  }
});
