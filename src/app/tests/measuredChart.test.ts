import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Execute the real components with hook/element/ResizeObserver doubles, following
// mobileNavigation.test.ts. These are not mounted React or browser layout proof.
function load(path: string, imports: Record<string, any>, globals: Record<string, any> = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports: any = {};
  new Function('require', 'exports', ...Object.keys(globals), code)((name: string) => {
    assert.ok(name in imports, `Unexpected runtime import ${name}`);
    return imports[name];
  }, exports, ...Object.values(globals));
  return exports;
}

function hooks() {
  const slots: any[] = [], pending: (() => void)[] = [];
  let cursor = 0, updates = 0;
  const react = {
    createElement(type: any, props: any, ...children: any[]) {
      return { type, props: { ...props, children: children.length === 1 ? children[0] : children } };
    },
    useState(initial: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], (value: any) => { updates++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial: any) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(callback: () => any, deps: any[]) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((dep, n) => !Object.is(dep, previous.deps[n]))) {
        pending.push(() => { previous?.cleanup?.(); slots[i] = { deps, callback, cleanup: callback() }; });
      }
    },
  };
  return { react, begin: () => { cursor = 0; }, flush: () => pending.splice(0).forEach(fn => fn()),
    cleanup: () => slots.forEach(slot => slot?.cleanup?.()),
    replay: () => slots.forEach(slot => { if (slot?.callback) { slot.cleanup(); slot.cleanup = slot.callback(); } }),
    updates: () => updates,
  };
}

function harness() {
  const h = hooks(), parent = {}, observers: Observer[] = [];
  class Observer {
    target: unknown;
    disconnected = false;
    constructor(private callback: (entries: any[]) => void) { observers.push(this); }
    observe(target: unknown) { this.target = target; }
    disconnect() { this.disconnected = true; }
    emit(width: number, height: number, target = parent) {
      this.callback([{ target, contentRect: { width, height } }]);
    }
  }
  const { MeasuredChart } = load('../../components/ui/MeasuredChart.tsx', { react: h.react }, { ResizeObserver: Observer });
  const calls: any[] = [];
  const children = (size: any) => { calls.push(size); return { type: 'chart', props: size }; };
  function render() {
    h.begin();
    const node = MeasuredChart({ className: 'w-full h-64', children });
    node.props.ref.current = parent;
    h.flush();
    return node;
  }
  return { ...h, render, parent, observers, calls };
}

test('chart waits for positive observed parent content dimensions, never inventing initial sizes', () => {
  const h = harness();
  const initial = h.render();
  assert.equal(initial.props.className, 'w-full h-64');
  assert.equal(initial.props.children, null);
  assert.deepEqual(h.calls, []);
  assert.equal(h.observers.length, 1);
  assert.equal(h.observers[0].target, h.parent);
  for (const [width, height] of [[0, 256], [320, 0], [-1, -1], [NaN, 240], [Infinity, 240]]) {
    h.observers[0].emit(width, height);
    assert.equal(h.render().props.children, null);
  }
  h.observers[0].emit(319.5, 256);
  assert.deepEqual(h.render().props.children.props, { width: 319.5, height: 256 });
  h.cleanup();
});

test('resize supplies new numeric dimensions; zero hides chart and recovery measures again', () => {
  const h = harness(); h.render();
  const observer = h.observers[0];
  observer.emit(320, 256);
  assert.deepEqual(h.render().props.children.props, { width: 320, height: 256 });
  observer.emit(768, 240);
  assert.deepEqual(h.render().props.children.props, { width: 768, height: 240 });
  observer.emit(999, 999, {});
  assert.deepEqual(h.render().props.children.props, { width: 768, height: 240 }, 'Ignore unrelated entries');
  observer.emit(0, 240);
  assert.equal(h.render().props.children, null);
  observer.emit(300, 240);
  assert.deepEqual(h.render().props.children.props, { width: 300, height: 240 });
  h.cleanup();
});

test('unmount and StrictMode effect replay disconnect observers and ignore late callbacks', () => {
  const h = harness(); h.render();
  const first = h.observers[0];
  h.replay();
  assert.equal(first.disconnected, true);
  assert.equal(h.observers.length, 2);
  assert.equal(h.observers[1].target, h.parent);
  const before = h.updates();
  first.emit(999, 999);
  assert.equal(h.updates(), before);
  assert.equal(h.render().props.children, null);
  h.observers[1].emit(400, 256);
  assert.deepEqual(h.render().props.children.props, { width: 400, height: 256 });
  h.cleanup();
  assert.equal(h.observers[1].disconnected, true);
  const after = h.updates();
  h.observers[1].emit(500, 256);
  assert.equal(h.updates(), after);
});

function elements(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node && typeof node === 'object' ? [node, ...elements(node.props?.children)] : [];
}

test('both overview layouts pass measured numeric dimensions directly to every chart metric', () => {
  for (const role of ['alumno', 'docente'] as const) {
    const h = hooks();
    const chartNames = ['AreaChart', 'BarChart', 'Bar', 'Area', 'XAxis', 'YAxis', 'Tooltip', 'Cell', 'ReferenceLine', 'ResponsiveContainer'];
    const recharts = Object.fromEntries(chartNames.map(name => [name, name]));
    const weekly = [{ day: 'Lun', minutes: 45, accuracy: 80, xp: 25 }];
    const evolution = [{ period: 'Lun', promedio: 8, entrega: 90, consultas: 5 }];
    const wrapper = () => {};
    const filename = role === 'alumno' ? 'ProgresoOverviewTab' : 'ProgresoDocenteOverviewTab';
    const exports = load(`../../views/${role}/progreso/${filename}.tsx`, {
      react: h.react, 'motion/react': { motion: { div: 'div' } }, 'lucide-react': {}, recharts,
      '../../../components/ui/MeasuredChart': { MeasuredChart: wrapper },
      './progresoData': { mockWeeklyStudyData: weekly },
    });
    const props = role === 'alumno' ? { subjects: [], reviews: [], currentXp: 0 } : {
      aulas: [], alerts: [], scheduledInterventions: [], currentPoints: 0, timeframe: 'semana',
      stats: { evolutionData: evolution, promedioHistory: [], entregaHistory: [] },
    };
    const render = () => { h.begin(); return elements(exports[filename](props)); };
    const metrics = role === 'alumno' ? ['Minutos', 'Precisión %', 'XP Ganado'] : ['Promedio', 'Entregas %', 'Foxy IA'];
    for (const metric of metrics) {
      render().find(n => n.type === 'button' && n.props.children === metric).props.onClick();
      const nodes = render();
      assert.equal(nodes.some(n => n.type === 'ResponsiveContainer'), false);
      const measured = nodes.find(n => n.type === wrapper);
      assert.ok(measured, 'Shared wrapper must own chart dimensions');
      assert.equal(measured.props.className, role === 'alumno' ? 'w-full h-64' : 'w-full h-60 mt-2');
      const chart = measured.props.children({ width: 312.5, height: role === 'alumno' ? 256 : 240 });
      assert.ok(['AreaChart', 'BarChart'].includes(chart.type));
      assert.equal(chart.props.width, 312.5);
      assert.equal(chart.props.height, role === 'alumno' ? 256 : 240);
      assert.equal(chart.props.data, role === 'alumno' ? weekly : evolution);
      assert.deepEqual(chart.props.margin, { top: 10, right: 10, left: -20, bottom: 0 });
    }
  }
});
