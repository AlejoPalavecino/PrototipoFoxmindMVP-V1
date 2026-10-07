import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const modalPath = 'src/views/alumno/estudio/StudyQuizModal.tsx';
const pagePath = 'src/views/alumno/EstudiaAlumno.tsx';
const operationsUrl = new URL('../application/quizProgress.ts', import.meta.url);
const operations = existsSync(operationsUrl) ? await import(operationsUrl.href) : {};
const parse = (path: string, text = readFileSync(path, 'utf8')) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const modal = parse(modalPath);
// Compose only the T5d1 reversal before the existing historical restorations.
const page = parse(pagePath, undoTopicExtraction(readFileSync(pagePath, 'utf8')));
function undoTopicExtraction(text: string) {
  const file = parse(pagePath, text);
  const imported = file.statements.filter(ts.isImportDeclaration).find(n => (n.moduleSpecifier as ts.StringLiteral).text.endsWith('/studyTopicGeneration'));
  if (!imported) return text;
  const fixed = parse(pagePath, execFileSync('git', ['show', 'b0a18f9773f1838c4191200a38eafefaf27ec85d:' + pagePath], { encoding: 'utf8' }));
  const current = find(file, n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(file) === 'detectedTopics'));
  const original = find(fixed, n => ts.isVariableDeclaration(n) && n.name.getText(fixed) === 'handleAnalyzeStudyMaterial');
  const start = fixed.text.indexOf('      let detectedTopics:', original.getStart(fixed));
  const end = fixed.text.indexOf('      setNewFolderForm', start);
  assert.ok(start > 0 && end > start);
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const branch = fixed.text.slice(start, end).trim().replace(/\r?\n/g, newline);
  const restored = text.slice(0, current.getStart(file)) + branch + text.slice(current.end);
  return restored.slice(0, imported.getStart(file)) + restored.slice(imported.end + newline.length);
}
function find(file: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) { assert.equal(found, undefined); found = node; } ts.forEachChild(node, visit); }
  visit(file);
  assert.ok(found);
  return found;
}
const component = find(modal, node => ts.isVariableDeclaration(node) && node.name.getText(modal) === 'StudyQuizModal') as ts.VariableDeclaration;
const body = (component.initializer as ts.ArrowFunction).body as ts.Block;
const prefix = body.statements.slice(0, body.statements.findIndex(ts.isReturnStatement));
const quizElement = find(page, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === 'StudyQuizModal') as ts.JsxSelfClosingElement;
const completion = quizElement.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText(page) === 'onComplete') as ts.JsxAttribute;
const folderCallback = (completion.initializer as ts.JsxExpression).expression!;
function evaluate(text: string, bindings: Record<string, any>) {
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), js)(...Object.values(bindings));
}
// Resolve the real import names (including aliases), so execution cannot silently use an unrelated helper.
function imports(file: ts.SourceFile, calls: any[] = []) {
  const bindings: Record<string, any> = {};
  for (const statement of file.statements.filter(ts.isImportDeclaration)) {
    if (!(statement.moduleSpecifier as ts.StringLiteral).text.endsWith('/quizProgress')) continue;
    const named = statement.importClause?.namedBindings;
    assert.ok(named && ts.isNamedImports(named));
    for (const specifier of named.elements) {
      const exported = (specifier.propertyName || specifier.name).text;
      assert.equal(typeof operations[exported], 'function');
      bindings[specifier.name.text] = (...args: any[]) => { calls.push([exported, ...args]); return operations[exported](...args); };
    }
  }
  return bindings;
}
function quizHarness(questions = [{ correctIndex: 1 }], index = 0, callback = true) {
  const state: any[] = [index, null, false, 0, false, []];
  const events: any[] = [];
  const calls: any[] = [];
  const names = ['index', 'selected', 'answered', 'score', 'finished', 'answers'];
  function render(isOpen = true) {
    let slot = 0;
    return evaluate(`${prefix.map(node => node.getText(modal)).join('\n')}\nreturn { handleSelectOption, handleNext, handleRestart, currentQ, percentage };`, {
      ...imports(modal, calls), quiz: { questions }, isOpen,
      useState: () => { const position = slot++; return [state[position], (value: any) => {
        state[position] = typeof value === 'function' ? value(state[position]) : value;
        events.push([names[position], state[position]]);
      }]; },
      toast: { show: (...args: any[]) => events.push(['toast', ...args]) },
      onComplete: callback ? (...args: any[]) => events.push(['complete', ...args]) : undefined
    });
  }
  return { state, events, calls, render };
}
function folderHarness(activeFolderId: string | null, folders: any[]) {
  const updates: ((prior: any[]) => any[])[] = [];
  const calls: any[] = [];
  const complete = evaluate(`return (${folderCallback.getText(page)});`, {
    ...imports(page, calls), activeFolderId, setFolders: (update: any) => { assert.equal(typeof update, 'function'); updates.push(update); }
  });
  return { complete, updates, calls, apply: (prior = folders) => updates[0](prior) };
}

test('final Next retains last-correct double adjustment, incorrect/null and synchronous finish ordering', () => {
  for (const selected of [1, 0, null]) {
    const h = quizHarness();
    if (selected !== null) h.render().handleSelectOption(selected);
    assert.equal(h.state[3], selected === 1 ? 1 : 0);
    h.events.length = 0;
    h.render().handleNext();
    assert.deepEqual(h.events, [['finished', true], ['complete', selected === 1 ? 2 : 0, 1]]);
  }
});

test('captured score/total and live correctIndex read survive mutation; next resets and restart stay local', () => {
  const questions = [{ correctIndex: 1 }, { correctIndex: 1 }];
  const h = quizHarness(questions, 1);
  h.state[1] = 1;
  h.state[3] = 4;
  const captured = h.render();
  h.state[3] = 90;
  questions.push({ correctIndex: 0 });
  questions[1].correctIndex = 0;
  captured.handleNext();
  assert.deepEqual(h.events, [['finished', true], ['complete', 4, 2]]);
  const next = quizHarness(questions);
  next.render().handleSelectOption(1);
  next.events.length = 0;
  next.render().handleNext();
  assert.deepEqual(next.events, [['index', 1], ['selected', null], ['answered', false]]);
  assert.equal(next.state[3], 1);
  next.render().handleRestart();
  assert.deepEqual(next.events.slice(-6), [['index', 0], ['selected', null], ['answered', false], ['score', 0], ['finished', false], ['answers', []]]);
});

test('optional completion, empty invalid dereference, closed modal and fallback preserve baseline', () => {
  const optional = quizHarness([], 0, false);
  optional.render().handleNext();
  assert.deepEqual(optional.events, [['finished', true]]);
  const empty = quizHarness([]);
  assert.ok(Number.isNaN(empty.render().percentage));
  assert.throws(() => empty.render().handleNext(), TypeError);
  assert.deepEqual(empty.events, [['finished', true]]);
  assert.equal(empty.render(false), null);
  const fallback = quizHarness([{ correctIndex: 1 }], 10);
  fallback.state[1] = 1;
  fallback.render().handleNext();
  assert.deepEqual(fallback.events, [['finished', true], ['complete', 1, 1]]);
});

const progressCases = [
  [20, 1, 2, 28], [20.5, 1, 3, 25.5], [98, 1, 1, 100],
  [-20, 1, 1, -5], [undefined, 1, 2, 8], [0, -1, 2, -7],
  [NaN, 1, 1, 15], [20, NaN, 2, NaN], [20, 1, 0, 100], [20, 0, 0, NaN]
];
test('folder completion keeps active-ID guard, functional current snapshot, map identities and primitive arithmetic', () => {
  const untouched = { id: 'other', progress: 5 };
  for (const [prior, score, total, expected] of progressCases) {
    const folder = { id: 'active', progress: prior, topics: [] };
    const latest = [untouched, folder];
    const h = folderHarness('active', [{ id: 'stale', progress: 90 }]);
    h.complete(score, total);
    assert.equal(h.updates.length, 1);
    const result = h.apply(latest);
    assert.notEqual(result, latest);
    assert.equal(result[0], untouched);
    assert.notEqual(result[1], folder);
    assert.deepEqual(result[1], { ...folder, progress: expected });
    assert.equal(result[1].topics, folder.topics);
    assert.equal(folder.progress, prior);
  }
  for (const id of [null, '']) {
    const h = folderHarness(id, [untouched]);
    h.complete(1, 1);
    assert.equal(h.updates.length, 0);
    assert.deepEqual(h.calls, []);
  }
  const missing = folderHarness('missing', [untouched]);
  missing.complete(1, 1);
  assert.equal(missing.apply()[0], untouched);
});

test('entire source outside calculation expressions/imports and session updater preserves fixed pre-extraction source in memory', () => {
  // Full-source SHA256 from Git blobs at 63392b36951c099fea69b860631f182f09ae9dae; only CRLF → LF normalized.
  const baselineHashes = {
    [modalPath]: '95d3c3c0e8f2efd6b311635a3f1b0bbe67131159bd46247202f50929c700deb2',
    [pagePath]: '14e8b1add627af7a0873a7427db76d2b5796584698703ddb34818ba0796f3f63'
  };
  for (const [file, path, helper, original] of [
    [modal, modalPath, 'calculateQuizCompletionScore', 'score + (selectedOpt === currentQ.correctIndex ? 1 : 0)'],
    [page, pagePath, 'calculateFolderQuizProgress', 'Math.min(100, (f.progress || 0) + Math.round((score / total) * 15))']
  ] as const) {
    const replacements: { start: number; end: number; text: string }[] = [];
    const imported = file.statements.filter(ts.isImportDeclaration).find(node => (node.moduleSpecifier as ts.StringLiteral).text.endsWith('/quizProgress'));
    if (imported) {
      replacements.push({ start: imported.getStart(file), end: imported.end + (file.text.slice(imported.end).startsWith('\r\n') ? 2 : 1), text: '' });
      const call = find(file, node => ts.isCallExpression(node) && node.expression.getText(file) === helper);
      replacements.push({ start: call.getStart(file), end: call.end, text: original });
    }
    if (path === pagePath) {
      const resourceImport = file.statements.filter(ts.isImportDeclaration).find(node => (node.moduleSpecifier as ts.StringLiteral).text.endsWith('/resourceCollection'));
      if (resourceImport) {
        replacements.push({ start: resourceImport.getStart(file), end: resourceImport.end + (file.text.slice(resourceImport.end).startsWith('\r\n') ? 2 : 1), text: '' });
        const applicationUrl = new URL('../application/resourceCollection.ts', import.meta.url);
        const application = parse(applicationUrl.pathname, readFileSync(applicationUrl, 'utf8'));
        const named = resourceImport.importClause?.namedBindings;
        assert.ok(named && ts.isNamedImports(named));
        const indentation = (text: string, start: number) => text.slice(text.lastIndexOf('\n', start) + 1, start).match(/^[ \t]*/)![0].length;
        for (const specifier of named.elements) {
          const exported = (specifier.propertyName || specifier.name).text;
          const fn = application.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === exported) as ts.FunctionDeclaration;
          assert.ok(fn?.body);
          const call = find(file, node => ts.isCallExpression(node) && node.expression.getText(file) === specifier.name.text) as ts.CallExpression;
          assert.deepEqual(call.arguments.map(arg => arg.getText(file)), fn.parameters.map(param => param.name.getText(application)));
          const expression = (fn.body.statements.find(ts.isReturnStatement) as ts.ReturnStatement).expression!;
          const shift = indentation(file.text, call.getStart(file)) - indentation(application.text, expression.getStart(application));
          assert.ok(shift >= 0);
          replacements.push({ start: call.getStart(file), end: call.end, text: expression.getText(application).replace(/\r\n/g, '\n').replace(/\n/g, '\n' + ' '.repeat(shift)) });
        }
      }
      const sessionImport = file.statements.filter(ts.isImportDeclaration).find(node => (node.moduleSpecifier as ts.StringLiteral).text.endsWith('/sessionCollection'));
      if (sessionImport) {
        replacements.push({ start: sessionImport.getStart(file), end: sessionImport.end + (file.text.slice(sessionImport.end).startsWith('\r\n') ? 2 : 1), text: '' });
        const callback = find(file, node => ts.isVariableDeclaration(node) && node.name.getText(file) === 'handleUpdateSession') as ts.VariableDeclaration;
        const setter = find(callback, node => ts.isCallExpression(node) && node.expression.getText(file) === 'setSessions') as ts.CallExpression;
        // Literal updater from Git blob 336f007ad5d3f3d16991ea95dc7005e49bea7daf, not candidate-derived.
        const legacyUpdater = `prev => {
      const idx = prev.findIndex(s => s.id === updatedSession.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedSession;
        return next;
      }
      return [updatedSession, ...prev];
    }`;
        replacements.push({ start: setter.arguments[0].getStart(file), end: setter.arguments[0].end, text: legacyUpdater });
      }
    }
    let restored = file.text;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) restored = restored.slice(0, replacement.start) + replacement.text + restored.slice(replacement.end);
    const restoredHash = createHash('sha256').update(restored.replace(/\r\n/g, '\n')).digest('hex');
    assert.equal(restoredHash, baselineHashes[path], path);
  }
});

test('primitive operations are actually consumed at both existing callbacks and own no UI/state dependencies', { skip: !existsSync(operationsUrl) }, () => {
  const h = quizHarness();
  h.render().handleSelectOption(1);
  h.render().handleNext();
  assert.deepEqual(h.calls, [['calculateQuizCompletionScore', 1, 1, 1]]);
  const f = folderHarness('active', [{ id: 'active', progress: 20.5 }]);
  f.complete(1, 3);
  f.apply();
  assert.deepEqual(f.calls, [['calculateFolderQuizProgress', 20.5, 1, 3]]);
  for (const selected of [1, 0, null]) assert.equal(operations.calculateQuizCompletionScore(4, selected, 1), selected === 1 ? 5 : 4);
  for (const [prior, score, total, expected] of progressCases) assert.equal(operations.calculateFolderQuizProgress(prior, score, total), expected);
  const application = parse(operationsUrl.pathname, readFileSync(operationsUrl, 'utf8'));
  assert.equal(application.statements.filter(ts.isImportDeclaration).length, 0);
  assert.equal(application.statements.length, 2);
});
