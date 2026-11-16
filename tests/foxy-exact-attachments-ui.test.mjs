import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { createFoxyChatController } from '../apps/web/src/features/foxy/model/foxy-chat-controller.ts';

function workspace({ busy = false } = {}) {
  const attachment = randomUUID(), room = randomUUID(), source = { id: randomUUID(), title: 'Origen', revision: '7', context: { kind: 'GENERAL' } };
  const state = { current: source, conversations: [source], turns: [], busy: false, selection: { topicIds: [], sourceIds: [] }, capabilities: { textGeneration: { enabled: true } } };
  const calls = [], controller = { create: async input => { calls.push(input); return undefined; } };
  const { FoxyWorkspace } = componentWithPorts('apps/web/src/features/foxy/ui/foxy-workspace.tsx', {
    '../../../shared/use-chat-attachments': { useChatAttachments: () => ({ ready: true, busy, items: [{ id: attachment, name: 'Privado.pdf' }], upload() {}, remove() {} }) },
  });
  const view = hookView(FoxyWorkspace, { state, controller, classrooms: [{ id: room, name: 'Ciencias' }] });
  return { source, room, attachment, state, calls, controller, view };
}

test('context carry keeps source and draft on failure and retries the same request', async () => {
  const f = workspace();
  try {
    await f.view.flush();
    descendants(f.view.tree, n => n.type === 'textarea')[0].props.onChange({ target: { value: 'Mi borrador' } }); await f.view.flush();
    descendants(f.view.tree, n => n.type?.name === 'FoxyChatLayout')[0].props.context.props.onClick(); await f.view.flush();
    const picker = () => descendants(f.view.tree, n => n.type?.name === 'FoxyContextPicker')[0];
    await picker().props.onApply(f.room); await f.view.flush();
    assert.equal(f.state.current.id, f.source.id);
    assert.equal(descendants(f.view.tree, n => n.type === 'textarea')[0].props.value, 'Mi borrador');
    assert.match(picker().props.applyError, /se conservan/);
    await picker().props.onApply(f.room); await f.view.flush();
    assert.equal(f.calls.length, 2); assert.deepEqual(f.calls[1], f.calls[0]);
    assert.deepEqual(f.calls[0].carryAttachments, { sourceConversationId: f.source.id, sourceRevision: '7', attachmentIds: [f.attachment] });
    assert.deepEqual(f.calls[0].context, { kind: 'CLASSROOM', classroomId: f.room });
  } finally { f.view.close(); }
});

test('context cannot change while upload is in progress', async () => {
  const f = workspace({ busy: true });
  try {
    await f.view.flush(); const button = descendants(f.view.tree, n => n.type?.name === 'FoxyChatLayout')[0].props.context;
    assert.equal(button.props.disabled, true);
    button.props.onClick(); await f.view.flush();
    await descendants(f.view.tree, n => n.type?.name === 'FoxyContextPicker')[0].props.onApply(f.room);
    assert.deepEqual(f.calls, []);
  } finally { f.view.close(); }
});

test('committed destination whose initial read fails leaves source selected until retry succeeds', async () => {
  const source = { id: randomUUID(), title: 'Origen', revision: '0', context: { kind: 'GENERAL' } }, destination = { ...source, id: randomUUID(), title: 'Destino' };
  let failRead = true;
  const input = { requestId: randomUUID(), title: 'Destino', context: { kind: 'GENERAL' }, carryAttachments: { sourceConversationId: source.id, sourceRevision: '0', attachmentIds: [randomUUID()] } };
  const controller = createFoxyChatController({ onChange() {}, client: {
    capabilities: async () => ({}), listConversations: async () => ({ items: [source], next: null }),
    createConversation: async () => ({ created: true, conversation: destination }),
    listTurns: async id => { if (id === destination.id && failRead) throw new Error('network'); return { items: [], nextAfterSequence: null }; },
  } });
  try {
    await controller.init(); await controller.select(source.id);
    assert.equal(await controller.create(input), undefined); assert.equal(controller.getState().current.id, source.id);
    failRead = false; assert.equal(await controller.create(input), destination.id); assert.equal(controller.getState().current.id, destination.id);
  } finally { controller.dispose(); }
});

test('an earlier attachment listing cannot hide an upload acknowledged moments later', async () => {
  let completeInitial;
  const firstRead = new Promise(resolve => completeInitial = resolve), attachment = { id: randomUUID(), name: 'Nuevo.pdf', sizeBytes: 20, savedToFolder: false };
  let reads = 0, state;
  const { useChatAttachments } = componentWithPorts('apps/web/src/shared/use-chat-attachments.ts', {
    './chat-attachments': { requestChatAttachment: async (_path, method) => method === 'PUT' ? { attachment }
      : ++reads === 1 ? firstRead : new Promise(() => {}) },
  });
  const view = hookView(() => { state = useChatAttachments('/private/chat'); return null; }, {});
  try {
    await view.flush(); await state.upload(async () => '/private/chat', attachment.id, { name: attachment.name }, false); await view.flush();
    completeInitial({ items: [] }); await view.flush();
    assert.deepEqual(state.items, [attachment]); assert.equal(state.ready, true); assert.equal(state.busy, false);
  } finally { view.close(); }
});
