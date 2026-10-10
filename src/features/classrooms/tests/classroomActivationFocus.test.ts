import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Execute the real page with hook/element doubles, as in measuredChart.test.ts.
// Ref attachment is invoked explicitly: not mounted React, animation, or native
// keyboard proof. The independent browser smoke retains those assertions.
function harness(initialId?: string) {
  const slots: any[] = [], effects: (() => void)[] = [], navigation: any[] = [], focus: any[] = [];
  let cursor = 0, params: any = initialId ? { aulaId: initialId } : undefined;
  const react = {
    createElement(type: any, props: any, ...children: any[]) {
      return { type, props: { ...props, children } };
    },
    useRef(initial: any) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(callback: () => any, deps: any[]) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n]))) {
        effects.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; });
      }
    },
  };
  const classrooms = [{ id: 'c1' }, { id: 'c2' }];
  const setView = (view: string, next: any, mode?: string) => {
    navigation.push({ view, params: next, mode }); params = next;
  };
  const imports: Record<string, any> = {
    react,
    '../../features/classrooms': {
      resolveStudentClassroom: (list: any[], next: any) => list.find(aula => aula.id === next?.aulaId),
    },
    '../../features/classrooms/ui': {
      useStudentClassroomMembership: () => ({ classrooms, setIsJoinModalOpen: () => {} }),
      StudentClassroomList: 'list', StudentClassroomDetail: 'detail', StudentClassroomJoinDialog: 'dialog',
    },
    '../../context': { useAppContext: () => ({ navigationParams: params, setView }) },
    'motion/react': { motion: { div: 'motion.div' }, AnimatePresence: 'presence' },
  };
  const source = readFileSync(new URL('../../../views/alumno/AulasAlumno.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports: any = {};
  new Function('require', 'exports', code)((name: string) => {
    assert.ok(name in imports, `Unexpected runtime import ${name}`); return imports[name];
  }, exports);
  function elements(node: any): any[] {
    if (Array.isArray(node)) return node.flatMap(elements);
    return node && typeof node === 'object' ? [node, ...elements(node.props.children)] : [];
  }
  function render() {
    cursor = 0;
    const nodes = elements(exports.AulasAlumno());
    effects.splice(0).forEach(effect => effect());
    return nodes;
  }
  const host = { closest: (selector: string) => {
    assert.equal(selector, 'main'); return { focus: (options: any) => focus.push(options) };
  } };
  function detailHost(nodes: any[]) {
    const node = nodes.find(node => node.type === 'motion.div' && node.props.children.some((child: any) => child?.type === 'detail'));
    assert.ok(node, 'Detail host exists in the page branch');
    assert.equal(typeof node.props.ref, 'function', 'Detail commit must own the focus handoff');
    return node;
  }
  return { render, detailHost, host, focus, navigation,
    select: (nodes: any[], id = 'c1') => nodes.find(node => node.type === 'list').props.onSelect(classrooms.find(aula => aula.id === id)),
    route: (id?: string) => { params = id ? { aulaId: id } : undefined; },
    cleanup: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

test('explicit selection requests one MAIN focus only on detail ref attachment, with preventScroll', () => {
  const h = harness();
  h.select(h.render());
  assert.deepEqual(h.navigation, [{ view: 'aulas', params: { aulaId: 'c1' }, mode: undefined }]);
  assert.deepEqual(h.focus, [], 'Selection itself must not focus exiting list content');
  const host = h.detailHost(h.render());
  assert.deepEqual(h.focus, [], 'Rendering a branch is not the delayed AnimatePresence commit');
  host.props.ref(null);
  assert.deepEqual(h.focus, [], 'Null/detached refs are not commits');
  host.props.ref(h.host);
  assert.deepEqual(h.focus, [{ preventScroll: true }]);
  host.props.ref(null); host.props.ref(h.host);
  h.detailHost(h.render()).props.ref(h.host);
  assert.equal(h.focus.length, 1, 'Replay/resource/task rerenders must not reuse consumed intent');
});

test('direct/deep loads, resource changes and history do not request focus', () => {
  const h = harness('c1');
  h.detailHost(h.render()).props.ref(h.host);
  h.detailHost(h.render()).props.ref(h.host);
  h.route('c2'); h.detailHost(h.render()).props.ref(h.host);
  h.route(); h.render();
  h.route('c1'); h.detailHost(h.render()).props.ref(h.host);
  assert.deepEqual(h.focus, []);
  assert.deepEqual(h.navigation, [], 'No invented history entries');
});

test('history cancellation before delayed detail commit clears selection intent, including late refs', () => {
  const h = harness(); h.select(h.render());
  const delayed = h.detailHost(h.render());
  h.route(); h.render();
  delayed.props.ref(h.host);
  h.route('c1'); h.detailHost(h.render()).props.ref(h.host);
  assert.deepEqual(h.focus, []);
  h.route(); h.select(h.render(), 'c2');
  h.detailHost(h.render()).props.ref(h.host);
  assert.deepEqual(h.focus, [{ preventScroll: true }], 'A fresh explicit selection can request again');
});

test('invalid selection, classroom back and page unmount cancel pending focus', () => {
  for (const cancel of ['invalid', 'back', 'unmount']) {
    const h = harness(); h.select(h.render());
    const nodes = h.render(), delayed = h.detailHost(nodes);
    if (cancel === 'invalid') { h.route('missing'); h.render(); }
    if (cancel === 'back') { nodes.find(node => node.type === 'detail').props.onBack(); h.render(); }
    if (cancel === 'unmount') h.cleanup();
    delayed.props.ref(h.host);
    assert.deepEqual(h.focus, [], cancel);
  }
});

test('commit for a different classroom cannot consume the requested focus', () => {
  const h = harness('c2'), old = h.detailHost(h.render());
  h.route(); h.select(h.render());
  old.props.ref(h.host);
  assert.deepEqual(h.focus, []);
  h.detailHost(h.render()).props.ref(h.host);
  assert.deepEqual(h.focus, [{ preventScroll: true }]);
});

const driver = await import(new URL('../../../../scripts/frontend-navigation-smoke.mjs', import.meta.url).href);
test('chart smoke rejects missing, invisible or nonpositive settled SVG dimensions and absent plotted marks', () => {
  const chart = { width: 240, height: 256, rectWidth: 240, rectHeight: 256, visible: true, inViewport: true, marks: 1 };
  driver.assertChart(chart);
  for (const change of [{ width: 0 }, { height: -1 }, { rectWidth: NaN }, { rectHeight: Infinity },
    { visible: false }, { inViewport: false }, { marks: 0 }]) {
    assert.throws(() => driver.assertChart({ ...chart, ...change }));
  }
  assert.throws(() => driver.assertChart(null));
});
