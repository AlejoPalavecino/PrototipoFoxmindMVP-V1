import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { resolveStudentClassroom } from '../index';
import { createUrlNavigation, HISTORY_ENTRY_KEY, type HistoryHost } from '../../../app/routing';

import { createClassroomJoinState } from '../application/classroomJoinState';
type Element = { type: any; props: any; children: any[] };
const react = { Fragment: 'fragment', createElement: (type: any, props: any, ...children: any[]): Element =>
  ({ type, props: props ?? {}, children: children.flat(Infinity) }) };
function elements(tree: any): Element[] {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...tree.children.flatMap(elements)];
}
// Execute the actual modules and their consumer with deterministic hooks/elements.
// This is not a React lifecycle or browser harness; imports are explicitly controlled.
function moduleAt(path: string, imports: Record<string, any>) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  const exported: any = {};
  runInNewContext(code, { exports: exported, require: (name: string) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name];
  } });
  return exported;
}
function mount() {
  const slots: any[] = [], effectQueue: (() => any)[] = [], calls: any[] = [];
  let index = 0, reads = 0, records: any[] = [{ id: 'a-1', subject: 'Historia', course: '2° B' }];
  let result: any = { status: 'rejected' }, subscriber: (() => void) | undefined;
  const hooks = {
    ...react,
    useState: (initial: any) => {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
      return [slots[slot], (value: any) => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef: (initial: any) => { const slot = index++; return slots[slot] ?? (slots[slot] = { current: initial }); },
    useEffect: (callback: () => any, deps: any[]) => {
      const slot = index++, previous = slots[slot];
      if (!previous || deps.some((value, i) => value !== previous[i])) effectQueue.push(callback);
      slots[slot] = deps;
    },
  };
  const hook = moduleAt('../hooks/useStudentClassroomMembership.ts', {
    react: hooks,
    '../data/inMemoryClassroomRepository': { classroomRepository: { readMembership: () => { reads++; calls.push(['read']); return records; } } },
    '../application/classroomMembership': { joinClassroomByCode: (code: string, snapshot: any[]) => {
      calls.push(['join', code, snapshot]); return typeof result === 'function' ? result() : result;
    } },
    '../application/classroomJoinState': { createClassroomJoinState },
    '../../messaging/messagingStore': { messagingStore: { subscribe: (callback: () => void) => {
      calls.push(['subscribe']); subscriber = callback;
      return () => { calls.push(['unsubscribe']); subscriber = undefined; };
    } } },
    '../../../components/ui/Toaster': { toast: { show: (text: string, kind: string) => calls.push(['toast', text, kind]) } },
  });
  const leaf = moduleAt('../components/student/StudentClassroomJoinDialog.tsx', {
    react, 'motion/react': { motion: { div: 'motion.div' }, AnimatePresence: 'presence' },
    'lucide-react': { Plus: 'plus', X: 'x' },
  });
  const paths = ['/alumno/aulas'], states: unknown[] = [null], listeners = new Set<() => void>();
  const writes: any[] = []; let pathIndex = 0;
  const host: HistoryHost = {
    location: { pathname: paths[0], search: '', hash: '' },
    history: {
      get state() { return states[pathIndex]; },
      pushState: (state, _unused, url) => {
        writes.push(['push', state, String(url)]); paths.splice(pathIndex + 1); states.splice(pathIndex + 1);
        paths.push(String(url)); states.push(state); pathIndex++; host.location.pathname = paths[pathIndex];
      },
      replaceState: (state, _unused, url) => {
        writes.push(['replace', state, String(url)]); states[pathIndex] = state;
        paths[pathIndex] = String(url); host.location.pathname = paths[pathIndex];
      },
    },
    addEventListener: (_event, listener) => { listeners.add(listener); },
    removeEventListener: (_event, listener) => { listeners.delete(listener); },
  };
  const navigation = createUrlNavigation(host); navigation.subscribe(() => {});
  let controller: any;
  const page = moduleAt('../../../views/alumno/AulasAlumno.tsx', {
    react: hooks,
    '../../features/classrooms': { resolveStudentClassroom },
    '../../features/classrooms/ui': {
      useStudentClassroomMembership: () => { controller = hook.useStudentClassroomMembership(); return controller; },
      StudentClassroomList: 'list', StudentClassroomDetail: 'detail', StudentClassroomJoinDialog: 'dialog',
    },
    '../../context': { useAppContext: () => ({ ...navigation.getSnapshot(), setView: navigation.setView }) },
    'motion/react': { motion: { div: 'motion.div' }, AnimatePresence: 'presence' },
  });
  let pageElements: Element[] = [];
  const render = () => {
    index = 0; pageElements = elements(page.AulasAlumno());
    assert.equal(pageElements.filter(item => item.type === 'dialog').length, 1);
    assert.equal(pageElements.find(item => item.type === 'dialog')!.props.membership, controller, 'Page wires the whole real controller');
    return controller;
  };
  const flush = () => effectQueue.splice(0).map(callback => callback());
  return { render, calls, reads: () => reads, records: () => records, replace: (next: any[]) => { records = next; },
    outcome: (next: any) => { result = next; }, start: () => flush()[0], flush,
    refresh: () => subscriber!(), dialog: (current = render()) => elements(leaf.StudentClassroomJoinDialog({ membership: current })),
    params: (next: any) => navigation.setView('aulas', next), page: () => pageElements,
    path: () => host.location.pathname, state: () => host.history.state, writes,
    travel: (delta: number) => {
      pathIndex = Math.max(0, Math.min(paths.length - 1, pathIndex + delta));
      host.location.pathname = paths[pathIndex]; listeners.forEach(listener => listener());
    },
  };
}
function open(mounted: ReturnType<typeof mount>, code = ' RAW ') {
  const initial = mounted.render(); mounted.start();
  initial.setInvitationCode(code); initial.setIsJoinModalOpen(true); return mounted.render();
}
function text(element: Element): string {
  return element.children.map(child => typeof child === 'object' && child ? text(child) : String(child ?? '')).join('');
}
function deferred() {
  let resolve!: (value: any) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('membership initializes lazily, mount and subscription copy records and cleanup unsubscribes', () => {
  const mounted = mount(), first = mounted.render(), record = mounted.records()[0];
  assert.equal(mounted.reads(), 1); assert.notEqual(first.classrooms, mounted.records()); assert.equal(first.classrooms[0], record);
  assert.equal(first.isJoinModalOpen, false); assert.equal(first.invitationCode, '');
  const cleanup = mounted.start();
  assert.deepEqual(mounted.calls.map(call => call[0]), ['read', 'read', 'subscribe']);
  assert.notEqual(mounted.render().classrooms, first.classrooms);
  const next = { id: 'a-2' }; mounted.replace([next]); mounted.refresh();
  const current = mounted.render(); assert.equal(current.classrooms[0], next); assert.notEqual(current.classrooms, mounted.records());
  assert.equal(mounted.reads(), 3); cleanup(); assert.deepEqual(mounted.calls.at(-1), ['unsubscribe']);
});

test('page selection/back and dialog hide preserve membership and code through browser history', () => {
  const mounted = mount(); let current = open(mounted, '  HIST-2026  '); const snapshot = current.classrooms;
  const initialState = mounted.state(); assert.deepEqual(Object.keys(initialState as object), [HISTORY_ENTRY_KEY]);
  const input = mounted.dialog(current).find(item => item.type === 'input')!;
  assert.equal(input.props.value, '  HIST-2026  '); input.props.onChange({ target: { value: 'typed code' } });
  mounted.dialog(current).filter(item => item.type === 'button')[0].props.onClick();
  assert.equal(mounted.render().isJoinModalOpen, false); assert.equal(mounted.render().invitationCode, 'typed code');
  current.setIsJoinModalOpen(true); mounted.dialog().filter(item => item.type === 'button')[1].props.onClick();
  assert.equal(mounted.render().invitationCode, 'typed code');
  mounted.page().find(item => item.type === 'list')!.props.onSelect(snapshot[0]);
  current = mounted.render(); assert.equal(mounted.path(), '/alumno/aulas/a-1');
  const detailState = mounted.state(); assert.notEqual(detailState, initialState);
  assert.equal(mounted.page().find(item => item.type === 'detail')!.props.aula, snapshot[0]);
  assert.equal(current.classrooms, snapshot); assert.equal(current.invitationCode, 'typed code');
  const count = mounted.writes.length;
  mounted.travel(-1); mounted.render(); assert.ok(mounted.page().some(item => item.type === 'list'));
  mounted.travel(1); mounted.render(); assert.equal(mounted.page().find(item => item.type === 'detail')!.props.aula, snapshot[0]);
  assert.equal(mounted.writes.length, count);
  mounted.page().find(item => item.type === 'detail')!.props.onBack(); mounted.render();
  assert.equal(mounted.path(), '/alumno/aulas'); assert.deepEqual(mounted.state(), detailState);
  assert.equal(mounted.writes.at(-1)[0], 'replace'); assert.equal(mounted.reads(), 2);
  assert.doesNotMatch(JSON.stringify(mounted.writes), /HIST-2026|typed code/);
});

test('direct and invalid/empty membership routes leave drafts intact during route correction', () => {
  const mounted = mount(); mounted.params({ aulaId: 'a-1' }); const current = open(mounted, 'pending code');
  assert.equal(mounted.page().find(item => item.type === 'detail')!.props.aula, current.classrooms[0]);
  mounted.params({ aulaId: 'missing', taskTitle: 'private task title' }); mounted.render();
  const detailState = mounted.state(); mounted.flush();
  assert.equal(mounted.path(), '/alumno/aulas'); assert.deepEqual(mounted.state(), detailState);
  const count = mounted.writes.length; mounted.render(); mounted.flush(); assert.equal(mounted.writes.length, count);
  assert.equal(mounted.render().classrooms, current.classrooms);
  mounted.replace([]); mounted.refresh(); mounted.params({ aulaId: 'a-1' }); mounted.render(); mounted.flush();
  assert.equal(mounted.path(), '/alumno/aulas'); assert.equal(mounted.render().classrooms.length, 0);
  assert.equal(mounted.render().invitationCode, 'pending code'); assert.equal(mounted.render().isJoinModalOpen, true);
  assert.doesNotMatch(JSON.stringify(mounted.writes), /pending code|private task title/);
});

test('rejected join retains modal/code; duplicate closes/clears with its exact toast and no refresh', async () => {
  for (const status of ['rejected', 'duplicate']) {
    const mounted = mount(), current = open(mounted), snapshot = current.classrooms;
    mounted.outcome({ status, classroom: snapshot[0] }); mounted.calls.length = 0;
    await current.handleJoinClassroom();
    assert.equal(mounted.calls[0][1], ' RAW '); assert.equal(mounted.calls[0][2], snapshot);
    assert.equal(mounted.render().classrooms, snapshot); assert.equal(mounted.reads(), 2);
    if (status === 'rejected') {
      assert.equal(mounted.render().isJoinModalOpen, true); assert.equal(mounted.render().invitationCode, ' RAW ');
      assert.equal(mounted.calls.length, 1);
    } else {
      assert.deepEqual(mounted.calls[1], ['toast', 'Ya estás matriculado en Historia (2° B)', 'info']);
      assert.equal(mounted.render().isJoinModalOpen, false); assert.equal(mounted.render().invitationCode, '');
    }
  }
});

test('catalogue and generic success copy membership and close/clear with distinct existing toasts', async () => {
  for (const status of ['catalogue', 'generic']) {
    const mounted = mount(), current = open(mounted, 'untrimmed '), snapshot = current.classrooms;
    const aula = { id: 'joined', subject: 'Literatura', course: '3° A' };
    mounted.replace([aula, snapshot[0]]); mounted.outcome({ status, classroom: aula }); mounted.calls.length = 0;
    const submit = mounted.dialog(current).filter(item => item.type === 'button')[2];
    assert.equal(submit.props.disabled, false); assert.equal(submit.props.onClick, current.handleJoinClassroom);
    await submit.props.onClick();
    assert.equal(mounted.calls[0][1], 'untrimmed '); assert.equal(mounted.calls[0][2], snapshot);
    assert.deepEqual(mounted.calls.map(call => call[0]), ['join', 'read', 'toast']);
    assert.deepEqual(mounted.calls.at(-1), ['toast', status === 'catalogue'
      ? '🎉 ¡Te has unido exitosamente al aula de Literatura (3° A)!'
      : '🎉 Te has unido al aula de Literatura (3° A) mediante tu código de acceso', 'success']);
    const next = mounted.render(); assert.equal(mounted.reads(), 3);
    assert.notEqual(next.classrooms, mounted.records()); assert.notEqual(next.classrooms, snapshot);
    assert.equal(next.classrooms[0], aula); assert.equal(next.classrooms[1], snapshot[0]);
    assert.equal(next.isJoinModalOpen, false); assert.equal(next.invitationCode, '');
  }
  const mounted = mount(); open(mounted, ' \t ');
  assert.equal(mounted.dialog().filter(item => item.type === 'button')[2].props.disabled, true);
});

test('promise enrollment blocks duplicate events, code changes and closing before rendering pending UI', async () => {
  const mounted = mount(), current = open(mounted), work = deferred(); mounted.outcome(work.promise);
  const first = current.handleJoinClassroom();
  current.setInvitationCode('conflicting'); current.setIsJoinModalOpen(false);
  await current.handleJoinClassroom();
  const pending = mounted.render(); assert.equal(pending.isJoining, true); assert.equal(pending.invitationCode, ' RAW ');
  assert.equal(pending.isJoinModalOpen, true); assert.equal(mounted.calls.filter(call => call[0] === 'join').length, 1);
  const ui = mounted.dialog(pending), input = ui.find(item => item.type === 'input')!;
  assert.equal(input.props.disabled, true);
  assert.equal(ui.find(item => item.type === 'label')!.props.htmlFor, input.props.id);
  assert.ok(ui.some(item => item.props.role === 'dialog' && item.props['aria-busy'] === true));
  assert.ok(ui.some(item => item.props.role === 'status' && /Uniéndote/.test(text(item))));
  for (const button of ui.filter(item => item.type === 'button')) assert.equal(button.props.disabled, true);
  assert.equal(ui.filter(item => item.type === 'button')[0].props['aria-label'], 'Cerrar diálogo de inscripción');
  work.resolve({ status: 'duplicate', classroom: pending.classrooms[0] }); await first;
  assert.equal(mounted.render().isJoining, false); assert.equal(mounted.render().invitationCode, '');
  assert.equal(mounted.render().isJoinModalOpen, false);
});

test('throw/rejection retains code/dialog with accessible Spanish error and working retry', async () => {
  for (const asynchronous of [false, true]) {
    const mounted = mount(), current = open(mounted);
    mounted.outcome(() => { if (asynchronous) return Promise.reject(new Error('private detail')); throw new Error('private detail'); });
    await current.handleJoinClassroom();
    const failed = mounted.render(); assert.equal(failed.invitationCode, ' RAW '); assert.equal(failed.isJoinModalOpen, true);
    assert.equal(failed.isJoining, false);
    const ui = mounted.dialog(failed), alert = ui.find(item => item.props.role === 'alert')!;
    assert.ok(alert); assert.match(text(alert), /código se conserva/); assert.doesNotMatch(text(alert), /private detail/);
    const input = ui.find(item => item.type === 'input')!;
    assert.equal(input.props['aria-describedby'], alert.props.id);
    const retry = ui.filter(item => item.type === 'button')[2];
    assert.equal(text(retry), 'Reintentar inscripción'); assert.equal(retry.props.disabled, false);
    mounted.outcome({ status: 'generic', classroom: failed.classrooms[0] }); await retry.props.onClick();
    const confirmed = mounted.render(); assert.equal(confirmed.invitationCode, ''); assert.equal(confirmed.isJoinModalOpen, false);
    assert.equal(confirmed.joinError, null);
  }
});

test('unmount invalidates pending success/failure before a new dialog/code can be altered', async () => {
  for (const reject of [false, true]) {
    const mounted = mount(); let current = mounted.render(); const cleanup = mounted.start();
    current.setInvitationCode('old code'); current.setIsJoinModalOpen(true); current = mounted.render();
    const work = deferred(); mounted.outcome(work.promise); const attempt = current.handleJoinClassroom();
    cleanup();
    const newer = mount(); open(newer, 'new code');
    mounted.calls.length = 0;
    if (reject) work.reject(new Error('late failure'));
    else work.resolve({ status: 'catalogue', classroom: current.classrooms[0] });
    await attempt;
    assert.deepEqual(mounted.calls, []); assert.equal(newer.render().invitationCode, 'new code');
    assert.equal(newer.render().isJoinModalOpen, true); assert.equal(newer.render().joinError, null);
  }
});

test('existing functional setters and old handlers use the latest code and ignore a closed dialog', async () => {
  const mounted = mount(), current = open(mounted, 'first');
  current.setInvitationCode((code: string) => `${code}-latest`);
  mounted.outcome({ status: 'generic', classroom: current.classrooms[0] }); mounted.calls.length = 0;
  await current.handleJoinClassroom(); await current.handleJoinClassroom();
  const joins = mounted.calls.filter(call => call[0] === 'join');
  assert.equal(joins.length, 1); assert.equal(joins[0][1], 'first-latest');
  current.setInvitationCode((code: string) => `${code}new`); current.setIsJoinModalOpen((open: boolean) => !open);
  assert.equal(mounted.render().invitationCode, 'new'); assert.equal(mounted.render().isJoinModalOpen, true);
});

test('malformed operation results retain drafts and cannot trigger success toasts', async () => {
  for (const outcome of [undefined, null, { status: 'generic' }, Promise.resolve(undefined)]) {
    const mounted = mount(), current = open(mounted); mounted.outcome(outcome); mounted.calls.length = 0;
    await current.handleJoinClassroom();
    const failed = mounted.render(); assert.equal(failed.isJoinModalOpen, true); assert.equal(failed.invitationCode, ' RAW ');
    assert.equal(failed.isJoining, false); assert.ok(failed.joinError);
    assert.deepEqual(mounted.calls.map(call => call[0]), ['join']);
  }
});

test('async catalogue/generic confirmation reads membership only after completion', async () => {
  for (const status of ['catalogue', 'generic']) {
    const mounted = mount(), current = open(mounted), snapshot = current.classrooms, work = deferred();
    mounted.outcome(work.promise); mounted.calls.length = 0;
    const attempt = current.handleJoinClassroom();
    assert.equal(mounted.render().classrooms, snapshot);
    assert.deepEqual(mounted.calls.map(call => call[0]), ['join']);
    const aula = { id: 'later', subject: 'Ciencias', course: '3° B' };
    mounted.replace([aula, ...snapshot]); work.resolve({ status, classroom: aula }); await attempt;
    const confirmed = mounted.render();
    assert.equal(confirmed.classrooms[0], aula); assert.notEqual(confirmed.classrooms, mounted.records());
    assert.equal(confirmed.invitationCode, ''); assert.equal(confirmed.isJoinModalOpen, false);
    assert.equal(confirmed.isJoining, false); assert.equal(confirmed.joinError, null);
    assert.deepEqual(mounted.calls.map(call => call[0]), ['join', 'read', 'toast']);
  }
});
