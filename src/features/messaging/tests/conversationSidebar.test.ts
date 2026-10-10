import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import type { Role } from '../../../types';

const hubUrl = new URL('../../../components/messaging/SharedMessagingHub.tsx', import.meta.url);
function sidebarMarkup(html: string) {
  const start = html.indexOf('<div class="w-full md:w-80');
  const end = html.indexOf('<div class="flex-1 flex flex-col bg-fox-bg/20 min-w-0', start);
  assert.ok(start >= 0 && end > start);
  return html.slice(start, end);
}

// Node test files have isolated processes. Import the actual base singleton used
// by the hub, with storage absent; persistence falls back without global doubles.
// SSR skips effects: these checks do not prove clicks, read marking or scrolling.
for (const role of ['docente', 'alumno', 'none'] as const satisfies readonly Role[]) {
  test(`actual hub sidebar SSR: ${role}`, async () => {
    assert.equal(typeof globalThis.localStorage, 'undefined');
    const { SharedMessagingHub } = await import(hubUrl.href);
    const { messagingStore } = await import('../messagingStore');
    const conversations = messagingStore.getConversations();
    const before = JSON.stringify(conversations);
    const html = renderToStaticMarkup(createElement(SharedMessagingHub, { currentRole: role }));
    const sidebar = sidebarMarkup(html);
    const userId = role === 'alumno' ? 'alumno-valentina' : 'docente-laura';
    const accessible = conversations.filter(c => c.type !== 'direct' || c.participants.some(p => p.id === userId));
    const labels = role === 'docente' ? ['Alumnos', 'Canales 3°', 'Colegas', 'Foxy IA'] : ['Mis Profes', 'Canales de Aula', 'Foxy Tutor'];
    for (const label of ['Todos', 'No leídos', ...labels]) {
      assert.ok(sidebar.includes(`>${label}<`), label);
    }
    const headings = [...sidebar.matchAll(/<div class="px-4 py-[12] text-\[10px\][^"]*">((?:<svg\b[^>]*>[\s\S]*?<\/svg>)?[^<]*)<\/div>/g)]
      .map(match => match[1].replace(/<svg\b[\s\S]*?<\/svg>/g, '').trim());
    assert.deepEqual(headings, ['Fijados', 'Todas las conversaciones']);
    const ordered = [...accessible.filter(c => c.isPinned), ...accessible.filter(c => !c.isPinned)];
    assert.deepEqual([...sidebar.matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map(match => match[1]), ordered.map(c => c.title));
    assert.deepEqual([...sidebar.matchAll(/animate-bounce">(\d+)<\/span>/g)].map(match => Number(match[1])),
      ordered.map(c => role === 'docente' ? c.unreadCountDocente : c.unreadCountAlumno).filter(n => n > 0));
    assert.ok(sidebar.includes('lucide-users') && sidebar.includes('🦊') && sidebar.includes('>VR<'));
    assert.equal((sidebar.match(/border-l-fox-orange/g) || []).length, 1);
    assert.equal(JSON.stringify(messagingStore.getConversations()), before, 'SSR must not mutate the actual store');
  });
}

function nodes(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = [];
  function visit(node: ts.Node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}

test('actual hub SSR rejects an inaccessible initial target before effects', async () => {
  const { SharedMessagingHub } = await import(hubUrl.href);
  const { messagingStore } = await import('../messagingStore');
  const hidden = messagingStore.getConversationById('dm-laura-tomas')!;
  const fallback = messagingStore.getConversationById('dm-laura-valentina')!;
  for (const initialConversationId of [hidden.id, 'missing', fallback.id]) {
    const html = renderToStaticMarkup(createElement(SharedMessagingHub, {
      currentRole: 'alumno', initialConversationId,
    }));
    assert.ok(!html.includes(hidden.title));
    for (const message of hidden.messages) assert.ok(!html.includes(message.text));
    assert.ok(html.includes(`<h3 class="font-heading font-bold text-fox-text-main text-sm sm:text-base truncate">${fallback.title}</h3>`));
    assert.ok(html.includes(fallback.messages[0].text));
  }
});

test('selection resolver enforces membership for manual/prop targets, loaded updates and user changes', async () => {
  const { resolveAccessibleConversation } = await import(hubUrl.href);
  const { messagingStore } = await import('../messagingStore');
  const conversations = messagingStore.getConversations();
  const hidden = conversations.find(c => c.id === 'dm-laura-tomas')!;
  const fallback = conversations.find(c => c.id === 'dm-laura-valentina')!;
  assert.strictEqual(resolveAccessibleConversation(conversations, 'alumno-valentina', hidden.id), fallback);
  assert.strictEqual(resolveAccessibleConversation(conversations, 'docente-laura', hidden.id), hidden);
  assert.equal(resolveAccessibleConversation([hidden], 'alumno-valentina', hidden.id), null);
  assert.equal(resolveAccessibleConversation([], 'alumno-valentina', fallback.id), null);
  const revoked = { ...fallback, participants: [] };
  assert.strictEqual(resolveAccessibleConversation([revoked, hidden], 'docente-laura', fallback.id), hidden);
  assert.equal(resolveAccessibleConversation([revoked], 'alumno-valentina', fallback.id), null);
  for (const type of ['channel', 'bot'] as const) {
    const open = { ...hidden, type, participants: [] };
    assert.strictEqual(resolveAccessibleConversation([open], 'alumno-valentina', open.id), open);
  }
});

test('composer context clears on thread changes, including no selection, but not same-thread rerenders', async () => {
  const { isolateComposerContext } = await import(hubUrl.href);
  const { messagingStore } = await import('../messagingStore');
  const conversation = messagingStore.getConversationById('dm-laura-valentina')!;
  const context = {
    conversationId: conversation.id, replyingTo: conversation.messages[0],
    attachedFile: { id: 'draft', name: 'Draft.pdf', size: '1 MB', type: 'pdf' as const },
  };
  assert.strictEqual(isolateComposerContext(context, conversation.id), context);
  for (const conversationId of ['dm-laura-tomas', null]) {
    const next = isolateComposerContext(context, conversationId);
    assert.deepEqual(next, { conversationId, replyingTo: null, attachedFile: null });
    assert.deepEqual(isolateComposerContext(next, conversation.id), {
      conversationId: conversation.id, replyingTo: null, attachedFile: null,
    });
  }
  assert.equal(context.replyingTo, conversation.messages[0]);
  assert.equal(context.attachedFile.name, 'Draft.pdf');
});

test('AST: selection access guard and synchronous composer isolation wiring (not mounted interaction proof)', () => {
  const source = readFileSync(hubUrl, 'utf8');
  const ast = ts.createSourceFile('hub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const selection = nodes(ast, ts.isVariableDeclaration).find(node =>
    (node as ts.VariableDeclaration).name.getText(ast) === 'selectConversation');
  assert.ok(selection);
  assert.match(selection.getText(ast), /canAccessConversation\(conversation, currentUserId\)/);
  assert.match(selection.getText(ast), /setSelection/);
  assert.match(source, /isolateComposerContext\(storedComposerContext, activeConversationId\)/);
  assert.match(source, /if \(composerContext !== storedComposerContext\) setComposerContext\(composerContext\)/);
  assert.match(source, /conversations\.filter\(conv => canAccessConversation\(conv, currentUserId\)\)/);
  assert.match(source, /resolveAccessibleConversation\(conversations, currentUserId, requestedConversationId\)/);
  assert.match(source, /const \{ replyingTo, attachedFile \} = composerContext/);
  const composer = nodes(ast, ts.isJsxSelfClosingElement).find(node =>
    (node as ts.JsxSelfClosingElement).tagName.getText(ast) === 'MessageComposer');
  assert.ok(composer);
  const props = nodes(composer, ts.isJsxAttribute).map(node => node.getText(ast).replace(/\s/g, ''));
  assert.ok(props.includes('replyingTo={replyingTo}') && props.includes('attachedFile={attachedFile}'));
  const send = nodes(ast, ts.isVariableDeclaration).find(node =>
    (node as ts.VariableDeclaration).name.getText(ast) === 'handleSendMessage');
  assert.ok(send);
  assert.match(send.getText(ast), /attachment: attachedFile \|\| undefined/);
  assert.match(send.getText(ast), /replyTo: replyingTo \?/);
  const stateNames = nodes(ast, ts.isVariableDeclaration).filter(node => {
    const declaration = node as ts.VariableDeclaration;
    return declaration.initializer && ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText(ast) === 'useState';
  }).map(node => (node as ts.VariableDeclaration).name.getText(ast));
  for (const name of ['searchQuery', 'filterType', 'selection', 'storedComposerContext', 'isMobileListVisible']) {
    assert.ok(stateNames.some(state => state.startsWith(`[${name},`)), name);
  }
});

test('AST: controlled sidebar wiring, stable keys and no store/hooks', () => {
  const hub = ts.createSourceFile('hub.tsx', readFileSync(hubUrl, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const mount = nodes(hub, ts.isJsxSelfClosingElement).find(node => (node as ts.JsxSelfClosingElement).tagName.getText(hub) === 'ConversationSidebar');
  assert.ok(mount);
  const attributes = nodes(mount, ts.isJsxAttribute).map(node => node.getText(hub).replace(/\s/g, ''));
  for (const name of ['currentRole', 'searchQuery', 'filterType', 'activeConversationId', 'isMobileListVisible', 'filteredConversations', 'pinnedConversations', 'regularConversations']) {
    assert.ok(attributes.includes(`${name}={${name}}`), name);
  }
  for (const binding of ['onSearchChange={setSearchQuery}', "onClearSearch={()=>setSearchQuery('')}", 'onFilterChange={setFilterType}', 'onSelectConversation={selectConversation}', 'onNewConversation={()=>setShowNewModal(true)}']) {
    assert.ok(attributes.includes(binding), binding);
  }
  const sidebar = ts.createSourceFile('sidebar.tsx', readFileSync(new URL('../../../components/messaging/ConversationSidebar.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(nodes(sidebar, ts.isImportDeclaration).map(node => (node as ts.ImportDeclaration).moduleSpecifier.getText(sidebar)), ["'lucide-react'", "'../../types'"]);
  assert.equal(nodes(sidebar, ts.isCallExpression).filter(node => /^use[A-Z]/.test((node as ts.CallExpression).expression.getText(sidebar))).length, 0);
  const item = nodes(sidebar, ts.isFunctionDeclaration).find(node => (node as ts.FunctionDeclaration).name?.text === 'renderConversationItem');
  assert.ok(item);
  const itemAttributes = nodes(item, ts.isJsxAttribute).map(node => node.getText(sidebar));
  assert.ok(itemAttributes.includes('key={conv.id}'));
  assert.ok(itemAttributes.includes('onClick={() => onSelectConversation(conv.id)}'));
});

test('presentation retains existing search/filter pinned suppression, mobile and empty branches', async () => {
  const { ConversationSidebar } = await import('../../../components/messaging/ConversationSidebar');
  const { messagingStore } = await import('../messagingStore');
  const conversations = messagingStore.getConversations();
  const regular = conversations.filter(c => !c.isPinned);
  const props = {
    currentRole: 'docente' as const, searchQuery: '', filterType: 'todos', activeConversationId: null,
    isMobileListVisible: false, filteredConversations: conversations,
    pinnedConversations: conversations.filter(c => c.isPinned), regularConversations: regular,
    onSearchChange: () => {}, onClearSearch: () => {}, onFilterChange: () => {},
    onSelectConversation: () => {}, onNewConversation: () => {},
  };
  for (const alternate of [{ searchQuery: 'consulta' }, { filterType: 'unread' }]) {
    const html = renderToStaticMarkup(createElement(ConversationSidebar, { ...props, ...alternate }));
    assert.ok(html.includes('hidden md:flex'));
    assert.ok(!html.includes('Fijados') && !html.includes('Todas las conversaciones'));
    assert.deepEqual([...html.matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map(match => match[1]), regular.map(c => c.title));
  }
  const empty = renderToStaticMarkup(createElement(ConversationSidebar, { ...props, filteredConversations: [], pinnedConversations: [], regularConversations: [] }));
  assert.ok(empty.includes('No se encontraron conversaciones.') && empty.includes('Iniciar nuevo mensaje'));
  assert.equal((empty.match(/<h4/g) || []).length, 0);
});
