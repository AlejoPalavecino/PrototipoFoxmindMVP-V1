import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../../components/messaging/SharedMessagingHub.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('hub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodes(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = [];
  function visit(node: ts.Node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}

// Execute the actual bounded component controller/effect, not a copy. The mock
// models the known all-ancestor path; it does not prove browser layout or timing.
const controller = nodes(ast, ts.isVariableDeclaration).filter(node =>
  (node as ts.VariableDeclaration).name.getText(ast) === 'scrollToBottom');
assert.equal(controller.length, 1);
const effects = nodes(ast, ts.isCallExpression).filter(node => {
  const call = node as ts.CallExpression;
  return call.expression.getText(ast) === 'useEffect' && call.arguments[0]?.getText(ast).includes('scrollToBottom()');
});
assert.equal(effects.length, 1);
function runScrollEffect(current: unknown) {
  new Function('messagesEndRef', 'useEffect', 'activeConversationId', 'conversations', 'isMobileListVisible',
    `const ${controller[0].getText(ast)}; ${effects[0].getText(ast)};`
  )({ current }, (effect: () => void, dependencies: unknown[]) => {
    assert.deepEqual(dependencies, ['thread', [], false], 'thread/store updates and mobile visibility trigger scrolling');
    effect();
  }, 'thread', [], false);
}

function scrollHarness(mainTop: number) {
  const ancestor = {
    scrollTop: mainTop,
    scrollCalls: 0,
    focusCalls: 0,
    scrollTo() { this.scrollCalls++; this.scrollTop = 73; },
    focus() { this.focusCalls++; },
  };
  const composer = { focusCalls: 0, focus() { this.focusCalls++; } };
  const calls: ScrollToOptions[] = [];
  const host = {
    scrollHeight: 1200,
    clientHeight: 300,
    scrollTop: 0,
    focusCalls: 0,
    focus() { this.focusCalls++; },
    scrollTo(options: ScrollToOptions) {
      calls.push(options);
      this.scrollTop = Math.min(options.top ?? this.scrollTop, this.scrollHeight - this.clientHeight);
    },
    // Legacy end-marker scrolling reaches the thread end but also moves main.
    scrollIntoView(options: ScrollIntoViewOptions) {
      this.scrollTo({ top: this.scrollHeight, behavior: options.behavior });
      ancestor.scrollTo();
    },
  };
  return { host, ancestor, composer, calls };
}

for (const mainTop of [20, 60]) {
  test(`actual message scroll effect preserves main at ${mainTop} and smooth-scrolls only the thread`, () => {
    const { host, ancestor, composer, calls } = scrollHarness(mainTop);
    runScrollEffect(host);
    assert.equal(ancestor.scrollTop, mainTop, 'message scrolling must not override main/history position');
    assert.equal(ancestor.scrollCalls, 0);
    assert.deepEqual(calls, [{ top: 1200, behavior: 'smooth' }]);
    assert.equal(host.scrollTop, 900, 'browser host clamps the requested end to its maximum');
    assert.equal(host.focusCalls + ancestor.focusCalls + composer.focusCalls, 0, 'scrolling must not steal focus');
  });
}

test('message updates use the current host height and tolerate an absent thread', () => {
  const { host, ancestor, calls } = scrollHarness(20);
  runScrollEffect(host);
  host.scrollHeight = 1600;
  runScrollEffect(host);
  assert.deepEqual(calls, [{ top: 1200, behavior: 'smooth' }, { top: 1600, behavior: 'smooth' }]);
  assert.equal(host.scrollTop, 1300);
  assert.equal(ancestor.scrollTop, 20);
  assert.doesNotThrow(() => runScrollEffect(null));
});

test('same-thread mobile list-to-detail entry scrolls after visibility commits, not on draft rerenders', () => {
  const { host, ancestor, composer, calls } = scrollHarness(20);
  const conversations: unknown[] = [];
  let previousDependencies: unknown[] | undefined;
  const render = (isMobileListVisible: boolean, inputText: string) => {
    new Function('messagesEndRef', 'useEffect', 'activeConversationId', 'conversations', 'isMobileListVisible', 'inputText',
      `const ${controller[0].getText(ast)}; ${effects[0].getText(ast)};`
    )({ current: host }, (effect: () => void, dependencies: unknown[]) => {
      const changed = !previousDependencies || dependencies.some((value, index) =>
        !Object.is(value, previousDependencies![index]));
      previousDependencies = dependencies;
      if (changed) effect();
    }, 'thread', conversations, isMobileListVisible, inputText);
  };
  // A display:none descendant has no measurable height or scroll range.
  host.clientHeight = 0;
  host.scrollHeight = 0;
  render(true, '');
  assert.equal(host.scrollTop, 0);
  host.clientHeight = 300;
  host.scrollHeight = 1281;
  render(false, ''); // Same ID/store, but committed detail is now measurable.
  assert.equal(host.scrollTop, 981, 'first visible default thread must reach bottom');
  const scrollCount = calls.length;
  render(false, 'draft');
  render(false, 'draft updated');
  assert.equal(calls.length, scrollCount, 'draft-only renders must not scroll');
  assert.deepEqual(calls.at(-1), { top: 1281, behavior: 'smooth' });
  assert.equal(ancestor.scrollTop, 20);
  assert.equal(ancestor.scrollCalls, 0);
  assert.equal(host.focusCalls + ancestor.focusCalls + composer.focusCalls, 0);
});

test('actual component attaches its scrolling ref to the message-list scroller, not the end marker', () => {
  const mounts = nodes(ast, ts.isJsxAttribute).filter(node => node.getText(ast) === 'ref={messagesEndRef}');
  assert.equal(mounts.length, 1);
  const mount = mounts[0].parent.parent;
  assert.ok(ts.isJsxOpeningElement(mount), 'ref belongs to the list containing messages');
  assert.equal(mount.tagName.getText(ast), 'div');
  assert.ok(mount.attributes.properties.some(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'className' &&
    attribute.initializer && ts.isStringLiteral(attribute.initializer) &&
    attribute.initializer.text.split(/\s+/).includes('overflow-y-auto')));
  assert.ok(ts.isJsxElement(mount.parent));
  assert.match(mount.parent.getText(ast), /displayMessages\.map/);
});
