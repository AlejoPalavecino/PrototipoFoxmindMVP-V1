import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';

const path = name => 'apps/web/src/features/study/' + name;
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
const button = (tree, label) => descendants(tree, node => node.type === 'button' && text(node) === label)[0];
const generation = overrides => ({ local: undefined, requests: [], blocked: false, cancelling: '', submitting: false, error: '', stop: async () => {}, retry: async () => false, retryLocal: async () => false, ...overrides });
const chat = { pending: null, operation: '', cancelling: false, canStop: false, send: async () => {}, stop: async () => {} };

test('pure composer preserves Enter, Shift+Enter, IME, input and originating Library control', async () => {
 const { StudyChatComposer } = loadTsModule(path('conversations/presentation/study-chat-composer.tsx'));
 const edits = [], launchers = []; let submitted = 0, sent = 0, prevented = 0;
 const tree = StudyChatComposer({ text: 'draft', pending: null, busy: false, active: true, generationBlocked: false, attachmentsBusy: false, sourceCount: 3, folderName: 'Folder', onText: value => edits.push(value), onSend: async () => { sent++; }, onLibrary: value => launchers.push(value), onAttach: async () => {} });
 const field = descendants(tree, node => node.type === 'textarea')[0];
 const key = (shiftKey, isComposing) => field.props.onKeyDown({ key: 'Enter', shiftKey, nativeEvent: { isComposing }, preventDefault() { prevented++; }, currentTarget: { form: { requestSubmit() { submitted++; } } } });
 key(true, false); key(false, true);
 assert.equal(prevented, 0); assert.equal(submitted, 0);
 key(false, false); assert.equal(prevented, 1); assert.equal(submitted, 1);
 field.props.onChange({ target: { value: 'kept draft' } });
 assert.deepEqual(edits, ['kept draft']);
 const launcher = {};
 descendants(tree, node => node.type === 'button' && node.props['aria-label'] === 'Biblioteca')[0].props.onClick({ currentTarget: launcher });
 assert.deepEqual(launchers, [launcher]);
 tree.props.onSubmit({ preventDefault() { prevented++; } }); await Promise.resolve(); assert.equal(sent, 1);
 assert.equal(field.props.maxLength, 5000);
});

test('saved generation card opens its exact resource and forwards the cited sources', () => {
 const { StudyMessageList } = loadTsModule(path('conversations/presentation/study-message-list.tsx'));
 const chosen = [], sources = [], first = { id: 'exact', title: 'Exact', markdown: 'saved' }, last = { id: 'last', title: 'Unrelated' };
 const refs = [{ id: 'source', version: '1' }];
 const tree = StudyMessageList({ detail: { creations: [first, last], practices: [] }, messages: [{ id: 'message', role: 'assistant', creationId: 'exact', sourceRefs: refs }], generation: generation(), busy: false, active: true, onCreation: value => chosen.push(value), onPractice() {}, onSources: value => sources.push(value), onReload() {} });
 descendants(tree, node => node.type === 'button' && node.props.className === 'study-exact-generation-result')[0].props.onClick();
 assert.deepEqual(chosen, [first]);
 button(tree, 'Fuentes consultadas · 1').props.onClick(); assert.deepEqual(sources, [refs]);
 assert.equal(text(tree).includes('Unrelated'), false);
});

test('source dialog keeps exact source version and attachment fallback without exposing identities', () => {
 const { StudySourcesDialog } = loadTsModule(path('conversations/presentation/study-sources-dialog.tsx'));
 let closed = 0;
 const tree = StudySourcesDialog({ citedSources: [{ id: 's', version: 'old' }, { id: 'attachment', version: '1' }, { id: 'missing', version: '2' }], sources: [{ id: 's', version: 'new', title: 'Wrong version' }, { id: 's', version: 'old', title: 'Approved title' }], attachments: [{ id: 'attachment', name: 'Attached document' }], onClose() { closed++; } });
 assert.deepEqual(descendants(tree, node => node.type === 'li').map(node => node.props.children), ['Approved title', 'Attached document', 'Fuente no disponible']);
 tree.props.onClose(); assert.equal(closed, 1);
});

test('pending generation cancellation forwards the persisted request identity', async () => {
 const { StudyChatProgress } = loadTsModule(path('conversations/presentation/study-chat-progress.tsx'));
 const stops = [];
 const tree = StudyChatProgress({ generation: generation({ local: { requestId: 'saved-request', conversationId: 'chat', phase: 'SENDING', data: { message: 'My instruction' } }, stop: async id => stops.push(id) }), chat, current: { id: 'chat' }, busy: false, active: true });
 button(tree, 'Detener').props.onClick(); await Promise.resolve();
 assert.deepEqual(stops, ['saved-request']);
 assert.ok(text(tree).includes('My instruction'));
});

test('pure conversation preserves message viewport, unread control, composer and disclaimer order', () => {
 const { StudyConversation } = loadTsModule(path('conversations/presentation/study-conversation.tsx'));
 const tree = StudyConversation({ current: { id: 'chat' }, detail: { creations: [], practices: [] }, messages: [], generation: generation(), chat, busy: false, active: true, follow: { ref: {}, onScroll() {}, unread: true, jump() {} }, text: '', folderName: 'Folder', attachmentsBusy: false, sourceCount: 0, onPrompt() {}, onText() {}, onCreation() {}, onPractice() {}, onSources() {}, onReload() {}, onLibrary() {}, onAttach: async () => {} });
 const children = tree.props.children.filter(Boolean);
 assert.equal(tree.props['aria-label'], 'Conversación con Foxy');
 assert.equal(children[0].props['aria-label'], 'Mensajes con Foxy');
 assert.equal(text(children[1]), 'Ver mensajes nuevos ↓');
 // Notice and docked tool form share one column with the composer, which always closes it.
 assert.equal(children[2].props.className, 'study-composer-dock');
 assert.equal([children[2].props.children].flat().filter(Boolean).at(-1).type.name, 'StudyChatComposer');
 assert.equal(text(children[3]), 'Foxy puede equivocarse. Revisá sus propuestas.');
});
