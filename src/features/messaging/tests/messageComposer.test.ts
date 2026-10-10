import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from 'lucide-react';
import ts from 'typescript';

const hubPath = 'src/components/messaging/SharedMessagingHub.tsx';
const childPath = 'src/components/messaging/MessageComposer.tsx';
const baseline = execFileSync('git', ['show', `135edcba2c7fa05cc6cd59d93e034511b2a51f66:${hubPath}`], { encoding: 'utf8' });
const lf = (text: string) => text.replace(/\r\n/g, '\n');
const indent = (text: string) => lf(text).split('\n').map(line => line.replace(/^ +/, '')).join('\n');
function parse(text: string) {
  const sf = ts.createSourceFile('composer.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const diagnostics = (sf as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  assert.equal(diagnostics.length, 0, 'TSX parse diagnostics');
  return sf;
}
function nodes(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = [];
  function visit(node: ts.Node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(root);
  return found;
}
function region(text: string) {
  const start = text.indexOf('              {/* Quick Prompt Chips Bar */}');
  const end = text.indexOf('            </>', start);
  assert.ok(start >= 0 && end > start);
  return { start, end, text: text.slice(start, end) };
}
const original = parse(baseline);
const slice = region(baseline);
const attributes = nodes(original, ts.isJsxAttribute).filter(node => node.getStart(original) >= slice.start && node.end <= slice.end) as ts.JsxAttribute[];
const eventNames = ['onTemplateClick', 'onClearReply', 'onClearFile', 'onRecordCancel', 'onVoiceSend', 'onTogglePicker', 'onSelectAttachment', 'onRecordStart', 'onTextChange', 'onKeyDown', 'onSend'];
const events = attributes.filter(node => /^(onClick|onChange|onKeyDown)$/.test(node.name.getText(original)));
assert.equal(events.length, eventNames.length, 'eleven original callback bindings');
function expression(attribute: ts.JsxAttribute) {
  assert.ok(attribute.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression);
  return attribute.initializer.expression;
}
function evaluate(code: string, scope: Record<string, unknown>) {
  const js = ts.transpileModule(`(${code})`, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText;
  return new Function(...Object.keys(scope), `return ${js}`)(...Object.values(scope));
}
function currentCallback(index: number) {
  const text = readFileSync(hubPath, 'utf8');
  const sf = parse(text);
  if (!existsSync(childPath)) return events[index].initializer ? expression(events[index]).getText(original) : assert.fail();
  const mounts = nodes(sf, ts.isJsxSelfClosingElement).filter(node => (node as ts.JsxSelfClosingElement).tagName.getText(sf) === 'MessageComposer');
  assert.equal(mounts.length, 1, 'exactly one controlled composer');
  const matches = nodes(mounts[0], ts.isJsxAttribute).filter(node => (node as ts.JsxAttribute).name.getText(sf) === eventNames[index]) as ts.JsxAttribute[];
  assert.equal(matches.length, 1);
  return expression(matches[0]).getText(sf);
}
function harness() {
  const log: unknown[] = [];
  const style = { set height(value: string) { log.push(['height', value]); } };
  const textareaRef = { current: { style, focus: () => log.push('focus') } };
  const scope: Record<string, unknown> = { textareaRef, showAttachmentPicker: true,
    t: { text: 'Plantilla', tag: 'Aviso' }, att: { id: 'file', name: 'Archivo' },
    handleSendMessage: () => log.push('send'), handleSendVoiceNote: () => log.push('voice'),
    toast: { show: (...args: unknown[]) => log.push(['toast', ...args]) },
  };
  for (const name of ['InputText', 'SelectedTag', 'ReplyingTo', 'AttachedFile', 'IsRecordingAudio', 'ShowAttachmentPicker', 'RecordingSeconds']) {
    scope[`set${name}`] = (value: unknown) => log.push([name, value]);
  }
  return { log, scope, textareaRef };
}
// Execute actual bounded JSX callbacks, not copies of their implementation.
// Both original and extracted parent callbacks must produce the same observations.
for (const owner of ['original', 'current'] as const) {
  test(`${owner}: textarea self-closing match, Enter/Shift/other and value-only change`, () => {
    const textareas = nodes(original, ts.isJsxSelfClosingElement).filter(node => (node as ts.JsxSelfClosingElement).tagName.getText(original) === 'textarea');
    assert.equal(textareas.length, 1, 'self-closing textarea cardinality');
    const { log, scope } = harness();
    const callback = (i: number) => evaluate(owner === 'original' ? expression(events[i]).getText(original) : currentCallback(i), scope);
    for (const [key, shiftKey, expected] of [['Enter', false, ['prevent', 'send']], ['Enter', true, []], ['Escape', false, []]] as const) {
      callback(9)({ key, shiftKey, preventDefault: () => log.push('prevent') });
      assert.deepEqual(log.splice(0), expected);
    }
    callback(8)({ target: { value: '  Texto nuevo  ' } });
    assert.deepEqual(log, [['InputText', '  Texto nuevo  ']], 'no height writes on change');
  });
  test(`${owner}: template/ref lookup, clear, record, picker, toast and send order`, () => {
    const { log, scope, textareaRef } = harness();
    const callback = (i: number) => evaluate(owner === 'original' ? expression(events[i]).getText(original) : currentCallback(i), scope);
    const template = callback(0);
    textareaRef.current.focus = () => log.push('late focus');
    template(scope.t);
    assert.deepEqual(log.splice(0), [['InputText', 'Plantilla'], ['SelectedTag', 'Aviso'], 'late focus']);
    for (const [index, expected] of [[1, [['ReplyingTo', null]]], [2, [['AttachedFile', null]]], [3, [['IsRecordingAudio', false]]], [4, ['voice']], [5, [['ShowAttachmentPicker', false]]], [7, [['IsRecordingAudio', true]]], [10, ['send']]] as const) {
      callback(index)(); assert.deepEqual(log.splice(0), expected);
    }
    callback(6)(scope.att);
    assert.deepEqual(log, [['AttachedFile', scope.att], ['ShowAttachmentPicker', false], ['toast', 'Adjuntado: Archivo', 'info']]);
  });
}

test('original and current send/reset execution, recording responsibility and unaffected declarations', () => {
  const current = parse(readFileSync(hubPath, 'utf8'));
  for (const owner of [original, current]) {
    const { log, scope } = harness();
    Object.assign(scope, { activeConversationId: 'conversation', inputText: ' texto ', attachedFile: null, replyingTo: null,
      selectedTag: 'Aviso', currentUserId: 'user', currentUserName: 'Name', effectiveRole: 'docente',
      messagingStore: { sendMessage: (value: unknown) => log.push(['store', value]) } });
    const declaration = nodes(owner, ts.isVariableDeclaration).find(node => (node as ts.VariableDeclaration).name.getText(owner) === 'handleSendMessage') as ts.VariableDeclaration;
    assert.ok(declaration.initializer);
    const send = () => evaluate(declaration.initializer!.getText(owner), scope)();
    const reset = [['InputText', ''], ['ReplyingTo', null], ['AttachedFile', null], ['SelectedTag', null], ['height', 'auto']];
    const payload = { conversationId: 'conversation', senderId: 'user', senderName: 'Name', senderRole: 'docente',
      text: 'texto', attachment: undefined, replyTo: undefined, categoryTag: 'Aviso' };
    send();
    assert.deepEqual(log.splice(0), [['store', payload], ...reset]);
    scope.inputText = ' '; send(); assert.deepEqual(log, [], 'blank guard has no effects');
    const attachment = { id: 'file', name: 'Guide.pdf', size: '1 MB', type: 'pdf' };
    const reply = { id: 'old', senderName: 'Teacher', text: 'Question' };
    Object.assign(scope, { attachedFile: attachment, replyingTo: { ...reply, senderId: 'teacher' } });
    send();
    assert.deepEqual(log.splice(0), [['store', { ...payload, text: '', attachment, replyTo: reply }], ...reset]);
    scope.activeConversationId = null; send(); assert.deepEqual(log, [], 'no selection cannot submit a file');
    scope.activeConversationId = 'conversation';
    const rejection = new Error('Rejected');
    scope.messagingStore = { sendMessage: () => { throw rejection; } };
    assert.throws(send, error => error === rejection);
    assert.deepEqual(log, [], 'a rejected send must not reset the draft');

    const effects = nodes(owner, ts.isCallExpression).filter(node => (node as ts.CallExpression).expression.getText(owner) === 'useEffect') as ts.CallExpression[];
    const recordings = effects.filter(node => node.arguments[1]?.getText(owner) === '[isRecordingAudio]');
    assert.equal(recordings.length, 1);
    const recording = recordings[0];
    Object.assign(scope, { isRecordingAudio: false, clearInterval: (timer: unknown) => log.push(['clear', timer]) });
    evaluate(recording.arguments[0].getText(owner), scope)()();
    assert.deepEqual(log.splice(0), [['RecordingSeconds', 0], ['clear', undefined]]);
    Object.assign(scope, { isRecordingAudio: true, setInterval: (tick: () => void, delay: number) => { log.push(['interval', delay]); tick(); return 42; } });
    evaluate(recording.arguments[0].getText(owner), scope)()();
    assert.equal((log[1] as unknown[])[0], 'RecordingSeconds');
    assert.equal(((log[1] as unknown[])[1] as (s: number) => number)(4), 5);
    assert.deepEqual([log[0], log[2]], [['interval', 1000], ['clear', 42]]);
  }
  for (const name of ['handleSendMessage', 'handleSendVoiceNote', 'quickTemplates', 'sampleAttachments']) {
    const before = nodes(original, ts.isVariableDeclaration).filter(node => (node as ts.VariableDeclaration).name.getText(original) === name);
    const after = nodes(current, ts.isVariableDeclaration).filter(node => (node as ts.VariableDeclaration).name.getText(current) === name);
    assert.equal(before.length, 1); assert.equal(after.length, 1);
    assert.equal(lf(after[0].getText(current)), lf(before[0].getText(original)), name);
  }
  // Navigation now resolves synchronously; preserve the four unrelated effects exactly.
  const effectCalls = (sf: ts.SourceFile) => nodes(sf, ts.isCallExpression).filter(node =>
    (node as ts.CallExpression).expression.getText(sf) === 'useEffect') as ts.CallExpression[];
  assert.equal(effectCalls(original).length, 5);
  assert.equal(effectCalls(current).length, 5);
  const unrelatedEffects = effectCalls(current).filter(node => !node.arguments[0].getText(current).includes("setView('mensajes'"));
  assert.equal(unrelatedEffects.length, 4);
  assert.deepEqual(unrelatedEffects.map(node => lf(node.getText(current))),
    effectCalls(original).filter(node => node.arguments[1]?.getText(original) !== '[initialConversationId]').map(node => lf(node.getText(original))));
  const changedState = ['[activeConversationId, setActiveConversationId]', '[isMobileListVisible, setIsMobileListVisible]',
    '[replyingTo, setReplyingTo]', '[attachedFile, setAttachedFile]'];
  for (const declaration of nodes(original, ts.isVariableDeclaration) as ts.VariableDeclaration[]) {
    if (!declaration.initializer || !ts.isCallExpression(declaration.initializer) ||
      !['useState', 'useRef'].includes(declaration.initializer.expression.getText(original)) ||
      changedState.includes(declaration.name.getText(original))) continue;
    const matches = nodes(current, ts.isVariableDeclaration).filter(node =>
      (node as ts.VariableDeclaration).name.getText(current) === declaration.name.getText(original));
    assert.equal(matches.length, 1);
    assert.equal(lf(matches[0].getText(current)), lf(declaration.getText(original)), declaration.name.getText(original));
  }
});

test('current selection guard and isolated composer submit/reset (bounded source execution, not mounted)', async () => {
  const { resolveAccessibleConversation, isolateComposerContext } = await import('../../../components/messaging/SharedMessagingHub');
  const { canAccessConversation } = await import('../application/messageSending');
  const { messagingStore } = await import('../messagingStore');
  const current = parse(readFileSync(hubPath, 'utf8'));
  function initializer(name: string) {
    const matches = nodes(current, ts.isVariableDeclaration).filter(node =>
      (node as ts.VariableDeclaration).name.getText(current) === name) as ts.VariableDeclaration[];
    assert.equal(matches.length, 1, name);
    assert.ok(matches[0].initializer);
    return matches[0].initializer.getText(current);
  }
  const conversations = messagingStore.getConversations();
  const hidden = messagingStore.getConversationById('dm-laura-tomas')!;
  const safe = messagingStore.getConversationById('dm-laura-valentina')!;
  const { log, scope } = harness();
  Object.assign(scope, { conversations, currentUserId: 'alumno-valentina', currentUserName: 'Valentina', effectiveRole: 'alumno',
    initialConversationId: hidden.id, navigationChanged: true, selection: { conversationId: safe.id },
    resolveAccessibleConversation, isolateComposerContext, canAccessConversation,
    setSelection: (value: unknown) => log.push(['selection', value]),
    setIsMobileListVisible: (value: unknown) => log.push(['mobile', value]),
    setView: (...args: unknown[]) => log.push(['view', ...args]),
    messagingStore: { getConversationById: (id: string) => messagingStore.getConversationById(id),
      sendMessage: (value: unknown) => log.push(['store', value]) } });
  const select = evaluate(initializer('selectConversation'), scope);
  select(hidden.id); select('missing');
  assert.deepEqual(log, [], 'manual inaccessible/missing selection must have no effects');
  select(safe.id);
  assert.deepEqual(log.splice(0), [['selection', { conversationId: safe.id, navigationId: hidden.id }], ['mobile', false],
    ['view', 'mensajes', { conversationId: safe.id }]]);
  scope.requestedConversationId = evaluate(initializer('requestedConversationId'), scope);
  assert.equal(scope.requestedConversationId, hidden.id, 'prop target is read during render');
  scope.activeConversation = evaluate(initializer('activeConversation'), scope);
  assert.strictEqual(scope.activeConversation, safe, 'inaccessible prop cannot become active');
  scope.activeConversationId = evaluate(initializer('activeConversationId'), scope);
  const attachment = { id: 'draft', name: 'Draft.pdf', size: '1 MB', type: 'pdf' as const };
  const reply = hidden.messages[0];
  scope.storedComposerContext = { conversationId: hidden.id, replyingTo: reply, attachedFile: attachment };
  const context = evaluate(initializer('composerContext'), scope);
  assert.deepEqual(context, { conversationId: safe.id, replyingTo: null, attachedFile: null });
  Object.assign(scope, context, { inputText: ' retained text ', selectedTag: null });
  evaluate(initializer('handleSendMessage'), scope)();
  assert.deepEqual(log.splice(0), [['store', { conversationId: safe.id, senderId: 'alumno-valentina', senderName: 'Valentina',
    senderRole: 'alumno', text: 'retained text', attachment: undefined, replyTo: undefined, categoryTag: undefined }],
    ['InputText', ''], ['ReplyingTo', null], ['AttachedFile', null], ['SelectedTag', null], ['height', 'auto']]);

  // Execute the current context setters too: sequential clears must preserve each other.
  let stored = { ...context, replyingTo: safe.messages[0], attachedFile: attachment };
  Object.assign(scope, stored, { setComposerContext: (update: (value: typeof stored) => typeof stored) => { stored = update(stored); } });
  scope.setReplyingTo = evaluate(initializer('setReplyingTo'), scope);
  scope.setAttachedFile = evaluate(initializer('setAttachedFile'), scope);
  evaluate(initializer('handleSendMessage'), scope)();
  assert.deepEqual(stored, { conversationId: safe.id, replyingTo: null, attachedFile: null });
  const sent = log.splice(0)[0] as [string, { attachment: unknown; replyTo: unknown }];
  assert.strictEqual(sent[1].attachment, attachment, 'same-thread file is submitted');
  assert.deepEqual(sent[1].replyTo, { id: safe.messages[0].id, senderName: safe.messages[0].senderName, text: safe.messages[0].text });
  scope.conversations = [hidden];
  scope.activeConversation = evaluate(initializer('activeConversation'), scope);
  scope.activeConversationId = evaluate(initializer('activeConversationId'), scope);
  assert.equal(scope.activeConversationId, null, 'no accessible loaded target means no selection');
  evaluate(initializer('handleSendMessage'), scope)();
  assert.deepEqual(log, [], 'no accessible selection cannot submit retained text/context');
});

test('immutable bounded composer JSX, callbacks and controlled binding remain exact', () => {
  const source = readFileSync(hubPath, 'utf8');
  const hub = parse(source);
  const childSource = readFileSync(childPath, 'utf8');
  const child = parse(childSource);
  const mounts = nodes(hub, ts.isJsxSelfClosingElement).filter(node => (node as ts.JsxSelfClosingElement).tagName.getText(hub) === 'MessageComposer');
  assert.equal(mounts.length, 1);
  const mount = mounts[0];
  const parentProps = nodes(mount, ts.isJsxAttribute) as ts.JsxAttribute[];
  const values = ['activeConversationTitle', 'quickTemplates', 'sampleAttachments', 'inputText', 'replyingTo', 'attachedFile', 'isRecordingAudio', 'recordingSeconds', 'showAttachmentPicker', 'textareaRef'];
  assert.equal(parentProps.length, values.length + eventNames.length);
  for (const name of values) {
    const matches = parentProps.filter(node => node.name.getText(hub) === name);
    assert.equal(matches.length, 1);
    assert.equal(expression(matches[0]).getText(hub), name === 'activeConversationTitle' ? 'activeConversation.title' : name);
  }
  const importLine = "import { MessageComposer } from './MessageComposer';\n";
  assert.equal(lf(source).split(importLine).length, 2, 'one composer import');
  assert.ok(lf(source).includes("import { ClassroomInvitationCard } from './ClassroomInvitationCard';\n" + importLine));
  assert.equal(source.split('\r\n').length - 1, source.split('\n').length - 1, 'checkout retains CRLF');
  const delegates = ['() => onTemplateClick(t)', 'onClearReply', 'onClearFile', 'onRecordCancel', 'onVoiceSend', 'onTogglePicker', '() => onSelectAttachment(att)', 'onRecordStart', 'onTextChange', 'onKeyDown', 'onSend'];
  let moved = slice.text;
  for (let index = events.length - 1; index >= 0; index--) {
    const initializer = events[index].initializer!;
    moved = moved.slice(0, initializer.getStart(original) - slice.start) + `{${delegates[index]}}` + moved.slice(initializer.end - slice.start);
    const before = expression(events[index]);
    const after = parse(`const callback = ${currentCallback(index)};`);
    const actual = (nodes(after, ts.isVariableDeclaration)[0] as ts.VariableDeclaration).initializer!;
    assert.equal(indent(ts.isArrowFunction(actual) && ts.isArrowFunction(before) ? actual.body.getText(after) : actual.getText(after)), indent(ts.isArrowFunction(before) ? before.body.getText(original) : before.getText(original)), eventNames[index]);
  }
  moved = moved.replace('activeConversation.title', 'activeConversationTitle');
  const fragments = nodes(child, ts.isJsxFragment) as ts.JsxFragment[];
  assert.equal(fragments.length, 1);
  const fragment = fragments[0];
  const content = childSource.slice(fragment.openingFragment.end, fragment.closingFragment.getStart(child));
  const unwrap = (text: string) => indent(text).replace(/^\n/, '').replace(/\n$/, '');
  assert.equal(unwrap(content), unwrap(moved), 'only eleven callback substitutions and title binding; leading indentation only');
  const originalCalls = nodes(original, ts.isCallExpression).filter(node => node.getStart(original) >= slice.start && node.end <= slice.end);
  assert.deepEqual(originalCalls.map(node => (node as ts.CallExpression).expression.getText(original)), ['quickTemplates.map', 'setInputText', 'setSelectedTag', 'textareaRef.current?.focus', 'setReplyingTo', 'setAttachedFile', 'setIsRecordingAudio', 'setShowAttachmentPicker', 'sampleAttachments.map', 'setAttachedFile', 'setShowAttachmentPicker', 'toast.show', 'setIsRecordingAudio', 'setInputText', 'e.preventDefault', 'handleSendMessage', 'inputText.trim', 'inputText.trim']);
  assert.deepEqual(nodes(child, ts.isCallExpression).map(node => (node as ts.CallExpression).expression.getText(child)), ['quickTemplates.map', 'onTemplateClick', 'sampleAttachments.map', 'onSelectAttachment', 'inputText.trim', 'inputText.trim']);
  const imports = nodes(child, ts.isImportDeclaration) as ts.ImportDeclaration[];
  assert.deepEqual(imports.map(node => node.moduleSpecifier.getText(child)), ["'react'", "'lucide-react'", "'../../types'"]);
  assert.ok(imports[0].importClause?.isTypeOnly && imports[2].importClause?.isTypeOnly);
  assert.ok(childSource.includes('textareaRef: RefObject<HTMLTextAreaElement | null>'));
  const childEvents = nodes(child, ts.isJsxAttribute).filter(node => /^(onClick|onChange|onKeyDown)$/.test((node as ts.JsxAttribute).name.getText(child))) as ts.JsxAttribute[];
  assert.equal(childEvents.length, 11);
  for (let i = 0; i < childEvents.length; i++) {
    assert.equal(expression(childEvents[i]).getText(child), delegates[i]);
    const calls: unknown[] = [];
    const t = {}, att = {}, event = {};
    const scope = Object.fromEntries(eventNames.map(name => [name, (arg: unknown) => calls.push([name, arg])]));
    const callback = evaluate(expression(childEvents[i]).getText(child), { ...scope, t, att });
    callback(event);
    assert.deepEqual(calls, [[eventNames[i], i === 0 ? t : i === 6 ? att : event]], 'child only forwards callbacks');
  }
});

test('controlled SSR variants equal original bounded JSX projection, not private hub-state fixtures', async () => {
  const { MessageComposer } = await import('../../../components/messaging/MessageComposer');
  const base = { activeConversationTitle: 'Conversación de prueba', quickTemplates: [], sampleAttachments: [], inputText: '', replyingTo: null, attachedFile: null, isRecordingAudio: false, recordingSeconds: 0, showAttachmentPicker: false, textareaRef: { current: null }, ...Object.fromEntries(eventNames.map(name => [name, () => {}])) };
  const attachment = { id: 'att', name: 'Trabajo.pdf', size: '1 MB', type: 'pdf' as const };
  const reply = { id: 'reply', senderName: 'Profesora', text: 'Consulta original', senderId: 'teacher', senderRole: 'docente' as const, timestamp: '10:00', dateGroup: 'Hoy', status: 'read' as const };
  const templates = nodes(original, ts.isVariableDeclaration).find(node => (node as ts.VariableDeclaration).name.getText(original) === 'quickTemplates') as ts.VariableDeclaration;
  const iconNodes = nodes(original, node => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)).filter(node => node.getStart(original) >= slice.start && node.end <= slice.end) as (ts.JsxOpeningElement | ts.JsxSelfClosingElement)[];
  const iconNames = [...new Set(iconNodes.map(node => node.tagName.getText(original)).filter(name => /^[A-Z]/.test(name)))];
  assert.deepEqual(iconNames, ['Sparkles', 'CornerUpLeft', 'X', 'FileText', 'Send', 'Paperclip', 'Mic']);
  const iconScope = Object.fromEntries(iconNames.map(name => {
    assert.match(name, /^[A-Z][A-Za-z0-9]*$/, 'bounded icon name is a valid non-reserved parameter');
    assert.ok(Object.hasOwn(icons, name));
    return [name, icons[name as keyof typeof icons]];
  }));
  const parentFragments = nodes(original, ts.isJsxFragment).filter(node => node.getStart(original) < slice.start && node.end > slice.end) as ts.JsxFragment[];
  assert.equal(parentFragments.length, 1, 'one original enclosing fragment');
  assert.equal(baseline.split('              {/* Quick Prompt Chips Bar */}').length, 2, 'one original composer boundary');
  assert.equal(baseline[parentFragments[0].openingFragment.end], '\n', 'original fragment opening is multiline');
  assert.equal(baseline[slice.start - 1], '\n', 'original composer starts on its own line');
  assert.equal(baseline.slice(slice.end, parentFragments[0].closingFragment.getStart(original)), '            ', 'original closing fragment is on its own line');
  const compiled = ts.transpileModule(`(<>\n${slice.text}\n</>)`, { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext } });
  assert.equal(compiled.diagnostics?.length, 0, 'original projection transpile diagnostics');
  const projection = compiled.outputText;
  let comparisons = 0;
  const variants = [{}, { replyingTo: reply }, { attachedFile: attachment }, { replyingTo: reply, attachedFile: attachment, inputText: ' texto ' }, { showAttachmentPicker: true, sampleAttachments: [attachment] }, ...[0, 9, 10, 65].map(recordingSeconds => ({ isRecordingAudio: true, recordingSeconds })), { inputText: '   ' }, { inputText: 'mensaje' }];
  for (const role of ['docente', 'alumno', 'none']) {
    const quickTemplates = evaluate(templates.initializer!.getText(original), { currentRole: role });
    for (const variant of variants) {
      const props = { ...base, quickTemplates, ...variant };
      const scope = { ...harness().scope, ...props, ...iconScope, React, activeConversation: { title: props.activeConversationTitle } };
      const before = new Function(...Object.keys(scope), `return ${projection}`)(...Object.values(scope));
      // Runtime props are complete; structural and lint checks protect their typed production contract.
      const after = createElement(MessageComposer, props as React.ComponentProps<typeof MessageComposer>);
      assert.equal(renderToStaticMarkup(after), renderToStaticMarkup(before), `${role}: ${JSON.stringify(variant)}`);
      comparisons++;
    }
  }
  assert.equal(comparisons, 33);
  console.log('controlled SSR: 33 variants match original projection; no private hub-state SSR claim');
});
