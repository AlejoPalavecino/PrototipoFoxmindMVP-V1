import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Execute the real component with deterministic hook/element/document doubles.
// This covers handler and effect wiring, not mounted React, browser focus or layout.
function harness(role: 'alumno' | 'docente' = 'docente') {
  const source = readFileSync(new URL('../../components/layout/MobileNavigation.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const slots: any[] = [], effects: any[] = [];
  let cursor = 0, focus = 0;
  const listeners = new Map<string, Set<(event: any) => void>>();
  const document = {
    addEventListener(name: string, fn: (event: any) => void) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    removeEventListener(name: string, fn: (event: any) => void) { listeners.get(name)?.delete(fn); },
  };
  const react = {
    createElement(type: any, props: any, ...children: any[]) { return { type, props: { ...props, children: children.flat(Infinity) } }; },
    useState(initial: any) {
      const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial: any) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useId() { cursor++; return 'mobile-navigation-test'; },
    useEffect(callback: () => any, deps: any[]) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((dep, n) => !Object.is(dep, previous.deps[n]))) {
        effects.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; });
      }
    },
  };
  const exports: any = {};
  new Function('require', 'exports', 'document', code)((name: string) => {
    if (name === 'react') return react;
    if (name === 'lucide-react') return { MoreHorizontal: 'icon' };
    throw Error(`Unexpected runtime import ${name}`);
  }, exports, document);
  const ids = role === 'alumno' ? ['dashboard', 'estudia', 'aulas', 'progreso', 'mensajes', 'config']
    : ['dashboard', 'agenda', 'aulas', 'progreso', 'copiloto', 'mensajes', 'config'];
  const items = ids.map(id => ({
    id, label: id === 'config' ? 'Configuración' : id === 'mensajes' ? 'Mensajes' : id,
    mobileLabel: id === 'dashboard' ? 'Inicio' : id, icon: 'icon',
  }));
  const calls: string[] = [];
  let props = { items, view: 'dashboard', routeKey: `/${role}/dashboard`, onNavigate: (id: string) => calls.push(id) };
  function elements(node: any): any[] {
    if (Array.isArray(node)) return node.flatMap(elements);
    if (!node || typeof node !== 'object') return [];
    return [node, ...elements(node.props.children)];
  }
  let nodes: any[] = [];
  function render(overrides: Partial<typeof props> = {}) {
    props = { ...props, ...overrides }; cursor = 0;
    nodes = elements(exports.MobileNavigation(props));
    for (const node of nodes) {
      if (node.props.ref) node.props.ref.current = node.type === 'nav'
        ? { contains: (target: unknown) => target === 'inside' }
        : { focus: () => { focus++; } };
    }
    effects.splice(0).forEach(fn => fn());
    return nodes;
  }
  const trigger = () => nodes.find(n => n.type === 'button' && n.props['aria-controls']);
  const panel = () => nodes.find(n => n.props.id === trigger().props['aria-controls']);
  const destination = (id: string) => nodes.find(n => n.type === 'button' && n.props['aria-label'] === items.find(i => i.id === id)?.label);
  const emit = (name: string, event: any) => [...listeners.get(name) ?? []].forEach(fn => fn(event));
  const open = () => { trigger().props.onClick(); render(); assert.equal(trigger().props['aria-expanded'], true); };
  render();
  return { render, trigger, panel, destination, emit, open, calls, items, nodes: () => nodes,
    focus: () => focus, listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    unmount: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

test('all role destinations remain available: five primaries plus a semantic Más disclosure', () => {
  for (const role of ['docente', 'alumno'] as const) {
    const h = harness(role);
    assert.equal(h.trigger().props.type, 'button');
    assert.equal(h.trigger().props['aria-expanded'], false);
    assert.equal(h.trigger().props['aria-current'], undefined);
    assert.equal(h.trigger().props['aria-haspopup'], undefined);
    assert.equal(h.panel().props.hidden, true);
    assert.equal(h.panel().props.role, undefined, 'Ordinary disclosure, not an incomplete ARIA menu/modal');
    const grid = h.nodes().find(n => n.props.className?.includes('grid-cols-6'));
    const primary = grid.props.children.filter((n: any) => n?.type === 'button' && !n.props['aria-controls']);
    assert.deepEqual(primary.map((n: any) => n.props['aria-label']), h.items.slice(0, 5).map(item => item.label));
    const panelButtons = h.panel().props.children.filter((n: any) => n?.type === 'button');
    assert.deepEqual(panelButtons.map((n: any) => n.props['aria-label']), role === 'alumno' ? ['Configuración'] : ['Mensajes', 'Configuración']);
    assert.ok(h.nodes().indexOf(h.panel()) > h.nodes().indexOf(h.trigger()), 'Overflow follows trigger in native tab order');
    h.open(); assert.equal(h.panel().props.hidden, false);
    const buttons = h.nodes().filter(n => n.type === 'button' && !n.props['aria-controls']);
    assert.equal(buttons.length, role === 'docente' ? 7 : 6);
    for (const button of buttons) {
      assert.equal(button.props.type, 'button');
      assert.equal(button.props.onKeyDown, undefined, 'Native Enter/Space activation needs no synthetic keyboard handler');
      assert.equal(button.props.tabIndex, undefined);
      assert.match(button.props.className, /focus-visible/);
    }
    h.destination('config').props.onClick(); h.render();
    assert.deepEqual(h.calls, ['config']);
    assert.equal(h.trigger().props['aria-expanded'], false);
    h.render({ view: 'config', routeKey: `/${role}/config` }); h.render();
    assert.match(h.trigger().props.className, /text-fox-orange/);
    assert.equal(h.destination('config').props['aria-current'], 'page');
    assert.equal(h.trigger().props['aria-current'], undefined);
  }
});

test('primary and overflow callbacks close the panel exactly once; selected overflow highlights Más but only destination is current', () => {
  const h = harness();
  for (const id of ['aulas', 'mensajes', 'config']) {
    h.open(); h.destination(id).props.onClick(); h.render({ view: id, routeKey: `/docente/${id}` });
    h.render();
    assert.equal(h.trigger().props['aria-expanded'], false);
    assert.equal(h.trigger().props['aria-current'], undefined);
    assert.equal(h.destination(id).props['aria-current'], 'page');
    assert.equal(h.nodes().filter(n => n.props['aria-current'] === 'page').length, 1);
    assert.match(h.trigger().props.className, id === 'aulas' ? /text-fox-text-muted/ : /text-fox-orange/);
    h.open(); assert.equal(h.destination(id).props['aria-current'], 'page');
    h.trigger().props.onClick(); h.render();
  }
  assert.deepEqual(h.calls, ['aulas', 'mensajes', 'config']);
});

test('Escape closes and focuses trigger; other keys and inside interactions do not close', () => {
  const h = harness(); h.open();
  h.emit('pointerdown', { target: 'inside' }); h.emit('focusin', { target: 'inside' });
  h.emit('pointerdown', { target: null });
  h.emit('keydown', { key: 'Tab' }); h.render();
  assert.equal(h.trigger().props['aria-expanded'], true);
  let prevented = 0;
  h.emit('keydown', { key: 'Escape', preventDefault() { prevented++; } }); h.render();
  assert.equal(h.trigger().props['aria-expanded'], false);
  assert.equal(h.focus(), 1); assert.equal(prevented, 1);
  assert.equal(h.listenerCount(), 0);
  h.emit('keydown', { key: 'Escape' }); assert.equal(h.focus(), 1);
});

test('outside pointer/focus closes without stealing focus; route changes and unmount clean listeners', () => {
  const h = harness();
  for (const name of ['pointerdown', 'focusin']) {
    h.open(); h.emit(name, { target: 'outside' }); h.render();
    assert.equal(h.trigger().props['aria-expanded'], false);
    assert.equal(h.focus(), 0); assert.equal(h.listenerCount(), 0);
  }
  h.open(); h.render({ routeKey: '/docente/aulas/a-1' }); h.render();
  assert.equal(h.trigger().props['aria-expanded'], false, 'External navigation also closes');
  h.open(); assert.ok(h.listenerCount() > 0); h.unmount(); assert.equal(h.listenerCount(), 0);
});

test('accessibility launcher clears the mobile bar, preserves desktop position and has a dismissible panel', () => {
  const source = readFileSync(new URL('../../components/ui/AccessibilityPanel.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  let open = false;
  const react = {
    createElement(type: any, props: any, ...children: any[]) { return { type, props: { ...props, children: children.flat(Infinity) } }; },
    useState() { return [open, (value: boolean) => { open = value; }]; },
    useRef() { return { current: null }; }, useEffect() {},
  };
  const exports: any = {};
  new Function('require', 'exports', code)((name: string) => {
    if (name === 'react') return react;
    if (name === 'motion/react') return { motion: { button: 'button', div: 'div' }, AnimatePresence: 'presence' };
    if (name === 'lucide-react') return {};
    if (name === '../../context') return { useAppContext: () => ({ settings: { textSize: 'M' }, updateSettings() {} }) };
    throw Error(`Unexpected runtime import ${name}`);
  }, exports);
  function elements(node: any): any[] {
    if (Array.isArray(node)) return node.flatMap(elements);
    return node && typeof node === 'object' ? [node, ...elements(node.props.children)] : [];
  }
  const nodes = () => elements(exports.AccessibilityPanel());
  const launcher = nodes().find(n => n.props['aria-label'] === 'Abrir panel de accesibilidad DUA');
  // Class contract only: actual geometry and hit testing remain in the mounted smoke.
  assert.match(launcher.props.className, /\bbottom-24\b/);
  assert.match(launcher.props.className, /\bmd:bottom-6\b/);
  assert.equal(launcher.props['aria-expanded'], false);
  launcher.props.onClick();
  assert.equal(nodes().find(n => n.props.role === 'dialog').props['aria-modal'], 'true');
  nodes().find(n => n.props['aria-label'] === 'Cerrar panel').props.onClick();
  assert.equal(nodes().some(n => n.props.role === 'dialog'), false, 'Dismissing modal restores access to navigation');
});

test('compact full-width grid and fixed safe-height bar avoid old padded long-label row', () => {
  const h = harness();
  const nav = h.nodes().find(n => n.type === 'nav');
  assert.match(nav.props.className, /fixed bottom-0 left-0 right-0/);
  assert.ok(h.nodes().some(n => n.props.className?.includes('grid-cols-6')));
  assert.ok(h.nodes().some(n => n.props.className?.includes('h-20')));
  assert.ok(h.nodes().filter(n => n.type === 'button').every(n => /min-h-\[44px\]/.test(n.props.className)));
  assert.ok(h.nodes().filter(n => n.type === 'button').every(n => /min-w-0/.test(n.props.className)));
  assert.ok(!nav.props.className.includes('px-6'));
});
