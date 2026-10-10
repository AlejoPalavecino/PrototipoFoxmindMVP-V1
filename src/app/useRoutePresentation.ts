import { createContext, useCallback, useContext, useLayoutEffect, type ReactNode } from 'react';
import type { RouteSnapshot } from './routing';

export interface PresentationTransition {
  id: number;
  entryId: string;
  kind: 'initial' | 'screen' | 'resource' | 'payload' | 'traverse';
}
interface MainScroller {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  focus(options: { preventScroll: boolean }): void;
}
interface Scheduler {
  schedule(callback: () => void): () => void;
}

const labels = {
  alumno: { dashboard: 'Mi Dashboard', estudia: 'Carpeta de Estudio', aulas: 'Mis Aulas', progreso: 'Mi Progreso', mensajes: 'Mensajes', config: 'Configuración' },
  docente: { dashboard: 'Dashboard', agenda: 'Agenda', aulas: 'Aulas', progreso: 'Progreso de Clase', copiloto: 'Foxy IA', mensajes: 'Mensajes', config: 'Configuración' },
};
export function routeTitle({ role, view }: RouteSnapshot) {
  if (role === 'none') return 'Seleccionar rol | FoxMind';
  const screens = labels[role];
  const label = screens[view as keyof typeof screens] ?? screens.dashboard;
  return `${label} · ${role === 'alumno' ? 'Alumno' : 'Docente'} | FoxMind`;
}

// Session-owned, not layout-owned: tokens identify entries, coordinates never leave memory.
// The scheduler seam exercises the same bounded restoration used in the browser.
export function createPresentationSession(scheduler: Scheduler = {
  schedule(callback) { const timer = setTimeout(callback, 100); return () => clearTimeout(timer); },
}) {
  const positions = new Map<string, number>();
  let current: PresentationTransition | undefined;
  let main: MainScroller | null = null;
  let displayedEntry: string | undefined;
  let readyId = -1;
  let completedId = -1;
  let attempts = 0;
  let restoring = false;
  let pendingScreen = false;
  let cancel: (() => void) | undefined;
  const stop = () => { cancel?.(); cancel = undefined; };
  const capture = () => {
    if (main && displayedEntry && !restoring) positions.set(displayedEntry, main.scrollTop);
  };
  const present = () => {
    if (!main || !current || readyId !== current.id || completedId === current.id) return;
    displayedEntry = current.entryId;
    if (pendingScreen) {
      pendingScreen = false;
      completedId = current.id;
      main.scrollTop = 0;
      main.focus({ preventScroll: true });
    } else if (current.kind === 'traverse') {
      restoring = true;
      const target = positions.get(current.entryId) ?? 0;
      const available = Math.max(0, main.scrollHeight - main.clientHeight);
      main.scrollTop = Math.min(target, available);
      if (available >= target || ++attempts >= 50) {
        completedId = current.id;
        restoring = false;
      } else {
        cancel = scheduler.schedule(() => { cancel = undefined; present(); });
      }
    } else {
      completedId = current.id; // Hydration/resources/payloads never focus or reset.
    }
  };
  return {
    transition(next: PresentationTransition) {
      capture(); stop(); restoring = false;
      if (next.kind === 'screen') pendingScreen = true;
      else if (next.kind !== 'resource' && next.kind !== 'payload') pendingScreen = false;
      current = next; readyId = -1; attempts = 0; displayedEntry = undefined;
    },
    attach(element: MainScroller | null) {
      stop(); main = element;
      if (current?.kind === 'initial') displayedEntry = current.entryId;
      if (main) present();
    },
    ready(id: number) {
      if (id !== current?.id) return;
      readyId = id;
      stop(); present();
    },
    capture,
    interrupt() {
      stop(); restoring = false; pendingScreen = false;
      if (current) completedId = current.id;
      capture();
    },
  };
}

export const RoutePresentationContext = createContext<{
  session: ReturnType<typeof createPresentationSession>;
  transition: PresentationTransition;
} | null>(null);

export function useRoutePresentation() {
  const context = useContext(RoutePresentationContext);
  // Callback refs handle lazy layout mounts and StrictMode detach/attach, with no global queries.
  return useCallback((main: HTMLElement | null) => {
    if (!context) return;
    context.session.attach(main);
    if (!main) return;
    const { capture, interrupt } = context.session;
    main.addEventListener('scroll', capture);
    const intents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    intents.forEach(event => main.addEventListener(event, interrupt));
    return () => {
      main.removeEventListener('scroll', capture);
      intents.forEach(event => main.removeEventListener(event, interrupt));
      context.session.attach(null);
    };
  }, [context?.session]);
}

// Mount inside Suspense: effects run only once lazy content actually commits.
// This wrapper has no route key, so resource/payload updates keep healthy page state.
export function RoutePresentationReady({ children }: { children: ReactNode }) {
  const context = useContext(RoutePresentationContext);
  useLayoutEffect(() => {
    if (context) context.session.ready(context.transition.id);
  }, [context?.session, context?.transition.id]);
  return children;
}
