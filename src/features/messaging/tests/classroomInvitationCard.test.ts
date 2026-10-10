import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import type { ClassroomInvitationData, DirectMessageItem } from '../../../types';

const hubUrl = new URL('../../../components/messaging/SharedMessagingHub.tsx', import.meta.url);

function invitationMarkup(html: string) {
  const starts = [...html.matchAll(/<div class="mt-3\.5 rounded-2xl overflow-hidden border shadow-sm /g)];
  assert.equal(starts.length, 1, 'exactly one invitation card');
  const start = starts[0].index!;
  let depth = 0;
  for (const tag of html.slice(start).matchAll(/<div\b[^>]*>|<\/div>/g)) {
    depth += tag[0] === '</div>' ? -1 : 1;
    if (depth === 0) return html.slice(start, start + tag.index! + tag[0].length);
  }
  assert.fail('unbalanced invitation card markup');
}

// Actual singleton, no storage/global doubles or production seam. SSR skips effects
// and cannot establish browser clicks, layout, subscription or navigation behavior.
for (const role of ['docente', 'alumno'] as const) {
  for (const status of ['pending', 'accepted', 'declined'] as const) {
    for (const isMe of [false, true]) {
      const label = `${role}/${status}/${isMe}`;
      test(`actual hub invitation SSR: ${label}`, async () => {
        assert.equal(typeof globalThis.localStorage, 'undefined');
        const { SharedMessagingHub } = await import(hubUrl.href);
        const { messagingStore } = await import('../messagingStore');
        const conversation = messagingStore.getConversationById('dm-laura-valentina')!;
        const originalMessages = conversation.messages;
        const before = JSON.stringify(messagingStore.getConversations());
        const invitation: ClassroomInvitationData = {
          classroomId: 'fixture-aula', subject: 'Literatura de prueba', course: '3° A',
          teacherName: 'Prof. Laura Martínez', code: 'TEST42', status,
          color: isMe ? 'bg-fox-orange' : '', description: isMe ? 'Descripción de prueba' : undefined,
          schedule: status === 'pending' ? ['Lunes 08:00', 'Viernes 10:00'] : status === 'accepted' ? [] : undefined,
        };
        const senderRole = isMe ? role : role === 'docente' ? 'alumno' : 'docente';
        const message: DirectMessageItem = {
          id: 'fixture-invitation', senderId: senderRole === 'docente' ? 'docente-laura' : 'alumno-valentina',
          senderName: senderRole === 'docente' ? 'Prof. Laura Martínez' : 'Valentina Rodríguez', senderRole,
          text: 'Mensaje previo a la tarjeta', timestamp: '10:00', dateGroup: 'Hoy', status: 'read', invitation,
        };
        try {
          conversation.messages = [message];
          const fixtureBefore = JSON.stringify(messagingStore.getConversations());
          const html = renderToStaticMarkup(createElement(SharedMessagingHub, { currentRole: role }));
          const card = invitationMarkup(html);
          const { ClassroomInvitationCard } = await import('../../../components/messaging/ClassroomInvitationCard');
          // Exact card integration output, not a snapshot of unrelated hub navigation.
          // The explicit status/copy/style assertions below independently constrain the card.
          const expected = renderToStaticMarkup(createElement(ClassroomInvitationCard, {
            invitation, isMe, effectiveRole: role,
            onCopy: () => {}, onAccept: () => {}, onDecline: () => {}, onNavigate: () => {},
          }));
          assert.equal(card, expected, 'actual hub card equals the complete controlled card');
          const start = html.indexOf('<div class="w-full md:w-80');
          const end = html.indexOf('<div class="flex-1 flex flex-col bg-fox-bg/20 min-w-0', start);
          assert.ok(start >= 0 && end > start);
          const sidebar = html.slice(start, end);
          const userId = role === 'alumno' ? 'alumno-valentina' : 'docente-laura';
          const accessible = messagingStore.getConversations().filter(c =>
            c.type !== 'direct' || c.participants.some(p => p.id === userId));
          const ordered = [...accessible.filter(c => c.isPinned), ...accessible.filter(c => !c.isPinned)];
          assert.deepEqual([...sidebar.matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map(match => match[1]),
            ordered.map(c => c.title), 'membership-filtered sidebar, including unchanged channel access/order');
          assert.ok(card.includes('Invitación a Aula Virtual') && card.includes('Literatura de prueba'));
          assert.ok(card.includes('Copiar código de aula') && card.includes('TEST42'));
          assert.equal(card.includes('Horario: Lunes 08:00 • Viernes 10:00'), status === 'pending');
          assert.equal(card.includes('Descripción de prueba'), isMe);
          assert.ok(card.includes(isMe ? 'bg-black/20 border-white/25 text-white' : 'bg-fox-surface border-fox-border text-fox-text-main'));
          assert.ok(card.includes(isMe ? 'bg-fox-orange' : 'bg-fox-purple'));
          assert.equal(card.includes('Aceptar e Ingresar'), status === 'pending' && role === 'alumno');
          assert.equal(card.includes('Esperando aceptación'), status === 'pending' && role === 'docente');
          assert.equal(card.includes('Ir al Aula'), status === 'accepted');
          assert.equal(card.includes('Invitación declinada por el estudiante'), status === 'declined');
          assert.equal(JSON.stringify(messagingStore.getConversations()), fixtureBefore, 'SSR must not mutate the fixture');
        } finally {
          conversation.messages = originalMessages;
          assert.equal(conversation.messages, originalMessages);
          assert.equal(JSON.stringify(messagingStore.getConversations()), before, 'restore all singleton state');
        }
      });
    }
  }
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

test('actual hub callback wiring keeps effects and late message lookups in the parent', () => {
  const hub = ts.createSourceFile('hub.tsx', readFileSync(hubUrl, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const mounts = nodes(hub, ts.isJsxSelfClosingElement).filter(node => (node as ts.JsxSelfClosingElement).tagName.getText(hub) === 'ClassroomInvitationCard');
  assert.equal(mounts.length, 1);
  const attributes = new Map(nodes(mounts[0], ts.isJsxAttribute).map(node => [(node as ts.JsxAttribute).name.getText(hub), node as ts.JsxAttribute]));
  for (const [name, value] of Object.entries({ invitation: 'msg.invitation', isMe: 'isMe', effectiveRole: 'effectiveRole' })) {
    assert.equal(attributes.get(name)?.initializer?.getText(hub), `{${value}}`);
  }
  const events: unknown[] = [];
  const msg = { id: 'message', invitation: { code: 'OLD', subject: 'Original' } };
  const store = { respondToClassroomInvitation: (params: unknown) => { events.push(params); msg.invitation = { code: 'AFTER', subject: 'After notification' }; } };
  const toast = { show: (...args: unknown[]) => events.push(args) };
  const navigator = { clipboard: { writeText: (code: string) => { events.push(code); return new Promise(() => {}); } } };
  function callback(name: string) {
    const initializer = attributes.get(name)?.initializer;
    assert.ok(initializer && ts.isJsxExpression(initializer) && initializer.expression && ts.isArrowFunction(initializer.expression));
    assert.equal(nodes(initializer.expression, ts.isAwaitExpression).length, 0);
    const code = ts.transpileModule(initializer.expression.getText(hub), { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText.replace(/;\s*$/, '');
    return new Function('msg', 'activeConversation', 'currentUserId', 'currentUserName', 'messagingStore', 'toast', 'navigator', 'setView', `return (${code});`)(msg, { id: 'conversation' }, 'student-id', 'Student Name', store, toast, navigator, (view: string) => events.push(view));
  }
  const copy = callback('onCopy');
  msg.invitation = { code: 'AT_CLICK', subject: 'Before notification' };
  assert.equal(copy(), undefined);
  assert.deepEqual(events.splice(0), ['AT_CLICK', ['Código copiado al portapapeles', 'info']], 'toast is immediate despite unresolved clipboard promise');
  for (const response of ['accepted', 'declined'] as const) {
    const respond = callback(response === 'accepted' ? 'onAccept' : 'onDecline');
    msg.invitation = { code: 'NEW', subject: 'Before notification' };
    respond();
    assert.deepEqual(events.splice(0), [
      { conversationId: 'conversation', messageId: 'message', response, responderId: 'student-id', responderName: 'Student Name' },
      response === 'accepted' ? ['🎉 ¡Te uniste al aula After notification! Ya está en tus Aulas.', 'success'] : ['Invitación declinada', 'info'],
    ]);
  }
  callback('onNavigate')();
  assert.deepEqual(events, ['aulas']);
  const card = ts.createSourceFile('card.tsx', readFileSync(new URL('../../../components/messaging/ClassroomInvitationCard.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(nodes(card, ts.isImportDeclaration).map(node => (node as ts.ImportDeclaration).moduleSpecifier.getText(card)), ["'lucide-react'", "'../../types'"]);
  assert.equal((nodes(card, ts.isImportDeclaration)[1] as ts.ImportDeclaration).importClause?.isTypeOnly, true);
  assert.deepEqual(nodes(card, ts.isCallExpression).map(node => (node as ts.CallExpression).expression.getText(card)), ['invitation.schedule.join']);
  assert.deepEqual(nodes(card, ts.isJsxAttribute).filter(node => (node as ts.JsxAttribute).name.getText(card) === 'onClick').map(node => (node as ts.JsxAttribute).initializer?.getText(card)), ['{onCopy}', '{onAccept}', '{onDecline}', '{onNavigate}']);
});
