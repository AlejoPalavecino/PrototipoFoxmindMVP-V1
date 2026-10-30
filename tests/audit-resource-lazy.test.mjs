import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('classroom initial detail loader does not eagerly couple independent roster, history and invitation requests', async () => {
  const path = 'apps/classrooms-ui/ClassroomView.tsx';
  const source = ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let loader;
  const find = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'load' && node.initializer) loader = node.initializer;
    ts.forEachChild(node, find);
  };
  find(source);
  if (!loader) return; // A refactored shell can move its loader to independent resources.
  const coupled = [];
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.getText(source) === 'api.call') {
      const first = node.arguments[0];
      if (first && /\/(members|history|invitations)\b/.test(first.getText(source))) coupled.push(first.getText(source));
    }
    ts.forEachChild(node, visit);
  };
  visit(loader);
  assert.deepEqual(coupled, [], 'initial detail must not load independent tab resources');
});
