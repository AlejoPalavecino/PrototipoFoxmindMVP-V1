import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('rename preserves the name after a rejected save and validates before calling its operation', async () => {
  const { FoxyRenameDialog } = loadTsModule('apps/web/src/features/foxy/conversations/foxy-rename-dialog.tsx');
  const calls = [];
  let accepted = false, closed = 0;
  const view = hookView(FoxyRenameDialog, {
    initialTitle: 'Mi conversación', onSave: async title => { calls.push(title); return accepted; },
    onClose: () => { closed += 1; },
  });
  const input = () => descendants(view.tree, node => node.type === 'input')[0];
  const submit = () => descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  try {
    await view.flush();
    input().props.onChange({ target: { value: '   ' } }); await view.flush(); await submit();
    assert.deepEqual(calls, []);
    input().props.onChange({ target: { value: '  Clase de plantas  ' } }); await view.flush();
    await submit(); await view.flush();
    assert.deepEqual(calls, ['Clase de plantas']); assert.equal(closed, 0);
    assert.equal(input().props.value, '  Clase de plantas  ');
    accepted = true; await submit(); await view.flush();
    assert.equal(closed, 1);
  } finally { view.close(); }
});

test('source citations offer only the exact available preview for this conversation and turn', () => {
  const { citationPreviewHref } = loadTsModule('apps/web/src/features/foxy/context/citation-preview.ts');
  const expected = '/api/v1/foxy-ai/conversations/chat/turns/turn/citations/c1/file?mode=preview';
  const citation = { id: 'c1', availability: 'AVAILABLE', href: expected };
  assert.equal(citationPreviewHref('chat', 'turn', citation), expected);
  for (const change of [{ href: 'https://other.invalid/file' }, { availability: 'UNAVAILABLE' }, { id: '../c1' }, { href: expected.replace('/turn/', '/other/') }]) {
    assert.equal(citationPreviewHref('chat', 'turn', { ...citation, ...change }), null);
  }
});

test('composer preserves explicit submit, draft updates and IME/Shift Enter behavior', () => {
  const { renderFoxyComposer } = loadTsModule('apps/web/src/features/foxy/conversations/foxy-composer.tsx');
  const changes = [];
  let submitted = 0, prevented = 0;
  const props = {
    onSubmit() {}, text: 'Mi borrador', setText: value => changes.push(value),
    validMessage: true, disabled: false, libraryOpen: false, onLibrary() {},
    materialCount: 0, attachmentDisabled: false, onUpload: async () => {},
    mode: null, setMode() {}, composerRef: { current: null },
  };
  const textarea = () => descendants(renderFoxyComposer(props), node => node.type === 'textarea')[0];
  assert.equal(submitted, 0);
  textarea().props.onChange({ target: { value: 'Un borrador nuevo' } });
  assert.deepEqual(changes, ['Un borrador nuevo']);
  const key = overrides => textarea().props.onKeyDown({
    key: 'Enter', shiftKey: false, nativeEvent: { isComposing: false },
    preventDefault: () => { prevented += 1; }, currentTarget: { form: { requestSubmit: () => { submitted += 1; } } }, ...overrides,
  });
  key({ shiftKey: true }); key({ nativeEvent: { isComposing: true } });
  assert.equal(submitted, 0); assert.equal(prevented, 0);
  key({}); assert.equal(submitted, 1);
  props.disabled = true; key({}); assert.equal(submitted, 1);
});
