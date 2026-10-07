import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const modalUrl = new URL('../../../views/alumno/estudio/StudyFlashcardModal.tsx', import.meta.url);
const operationsUrl = new URL('../application/flashcardReview.ts', import.meta.url);
function readSource(url: URL) {
  assert.ok(!url.pathname.split('/').some(part => part.startsWith('.env')));
  assert.ok(!lstatSync(url).isSymbolicLink());
  return ts.createSourceFile(url.pathname, readFileSync(url, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
const source = readSource(modalUrl);
const component = source.statements.find(ts.isVariableStatement)!.declarationList.declarations[0].initializer as ts.ArrowFunction;
const body = component.body as ts.Block;
const prefix = body.statements.slice(0, body.statements.findIndex(ts.isReturnStatement));
const operations = existsSync(operationsUrl) ? await import(operationsUrl.href) : {};
const card = (id: string, mastered?: boolean, timesReviewed?: number) => ({ id, front: id, back: id, mastered, timesReviewed });
const deckFor = (cards: any[]) => ({ id: 'deck', title: 'Deck', folderId: 'folder', folderName: 'Folder', topic: 'Topic', cards, createdAt: 'Ayer', masteryPercentage: 17 });

// Execute the current component's actual pre-JSX statements, not duplicated callback logic.
function harness(cards: any[], index = 0, update = true) {
  const deck = deckFor(cards);
  const state: any[] = [index, true, true, cards, false];
  const events: any[] = [];
  const timers: { callback: () => void; delay: number }[] = [];
  let onToast: (() => void) | undefined;
  const names = ['index', 'flipped', 'hint', 'cards', 'completed'];
  function render(isOpen = true) {
    let slot = 0;
    const bindings = {
      ...operations, deck, isOpen,
      useState: (initial: any) => {
        const position = slot++;
        if (position === 3) assert.equal(initial, deck.cards);
        return [state[position], (value: any) => { state[position] = value; events.push([names[position], value]); }];
      },
      toast: { show: (...args: any[]) => { events.push(['toast', ...args]); onToast?.(); } },
      setTimeout: (callback: () => void, delay: number) => { timers.push({ callback, delay }); events.push(['timer', delay]); },
      onUpdateDeck: update ? (value: any) => events.push(['update', value]) : undefined
    };
    const text = `function render() { ${prefix.map(node => node.getText(source)).join('\n')}\nreturn { handleMarkMastery, handleReviewWeakOnly, handleRestart, handleNext, handlePrev, handleFlip, currentCard, masteryPercentage }; } return render();`;
    const javascript = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new Function(...Object.keys(bindings), javascript)(...Object.values(bindings));
  }
  return { deck, state, events, timers, render, toastEffect: (effect: () => void) => { onToast = effect; } };
}

// Mask only the three extracted expressions; all other statements, JSX and comments remain pinned.
function fingerprint(file: ts.SourceFile, mode: 'modal' | 'types' | 'model') {
  const transformer: ts.TransformerFactory<ts.Node> = context => root => {
    const visit: ts.Visitor = node => {
      if (mode === 'modal') {
        if (ts.isImportDeclaration(node) && (node.moduleSpecifier as ts.StringLiteral).text.endsWith('/flashcardReview')) return undefined;
        if (ts.isVariableDeclaration(node) && ['updated', 'weakCards'].includes(node.name.getText(file))) {
          return ts.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, ts.factory.createIdentifier('EXTRACTED_OPERATION'));
        }
        if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) && node.expression.left.getText(file) === 'updated[currentIndex]') return undefined;
        if (ts.isCallExpression(node) && node.expression.getText(file) === 'onUpdateDeck') {
          return ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [ts.factory.createIdentifier('EXTRACTED_OPERATION')]);
        }
      } else if (mode === 'types') {
        if (ts.isInterfaceDeclaration(node) && ['StudyFlashcard', 'StudyFlashcardDeck'].includes(node.name.text)) return undefined;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return undefined;
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit);
  };
  const transformed = ts.transform(file, [transformer]);
  const printed = ts.createPrinter().printFile(transformed.transformed[0] as ts.SourceFile);
  transformed.dispose();
  return createHash('sha256').update(printed).digest('hex');
}

test('source responsibility: hooks, JSX, timers, non-operation callbacks and unrelated types stay pinned', () => {
  assert.equal(fingerprint(source, 'modal'), 'cb61356d1d999f2d9a1dddc3987e10d4c38820bb4424b5a9b8a7d999bea4da5d');
  const types = readSource(new URL('../../../views/alumno/estudio/estudioTypes.ts', import.meta.url));
  assert.equal(fingerprint(types, 'types'), '8e034603d8982a252e8301f9a6490b04f8202a65ad76bac94e28040173dbdd96');
  const modelUrl = new URL('../model/Flashcard.ts', import.meta.url);
  const declarations = existsSync(modelUrl) ? readSource(modelUrl).statements : types.statements.filter(node => ts.isInterfaceDeclaration(node) && ['StudyFlashcard', 'StudyFlashcardDeck'].includes(node.name.text));
  const model = ts.factory.updateSourceFile(types, declarations);
  assert.equal(fingerprint(model, 'model'), '76e7a5ba5874b2d8ac7a8233d1d3b002f569033677c06420734ae1d66486789b');
});

test('mark true/false, repeated reviews, missing/zero counts and reference immutability', () => {
  for (const mastered of [true, false]) {
    for (const count of [undefined, 0, 3]) {
      const cards = [card('a', false, count), card('b', true, 2)];
      const h = harness(cards);
      h.render().handleMarkMastery(mastered);
      assert.notEqual(h.state[3], cards);
      assert.notEqual(h.state[3][0], cards[0]);
      assert.equal(h.state[3][1], cards[1]);
      assert.deepEqual(h.state[3][0], { ...cards[0], mastered, timesReviewed: (count || 0) + 1 });
      assert.equal(cards[0].timesReviewed, count);
      assert.deepEqual(h.events.map(event => event[0]), ['cards', 'toast', 'timer']);
      assert.equal(h.events[1][2], mastered ? 'success' : 'info');
      h.render().handleMarkMastery(!mastered);
      assert.equal(h.state[3][0].timesReviewed, (count || 0) + 2);
    }
  }
});

test('last-card completion uses updated cards, captured denominator and callback ordering', () => {
  const h = harness([card('a', true), card('b'), card('c')], 2);
  h.render().handleMarkMastery(true);
  assert.deepEqual(h.events.map(event => event[0]), ['cards', 'toast', 'completed', 'update']);
  assert.deepEqual(h.events[3][1], { ...h.deck, cards: h.state[3], masteryPercentage: 67, lastReviewed: 'Hoy' });
  assert.equal(h.events[3][1].cards, h.state[3]);
  assert.equal(h.timers.length, 0);
  const optional = harness([card('a')], 0, false);
  optional.render().handleMarkMastery(false);
  assert.deepEqual(optional.events.map(event => event[0]), ['cards', 'toast', 'completed']);
});

test('weak selection keeps references, empty selection only toasts, restart retains the subset', () => {
  const cards = [card('a', true), card('b'), card('c', false)];
  const h = harness(cards, 2);
  h.render().handleReviewWeakOnly();
  assert.deepEqual(h.state, [0, false, false, [cards[1], cards[2]], false]);
  assert.equal(h.state[3][0], cards[1]);
  assert.deepEqual(h.events.map(event => event[0]), ['cards', 'index', 'flipped', 'hint', 'completed', 'toast']);
  assert.deepEqual(h.events.at(-1), ['toast', 'Repasando 2 tarjetas pendientes', 'info']);
  const subset = h.state[3];
  h.render().handleRestart();
  assert.equal(h.state[3], subset);
  assert.deepEqual(h.events.slice(-4), [['index', 0], ['flipped', false], ['hint', false], ['completed', false]]);
  const empty = harness([card('a', true)]);
  const original = [...empty.state];
  empty.render().handleReviewWeakOnly();
  assert.deepEqual(empty.state, original);
  assert.deepEqual(empty.events, [['toast', '¡Ya dominás todas las tarjetas de este mazo!', 'success']]);
});

test('uncancelled 400ms timers retain captured indices after reset, weak review and close', () => {
  const h = harness([card('a'), card('b'), card('c')], 1);
  h.render().handleMarkMastery(true);
  assert.equal(h.timers[0].delay, 400);
  h.render().handleRestart();
  h.render().handleReviewWeakOnly();
  assert.equal(h.render(false), null);
  h.timers[0].callback();
  assert.deepEqual(h.events.slice(-3), [['flipped', false], ['hint', false], ['index', 2]]);
  assert.equal(h.render().currentCard, h.state[3][0]);
});

test('toast reentrancy precedes completion calculation; toast throws interrupt completion', () => {
  const h = harness([card('a')]);
  h.toastEffect(() => { h.state[3].push(card('b', true)); });
  h.render().handleMarkMastery(true);
  assert.equal(h.events.at(-1)[1].masteryPercentage, 200);
  const throwing = harness([card('a')]);
  throwing.toastEffect(() => { throw new Error('toast failure'); });
  assert.throws(() => throwing.render().handleMarkMastery(true), /toast failure/);
  assert.deepEqual(throwing.events.map(event => event[0]), ['cards', 'toast']);
  const empty = harness([]);
  assert.ok(Number.isNaN(empty.render().masteryPercentage));
  assert.throws(() => empty.render().handleMarkMastery(true), TypeError);
  assert.deepEqual(empty.events, []);
});

test('extracted operations match the same contracts without React or view imports', { skip: !existsSync(operationsUrl) }, () => {
  const { markCardMastery, selectWeakCards, completeFlashcardDeck } = operations;
  const cards = [card('a'), card('b', true)];
  const updated = markCardMastery(cards, 0, false);
  assert.deepEqual(updated[0], { ...cards[0], mastered: false, timesReviewed: 1 });
  assert.notEqual(updated, cards);
  assert.notEqual(updated[0], cards[0]);
  assert.equal(updated[1], cards[1]);
  assert.equal(selectWeakCards(cards)[0], cards[0]);
  assert.deepEqual(selectWeakCards([cards[1]]), []);
  assert.throws(() => markCardMastery([], 0, true), TypeError);
  const completed = completeFlashcardDeck(deckFor(cards), updated, 3);
  assert.equal(completed.cards, updated);
  assert.equal(completed.masteryPercentage, 33);
  assert.equal(completed.lastReviewed, 'Hoy');
  assert.ok(Number.isNaN(completeFlashcardDeck(deckFor([]), [], 0).masteryPercentage));
  const application = readSource(operationsUrl);
  const imports = application.statements.filter(ts.isImportDeclaration);
  assert.equal(imports.length, 1);
  assert.equal(imports[0].importClause?.isTypeOnly, true);
  assert.equal((imports[0].moduleSpecifier as ts.StringLiteral).text, '../model/Flashcard');
});
