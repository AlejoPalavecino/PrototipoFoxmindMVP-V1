import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import type { Role } from '../../../types';

const hubUrl = new URL('../../../components/messaging/SharedMessagingHub.tsx', import.meta.url);
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const sidebarHashes = {
  docente: '4b90a13da1204f98e5f8d37ace84ac730df9be0bf6b7f34ad37d2eb8ce389015',
  alumno: '3421d238a0305772fbdcf49cbec74fd357b125ff02b65b8e175ae91c54545433',
  none: '3421d238a0305772fbdcf49cbec74fd357b125ff02b65b8e175ae91c54545433',
};
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
    console.log(`${role} sidebar SHA256 ${digest(sidebar)}`);
    assert.equal(digest(sidebar), sidebarHashes[role], 'complete pre-extraction sidebar markup');
    const labels = role === 'docente' ? ['Alumnos', 'Canales 3°', 'Colegas', 'Foxy IA'] : ['Mis Profes', 'Canales de Aula', 'Foxy Tutor'];
    for (const label of ['Todos', 'No leídos', ...labels]) {
      assert.ok(sidebar.includes(`>${label}<`), label);
    }
    const headings = [...sidebar.matchAll(/<div class="px-4 py-[12] text-\[10px\][^"]*">((?:<svg\b[^>]*>[\s\S]*?<\/svg>)?[^<]*)<\/div>/g)]
      .map(match => match[1].replace(/<svg\b[\s\S]*?<\/svg>/g, '').trim());
    assert.deepEqual(headings, ['Fijados', 'Todas las conversaciones']);
    const ordered = [...conversations.filter(c => c.isPinned), ...conversations.filter(c => !c.isPinned)];
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

test('AST: selection setter order and hub state ownership survive extraction', () => {
  const source = readFileSync(hubUrl, 'utf8');
  const ast = ts.createSourceFile('hub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = nodes(ast, ts.isArrowFunction);
  assert.ok(callbacks.some(node => node.getText(ast).replace(/\s/g, '') ===
    '()=>{setActiveConversationId(conv.id);setIsMobileListVisible(false);}' ||
    node.getText(ast).replace(/\s/g, '') ===
    '(conversationId)=>{setActiveConversationId(conversationId);setIsMobileListVisible(false);}'));
  const stateNames = nodes(ast, ts.isVariableDeclaration).filter(node => {
    const declaration = node as ts.VariableDeclaration;
    return declaration.initializer && ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText(ast) === 'useState';
  }).map(node => (node as ts.VariableDeclaration).name.getText(ast));
  assert.equal(stateNames.length, 19);
  for (const name of ['searchQuery', 'filterType', 'activeConversationId', 'isMobileListVisible']) {
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
  for (const binding of ['onSearchChange={setSearchQuery}', "onClearSearch={()=>setSearchQuery('')}", 'onFilterChange={setFilterType}', 'onSelectConversation={(conversationId)=>{setActiveConversationId(conversationId);setIsMobileListVisible(false);}}', 'onNewConversation={()=>setShowNewModal(true)}']) {
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
