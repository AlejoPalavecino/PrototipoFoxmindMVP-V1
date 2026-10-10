import { deepStrictEqual, equal } from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppContext } from '../../context';
import { createDefaultAppSettings } from '../settings';
import { AlumnoLayout } from '../../components/layout/AlumnoLayout';
import { DocenteLayout } from '../../components/layout/DocenteLayout';
import type { AppView } from '../navigation';
import { createPresentationSession, routeTitle, type PresentationTransition } from '../useRoutePresentation';

function fixture() {
  const pending = new Set<() => void>();
  const session = createPresentationSession({
    schedule(callback) { pending.add(callback); return () => pending.delete(callback); },
  });
  const focuses: unknown[] = [];
  const main = {
    scrollTop: 0, scrollHeight: 1200, clientHeight: 200,
    focus(options: unknown) { focuses.push(options); },
  };
  const transition = (id: number, kind: PresentationTransition['kind'], entryId = String(id)) => {
    const next = { id, kind, entryId };
    session.transition(next);
    return next;
  };
  return { session, main, focuses, pending, transition, tick() {
    const callbacks = [...pending]; pending.clear(); callbacks.forEach(callback => callback());
  } };
}

test('titles cover root and role screens without private resource or draft names', () => {
  equal(routeTitle({ role: 'none', view: 'dashboard' }), 'Seleccionar rol | FoxMind');
  equal(routeTitle({ role: 'docente', view: 'agenda' }), 'Agenda · Docente | FoxMind');
  equal(routeTitle({ role: 'alumno', view: 'aulas', navigationParams: { aulaId: 'private', taskTitle: 'secret' } }), 'Mis Aulas · Alumno | FoxMind');
});

test('SSR shells mark actual desktop/mobile destinations including hidden overflow, and retain focusable scrolling main', () => {
  for (const [role, Layout, views] of [
    ['alumno', AlumnoLayout, ['dashboard', 'estudia', 'aulas', 'progreso', 'mensajes', 'config']],
    ['docente', DocenteLayout, ['dashboard', 'agenda', 'aulas', 'progreso', 'copiloto', 'mensajes', 'config']],
  ] as const) {
    for (const view of views) {
      const html = renderToStaticMarkup(createElement(AppContext.Provider, { value: {
        role, view: view as AppView, settings: createDefaultAppSettings(),
        setView() {}, setRole() {}, updateSettings() {},
      } }, createElement(Layout)));
      const buttons = [...html.matchAll(/<button\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/button>/g)];
      equal(buttons.length, 2, 'One desktop and one actual mobile destination, including hidden disclosure items');
      const label = routeTitle({ role, view }).split(' · ')[0];
      for (const button of buttons) equal(button[0].includes(label), true, 'Full accessible label is preserved alongside compact mobile text');
      equal(/<main[^>]*tabindex="-1"[^>]*overflow-y-auto/.test(html), true);
      equal(html.includes('aria-current="false"'), false);
      equal(html.includes('aria-label="Navegación móvil"'), true);
      equal(html.includes('aria-expanded="false"'), true);
      equal(html.includes('pb-20 md:pb-0'), true);
      if (view === 'config' || (role === 'docente' && view === 'mensajes')) {
        equal(/<button[^>]*aria-expanded="false"[^>]*text-fox-orange[^>]*>[\s\S]*?Más<\/span>/.test(html), true, 'Más indicates an overflow route without aria-current');
      }
    }
  }
});

test('initial hydration does not focus or reset; manual screen waits for committed content', () => {
  const f = fixture();
  const initial = f.transition(0, 'initial');
  f.main.scrollTop = 80;
  f.session.attach(f.main);
  f.session.ready(initial.id);
  equal(f.main.scrollTop, 80);
  deepStrictEqual(f.focuses, []);
  const next = f.transition(1, 'screen');
  equal(f.main.scrollTop, 80);
  f.session.ready(initial.id); // A stale lazy subtree cannot present the new route.
  equal(f.main.scrollTop, 80);
  f.session.ready(next.id);
  equal(f.main.scrollTop, 0);
  deepStrictEqual(f.focuses, [{ preventScroll: true }]);
  f.session.attach(null); f.session.attach(f.main); f.session.ready(next.id);
  equal(f.focuses.length, 1, 'StrictMode replay must not focus twice');
});

test('same-screen corrections before lazy readiness retain the pending manual screen action', () => {
  const f = fixture();
  f.transition(0, 'initial'); f.session.attach(f.main); f.main.scrollTop = 260;
  f.transition(1, 'screen');
  f.session.ready(f.transition(2, 'resource').id);
  equal(f.main.scrollTop, 0);
  equal(f.focuses.length, 1);
  f.main.scrollTop = 190;
  f.session.ready(f.transition(3, 'payload').id);
  equal(f.main.scrollTop, 190); equal(f.focuses.length, 1);
});

test('resource and payload changes preserve scroll and composer focus', () => {
  const f = fixture();
  f.transition(0, 'initial'); f.session.attach(f.main);
  for (const [id, kind] of [[1, 'resource'], [2, 'payload']] as const) {
    f.main.scrollTop = 310;
    f.session.ready(f.transition(id, kind).id);
    equal(f.main.scrollTop, 310);
  }
  deepStrictEqual(f.focuses, []);
});

test('per-entry traversal restores repeated paths and retries boundedly for animation growth', () => {
  const f = fixture();
  f.transition(0, 'initial', 'a'); f.session.attach(f.main); f.main.scrollTop = 700;
  f.session.ready(f.transition(1, 'screen', 'b').id); f.main.scrollTop = 140;
  f.session.ready(f.transition(2, 'screen', 'c').id); f.main.scrollTop = 450;
  const back = f.transition(3, 'traverse', 'a');
  f.main.scrollHeight = 300;
  f.session.ready(back.id);
  equal(f.main.scrollTop, 100);
  equal(f.pending.size, 1);
  f.main.scrollHeight = 1200; f.tick();
  equal(f.main.scrollTop, 700);
  equal(f.pending.size, 0);
  f.session.ready(f.transition(4, 'traverse', 'c').id);
  equal(f.main.scrollTop, 450);
  equal(f.focuses.length, 2, 'traversal never focuses');
  f.main.scrollHeight = 200;
  f.session.ready(f.transition(5, 'traverse', 'a').id);
  for (let i = 0; i < 60; i++) f.tick();
  equal(f.pending.size, 0, 'restoration cannot retry indefinitely');
});

test('lazy layout attach resumes restoration; detach, new transition and user intent cancel retries', () => {
  const f = fixture();
  f.transition(0, 'initial', 'a'); f.session.attach(f.main); f.main.scrollTop = 700;
  f.transition(1, 'screen', 'b'); f.session.attach(null);
  const back = f.transition(2, 'traverse', 'a');
  f.session.ready(back.id); f.main.scrollHeight = 200; f.session.attach(f.main);
  equal(f.pending.size, 1);
  f.session.attach(null); equal(f.pending.size, 0);
  f.session.attach(f.main); equal(f.pending.size, 1);
  f.session.interrupt(); equal(f.pending.size, 0);
  f.main.scrollTop = 20; f.tick(); equal(f.main.scrollTop, 20);
  f.session.ready(f.transition(3, 'traverse', 'a').id);
  f.transition(4, 'resource', 'd'); equal(f.pending.size, 0);
});
