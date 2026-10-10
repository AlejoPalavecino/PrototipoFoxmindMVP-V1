import type { Role } from '../types';
import { createPresentationSession, type PresentationTransition } from './useRoutePresentation';
import type { AppView, ParamsByView, SetAppView, StoredNavigationParams } from './navigation';

export interface RouteSnapshot {
  role: Role;
  view: AppView;
  navigationParams?: StoredNavigationParams;
}

// A narrow browser seam; writes never store compatibility payloads in history.state.
export interface HistoryHost {
  location: { pathname: string; search: string; hash: string };
  history: Pick<History, 'pushState' | 'replaceState'> & { readonly state?: unknown };
  addEventListener(event: 'popstate', listener: () => void): void;
  removeEventListener(event: 'popstate', listener: () => void): void;
}

const viewsByRole: Record<Exclude<Role, 'none'>, readonly AppView[]> = {
  alumno: ['dashboard', 'aulas', 'progreso', 'mensajes', 'config', 'estudia'],
  docente: ['dashboard', 'agenda', 'aulas', 'progreso', 'copiloto', 'mensajes', 'config'],
};

function isRole(role: string): role is Exclude<Role, 'none'> {
  return role === 'alumno' || role === 'docente';
}

function dashboard(role: Role = 'none'): RouteSnapshot {
  return { role, view: 'dashboard' };
}

function isView(role: Exclude<Role, 'none'>, view: string): view is AppView {
  return viewsByRole[role].includes(view as AppView);
}

function encodeId(id?: string): string | undefined {
  // Browsers normalize dot segments even when percent-encoded.
  if (!id || id === '.' || id === '..') return undefined;
  try {
    return encodeURIComponent(id);
  } catch {
    return undefined; // Unpaired UTF-16 surrogates cannot form a URL ID.
  }
}

// Unknown roles -> root; any invalid route under a known role -> its dashboard.
// This chooses a UI mode only, never authorization or ID existence/access.
export function decodeRoute(pathname: string): RouteSnapshot {
  const parts = pathname.split('/');
  const role = parts[1];
  if (parts[0] !== '' || !isRole(role)) return dashboard();
  const view = parts[2];
  if (!isView(role, view) || (parts.length !== 3 && parts.length !== 4)) return dashboard(role);
  if (parts.length === 3) return { role, view };
  if (view !== 'aulas' && view !== 'mensajes') return dashboard(role);
  try {
    const id = decodeURIComponent(parts[3]);
    if (!encodeId(id)) return dashboard(role);
    const navigationParams = view === 'mensajes'
      ? { conversationId: id }
      : role === 'docente' ? { openAulaId: id } : { aulaId: id };
    return { role, view, navigationParams };
  } catch {
    return dashboard(role);
  }
}

export function encodeRoute({ role, view, navigationParams }: RouteSnapshot): string {
  if (!isRole(role) || view === '') return '/';
  if (!isView(role, view)) return `/${role}/dashboard`;
  const id = view === 'mensajes' ? navigationParams?.conversationId
    : view === 'aulas' ? (role === 'docente' ? navigationParams?.openAulaId : navigationParams?.aulaId)
      : undefined;
  const encoded = encodeId(id);
  return `/${role}/${view}${encoded ? `/${encoded}` : ''}`;
}

type Navigate = <V extends AppView>(
  view: V,
  params?: ParamsByView[NoInfer<V>],
  mode?: 'push' | 'replace',
) => void;

export const HISTORY_ENTRY_KEY = '__foxmindNavigationEntry';
let entrySequence = 0;
const newEntryId = () => globalThis.crypto?.randomUUID?.() ?? `entry-${Date.now()}-${++entrySequence}`;
function entryFromState(state: unknown): string | undefined {
  if (!state || typeof state !== 'object') return undefined;
  const token = (state as Record<string, unknown>)[HISTORY_ENTRY_KEY];
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}
function entryState(state: unknown, entryId: string) {
  // Preserve other owners' object fields without serializing any application payload.
  return { ...(state && typeof state === 'object' && !Array.isArray(state) ? state : {}), [HISTORY_ENTRY_KEY]: entryId };
}

export function createUrlNavigation(host?: HistoryHost) {
  const currentPath = () => host
    ? `${host.location.pathname}${host.location.search}${host.location.hash}`
    : '/';
  let lastPath = currentPath();
  let snapshot = decodeRoute(host?.location.pathname ?? '/');
  let transition: PresentationTransition = {
    id: 0, kind: 'initial', entryId: entryFromState(host?.history.state) ?? newEntryId(),
  };
  const presentation = createPresentationSession();
  presentation.transition(transition);
  const updateTransition = (kind: PresentationTransition['kind'], entryId = transition.entryId) => {
    transition = { id: transition.id + 1, kind, entryId };
    presentation.transition(transition);
  };
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };

  const canonicalize = () => {
    const path = encodeRoute(snapshot);
    // Query/hash are intentionally not supported; discard rather than propagate them.
    if (host && (currentPath() !== path || entryFromState(host.history.state) !== transition.entryId)) {
      host.history.replaceState(entryState(host.history.state, transition.entryId), '', path);
    }
    lastPath = currentPath();
  };

  const onPopState = () => {
    updateTransition('traverse', entryFromState(host?.history.state) ?? newEntryId());
    snapshot = decodeRoute(host?.location.pathname ?? '/');
    canonicalize();
    notify(); // Never restore transient prompts/contact actions on traversal.
  };

  const publish = (next: RouteSnapshot, mode: 'push' | 'replace') => {
    const path = encodeRoute(next);
    const pathChanged = encodeRoute(snapshot) !== path;
    const screenChanged = snapshot.role !== next.role || snapshot.view !== next.view;
    const entryId = pathChanged && mode === 'push' ? newEntryId() : transition.entryId;
    updateTransition(screenChanged ? 'screen' : pathChanged ? 'resource' : 'payload', entryId);
    if (host && currentPath() !== path) {
      host.history[mode === 'push' ? 'pushState' : 'replaceState'](
        entryState(mode === 'replace' ? host.history.state : undefined, entryId), '', path,
      );
    } else if (host && entryFromState(host.history.state) !== entryId) {
      host.history.replaceState(entryState(host.history.state, entryId), '', path);
    }
    lastPath = currentPath();
    snapshot = next;
    notify(); // Native pushState/replaceState do not emit popstate.
  };

  const navigate: Navigate = (view, params, mode = 'push') => {
    const next = decodeRoute(encodeRoute({ role: snapshot.role, view, navigationParams: params }));
    // Only accepted destinations receive compatibility payloads; durable fields
    // come from the codec, not wrong-role or unencodable caller IDs.
    if (params && next.role !== 'none' && next.view === view) {
      const transient: StoredNavigationParams = { ...params };
      delete transient.aulaId;
      delete transient.openAulaId;
      delete transient.conversationId;
      next.navigationParams = { ...transient, ...next.navigationParams };
    }
    publish(next, mode);
  };
  const setView: SetAppView = navigate;

  return {
    getSnapshot: () => snapshot,
    getTransition: () => transition,
    presentation,
    subscribe(listener: () => void) {
      // Unique subscriptions allow independent cleanup even for the same callback.
      const subscription = () => listener();
      listeners.add(subscription);
      if (listeners.size === 1) {
        host?.addEventListener('popstate', onPopState);
        if (currentPath() !== lastPath || (entryFromState(host?.history.state) && entryFromState(host?.history.state) !== transition.entryId)) onPopState();
        else canonicalize();
      }
      return () => {
        listeners.delete(subscription);
        if (listeners.size === 0) host?.removeEventListener('popstate', onPopState);
      };
    },
    navigate,
    setView,
    setRole: (role: Role) => publish(dashboard(isRole(role) ? role : 'none'), 'push'),
  };
}
