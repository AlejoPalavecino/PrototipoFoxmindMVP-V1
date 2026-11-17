import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { citationAttachment } from '../citation-repository.ts';
const input = { attachmentId: '10000000-0000-4000-8000-000000000001', ownerId: '10000000-0000-4000-8000-000000000002', conversationId: '10000000-0000-4000-8000-000000000003' };

test('attachment repository preserves owner/conversation binding and cleanup visibility on caller tx', async () => {
 for (const rows of [[], [{ id: input.attachmentId }]]) {
  const calls = [], tx = { async query(sql, ...values) { calls.push({ sql, values }); return rows; } };
  assert.equal(await citationAttachment(tx, input), rows.length > 0); assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, [input.attachmentId, input.ownerId, input.conversationId]);
  for (const predicate of ['l.attachment_id=a.id AND l.owner_id=a.owner_id', 'a.owner_id=$2::uuid', 'l.conversation_id=$3::uuid', 'l.removed_at IS NULL', 'a.folder_id IS NULL', 'a.ready_at IS NOT NULL', 'a.cleanup_claimed_at IS NULL', 'a.cleaned_at IS NULL']) assert.ok(calls[0].sql.includes(predicate), predicate);
 }
});

test('attachment lookup retains the exact SQL previously issued by application', () => {
 const file = new URL('../citation-repository.ts', import.meta.url), source = readFileSync(file, 'utf8'), ast = ts.createSourceFile(file.pathname, source, ts.ScriptTarget.Latest, true), expressions = [];
 const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'citationAttachment');
 function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'tx.query') expressions.push(node.arguments[0].getText(ast).replaceAll('\r\n','\n')); ts.forEachChild(node, visit); }
 visit(fn);
 assert.equal(createHash('sha256').update(JSON.stringify(expressions)).digest('hex'), 'c2c5fa159d929df56e256476559db6739e9561f2b7df98a7700fd9948ab3d183');
 const application = readFileSync(new URL('../../application/citation-service.ts', import.meta.url), 'utf8');
 assert.doesNotMatch(application, /\btx\.query\s*[(<]|\bSELECT\b/);
});
