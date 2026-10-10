import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { MessageComposer } from '../../../components/messaging/MessageComposer';
import { runMessageSend, sendLocalMessage } from '../application/messageSendState';

const noop = () => {};
const attachment = { id: 'file', name: 'Trabajo.pdf', size: '1 MB', type: 'pdf' as const };
const reply = { id: 'old', senderId: 'teacher', senderName: 'Profesora', senderRole: 'docente' as const,
  text: 'Consulta original', timestamp: '10:00', dateGroup: 'Hoy', status: 'read' as const };
const base: Parameters<typeof MessageComposer>[0] = {
  activeConversationTitle: 'Literatura', quickTemplates: [{ label: 'Consulta', text: 'Plantilla', tag: 'Duda TP' }],
  sampleAttachments: [attachment], inputText: '', replyingTo: null, attachedFile: null,
  isRecordingAudio: false, recordingSeconds: 0, showAttachmentPicker: false, textareaRef: { current: null },
  sendPending: false, sendError: null,
  onTemplateClick: noop, onClearReply: noop, onClearFile: noop, onRecordCancel: noop,
  onVoiceSend: noop, onTogglePicker: noop, onSelectAttachment: noop, onRecordStart: noop,
  onTextChange: noop, onKeyDown: noop, onSend: noop,
};
function elements(node: ReactNode): ReactElement<Record<string, any>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  const element = node as ReactElement<Record<string, any>>;
  return [element, ...elements(element.props.children)];
}
function view(overrides: Partial<typeof base> = {}) { return elements(MessageComposer({ ...base, ...overrides })); }
function find(nodes: ReturnType<typeof view>, name: string, value: unknown) {
  const matches = nodes.filter(n => n.props[name] === value);
  assert.equal(matches.length, 1, `${name}: ${value}`); return matches[0];
}

test('text, whitespace and attachment-only send availability; reply and attachment remain visible', () => {
  for (const [inputText, attachedFile, disabled] of [['', null, true], ['   ', null, true], ['Consulta', null, false], ['', attachment, false]] as const) {
    const nodes = view({ inputText, attachedFile });
    assert.equal(find(nodes, 'aria-label', 'Enviar mensaje').props.disabled, disabled);
  }
  const html = renderToStaticMarkup(createElement(MessageComposer, { ...base, replyingTo: reply, attachedFile: attachment }));
  for (const text of ['Respondiendo a Profesora:', 'Consulta original', 'Trabajo.pdf', '1 MB', 'Quitar respuesta', 'Quitar adjunto']) assert.ok(html.includes(text));
});

for (const isRecordingAudio of [false, true]) {
  test(`${isRecordingAudio ? 'audio' : 'text'} composer has accessible pending/error and explicit retry without losing draft`, () => {
    const props = { ...base, inputText: 'Borrador', replyingTo: reply, attachedFile: attachment, isRecordingAudio, recordingSeconds: 9 };
    const pending = view({ ...props, sendPending: true });
    assert.equal(pending[0].type, 'fieldset'); assert.equal(pending[0].props.disabled, true);
    assert.equal(pending[0].props['aria-busy'], true);
    assert.match(find(pending, 'role', 'status').props.children, /Procesando envío en este prototipo/);
    if (!isRecordingAudio) {
      assert.equal(find(pending, 'aria-label', 'Mensaje').props.value, 'Borrador');
      assert.equal(find(pending, 'aria-label', 'Mensaje').props.disabled, true);
      assert.equal(find(pending, 'aria-label', 'Procesando envío').props.disabled, true);
    }
    const error = 'No se pudo completar el envío. Conservamos tu borrador; puedes reintentar.';
    const failed = view({ ...props, sendError: error });
    assert.equal(failed[0].props.disabled, false);
    assert.equal(find(failed, 'role', 'alert').props.children, error);
    const html = renderToStaticMarkup(createElement(MessageComposer, { ...props, sendError: error }));
    assert.ok(html.includes(isRecordingAudio ? 'Reintentar audio' : 'Reintentar envío'));
    assert.ok(html.includes('Trabajo.pdf') && html.includes('Consulta original'));
    assert.ok(html.includes(isRecordingAudio ? '0:09' : 'Borrador'));
  });
}

test('controlled composer forwards every edit, text/keyboard and send callback', () => {
  const calls: unknown[] = [];
  const callbacks = Object.fromEntries(Object.keys(base).filter(key => key.startsWith('on')).map(key =>
    [key, (value: unknown) => calls.push([key, value])]));
  const nodes = view({ ...callbacks, inputText: 'Hola', replyingTo: reply, attachedFile: attachment, showAttachmentPicker: true });
  const byCallback = (key: string) => nodes.find(n => n.props.onClick === callbacks[key])!;
  for (const key of ['onClearReply', 'onClearFile', 'onTogglePicker', 'onRecordStart', 'onSend']) {
    assert.ok(byCallback(key)); byCallback(key).props.onClick();
  }
  find(nodes, 'children', 'Consulta').props.onClick();
  nodes.find(n => n.type === 'button' && n.props.className.startsWith('w-full text-left'))!.props.onClick();
  const textarea = find(nodes, 'aria-label', 'Mensaje');
  const event = { target: { value: 'Nuevo texto' } }; textarea.props.onChange(event); textarea.props.onKeyDown(event);
  assert.deepEqual(calls, [
    ...['onClearReply', 'onClearFile', 'onTogglePicker', 'onRecordStart', 'onSend'].map(key => [key, undefined]),
    ['onTemplateClick', base.quickTemplates[0]], ['onSelectAttachment', attachment], ['onTextChange', event], ['onKeyDown', event],
  ]);
  const audio = view({ ...callbacks, isRecordingAudio: true });
  audio.find(n => n.props.onClick === callbacks.onRecordCancel)!.props.onClick();
  audio.find(n => n.props.onClick === callbacks.onVoiceSend)!.props.onClick();
  assert.deepEqual(calls.slice(-2), [['onRecordCancel', undefined], ['onVoiceSend', undefined]]);
});

// Execute actual bounded hub handlers with the real UI boundary. This protects
// payload/reset wiring without freezing source bytes; it is not a mounted test.
const source = readFileSync(new URL('../../../components/messaging/SharedMessagingHub.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('hub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function initializer(name: string) {
  let result: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) result = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(result, name); return result.getText(ast);
}
function evaluate(code: string, scope: Record<string, any>) {
  const js = ts.transpileModule(`(${code})`, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText;
  return new Function(...Object.keys(scope), `return ${js}`)(...Object.values(scope));
}
function hubHandlers() {
  const payloads: any[] = []; const toasts: unknown[] = [];
  const context = { conversationId: 'c', replyingTo: reply, attachedFile: attachment };
  let operation: () => void | Promise<void> = noop;
  const scope: Record<string, any> = {
    runMessageSend, sendLocalMessage, composerContext: context, currentComposerRef: { current: { context, userId: 'u' } },
    sendGate: { current: false }, sendState: { pending: false, error: null },
    sendLifetimeRef: { current: { generation: 1, live: true } },
    activeConversationId: 'c', currentUserId: 'u', currentUserName: 'Usuario', effectiveRole: 'docente',
    inputText: ' Consulta ', attachedFile: attachment, replyingTo: reply, selectedTag: 'Duda TP',
    isRecordingAudio: true, recordingSeconds: 9, showAttachmentPicker: true,
    textareaRef: { current: { style: { height: '80px' }, focus: noop } },
    toast: { show: (...args: unknown[]) => toasts.push(args) },
    messagingStore: {
      getConversationById: () => ({ type: 'channel', participants: [] }),
      sendMessage: (params: unknown) => { payloads.push(params); return operation(); },
    },
  };
  for (const key of ['InputText', 'AttachedFile', 'ReplyingTo', 'SelectedTag', 'IsRecordingAudio', 'RecordingSeconds', 'SendState']) {
    scope[`set${key}`] = (value: any) => { const name = key[0].toLowerCase() + key.slice(1); scope[name] = typeof value === 'function' ? value(scope[name]) : value; };
  }
  scope.handleSendMessage = evaluate(initializer('handleSendMessage'), scope);
  scope.handleSendVoiceNote = evaluate(initializer('handleSendVoiceNote'), scope);
  // Re-evaluate to represent React's next render when testing a retry.
  return { scope, payloads, toasts, operation: (value: typeof operation) => { operation = value; },
    text: () => evaluate(initializer('handleSendMessage'), scope)(),
    voice: () => evaluate(initializer('handleSendVoiceNote'), scope)() };
}
function deferred() {
  let resolve!: () => void; let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('actual text handler retains text/file/reply/tag until promise success and resets afterwards', async () => {
  const h = hubHandlers(); const wait = deferred(); h.operation(() => wait.promise);
  const result = h.text(); assert.equal(h.scope.sendState.pending, true);
  assert.equal(h.scope.inputText, ' Consulta '); assert.strictEqual(h.scope.attachedFile, attachment);
  assert.strictEqual(h.scope.replyingTo, reply); assert.equal(h.scope.selectedTag, 'Duda TP');
  assert.deepEqual(h.payloads[0], { conversationId: 'c', senderId: 'u', senderName: 'Usuario', senderRole: 'docente',
    text: 'Consulta', attachment, replyTo: { id: 'old', senderName: 'Profesora', text: 'Consulta original' }, categoryTag: 'Duda TP' });
  assert.equal(await h.text(), false); assert.equal(await h.voice(), false); assert.equal(h.payloads.length, 1);
  wait.resolve(); assert.equal(await result, true);
  for (const key of ['attachedFile', 'replyingTo', 'selectedTag']) assert.equal(h.scope[key], null);
  assert.equal(h.scope.inputText, ''); assert.equal(h.scope.textareaRef.current.style.height, 'auto');
});

for (const kind of ['throw', 'reject']) {
  test(`actual handlers ${kind}: retained drafts and voice retry only confirm locally after success`, async () => {
    for (const method of ['text', 'voice'] as const) {
      const h = hubHandlers();
      h.operation(() => { if (kind === 'throw') throw Error('failure'); return Promise.reject(Error('failure')); });
      assert.equal(await h[method](), false);
      assert.equal(h.scope.inputText, ' Consulta '); assert.strictEqual(h.scope.attachedFile, attachment);
      assert.strictEqual(h.scope.replyingTo, reply); assert.equal(h.scope.selectedTag, 'Duda TP');
      assert.equal(h.scope.isRecordingAudio, true); assert.equal(h.toasts.length, 0);
      assert.match(h.scope.sendState.error, /borrador.*reintentar/);
      h.operation(noop); assert.equal(await h[method](), true);
      if (method === 'voice') {
        assert.equal(h.scope.isRecordingAudio, false);
        assert.equal(h.scope.inputText, ' Consulta ', 'voice preserves existing text/attachment/reply behavior');
        assert.strictEqual(h.scope.attachedFile, attachment); assert.strictEqual(h.scope.replyingTo, reply);
        assert.match(String(h.toasts[0]), /historial local/);
        assert.equal(h.payloads[1].attachment.duration, '0:09');
      } else assert.equal(h.scope.inputText, '');
      assert.equal(h.scope.sendState.error, null);
    }
  });
}

test('actual voice handler shares text gate, waits for confirmation, and does not stop recording early', async () => {
  const h = hubHandlers(); const wait = deferred(); h.operation(() => wait.promise);
  const result = h.voice(); assert.equal(h.scope.isRecordingAudio, true); assert.equal(h.toasts.length, 0);
  assert.equal(await h.text(), false); assert.equal(await h.voice(), false);
  wait.resolve(); assert.equal(await result, true); assert.equal(h.scope.isRecordingAudio, false);
  assert.equal(h.payloads.length, 1);
});

test('actual handlers never clear or report success for another conversation visit/user', async () => {
  for (const method of ['text', 'voice'] as const) {
    const h = hubHandlers(); const wait = deferred(); h.operation(() => wait.promise);
    const result = h[method]();
    h.scope.currentComposerRef.current = { context: { conversationId: 'c' }, userId: 'other' };
    h.scope.inputText = 'Nuevo borrador'; wait.resolve(); assert.equal(await result, true);
    assert.equal(h.scope.inputText, 'Nuevo borrador'); assert.equal(h.scope.isRecordingAudio, true);
    assert.equal(h.toasts.length, 0);
  }
});

test('actual parent keyboard sends only Enter without Shift, and all conflicting edits respect the immediate gate', () => {
  const h = hubHandlers(); const calls: unknown[] = [];
  h.scope.handleSendMessage = () => calls.push('send');
  const mount = (() => {
    let found: ts.JsxSelfClosingElement | undefined;
    function visit(node: ts.Node) {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'MessageComposer') found = node;
      ts.forEachChild(node, visit);
    }
    visit(ast); assert.ok(found); return found;
  })();
  const callback = (name: string) => {
    const prop = mount.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(ast) === name) as ts.JsxAttribute;
    assert.ok(prop?.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
    return evaluate(prop.initializer.expression.getText(ast), h.scope);
  };
  for (const [key, shiftKey, expected] of [['Enter', false, ['prevent', 'send']], ['Enter', true, []], ['Escape', false, []]] as const) {
    callback('onKeyDown')({ key, shiftKey, preventDefault: () => calls.push('prevent') });
    assert.deepEqual(calls.splice(0), expected);
  }
  const before = { text: h.scope.inputText, file: h.scope.attachedFile, reply: h.scope.replyingTo, tag: h.scope.selectedTag };
  h.scope.sendGate.current = true;
  callback('onTemplateClick')({ text: 'Cambio', tag: 'Aviso' });
  callback('onClearReply')(); callback('onClearFile')(); callback('onRecordCancel')(); callback('onTogglePicker')();
  callback('onSelectAttachment')({ ...attachment, id: 'other' }); callback('onRecordStart')();
  callback('onTextChange')({ target: { value: 'Cambio' } });
  assert.deepEqual({ text: h.scope.inputText, file: h.scope.attachedFile, reply: h.scope.replyingTo, tag: h.scope.selectedTag }, before);
  assert.equal(h.scope.isRecordingAudio, true); assert.equal(h.scope.showAttachmentPicker, true); assert.equal(h.toasts.length, 0);
  h.scope.sendGate.current = false;
  callback('onTemplateClick')({ text: 'Cambio', tag: 'Aviso' });
  assert.equal(h.scope.inputText, 'Cambio'); assert.equal(h.scope.selectedTag, 'Aviso');
});

test('actual audio timer pauses pending without resetting duration, then resumes or resets on cancel', () => {
  let effect: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
      && node.arguments[0].getText(ast).includes('setRecordingSeconds')) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(effect);
  for (const [isRecordingAudio, pending] of [[true, true], [true, false], [false, false]]) {
    const h = hubHandlers(); const timers: (() => void)[] = [];
    Object.assign(h.scope, { isRecordingAudio, sendState: { pending },
      setInterval: (tick: () => void, delay: number) => { assert.equal(delay, 1000); timers.push(tick); return 42; },
      clearInterval: noop });
    const cleanup = evaluate(effect.getText(ast), h.scope)();
    if (isRecordingAudio && !pending) { assert.equal(timers.length, 1); timers[0](); assert.equal(h.scope.recordingSeconds, 10); }
    else { assert.equal(timers.length, 0); assert.equal(h.scope.recordingSeconds, isRecordingAudio ? 9 : 0); }
    cleanup();
  }
});

test('actual text handler blank guard, attachment-only send, and unavailable target/action failures', async () => {
  const blank = hubHandlers(); blank.scope.inputText = ' '; blank.scope.attachedFile = null;
  assert.equal(await blank.text(), undefined); assert.equal(blank.payloads.length, 0);
  const file = hubHandlers(); file.scope.inputText = ' '; assert.equal(await file.text(), true);
  assert.equal(file.payloads[0].text, ''); assert.strictEqual(file.payloads[0].attachment, attachment);
  for (const missing of ['target', 'action']) {
    const h = hubHandlers();
    if (missing === 'target') h.scope.messagingStore.getConversationById = () => undefined;
    else h.scope.messagingStore.sendMessage = undefined;
    assert.equal(await h.text(), false); assert.equal(h.scope.inputText, ' Consulta ');
    assert.equal(h.payloads.length, 0); assert.ok(h.scope.sendState.error);
  }
});
