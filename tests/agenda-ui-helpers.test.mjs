import React from 'react';

let nextViewId = 0;

// Minimal hook runner for the real component: state/effect lifecycles only, no mocked Agenda logic.
export function hookView(Component, props) {
  const viewId = nextViewId++;
  const slots = [], cleanups = new Map();
  let cursor = 0, dirty = true, tree, effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useId() { return `test-view-${viewId}-${cursor++}`; },
    useCallback(value, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { value, deps };
      return slots[i].value;
    },
    useMemo(create, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { value: create(), deps };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) { slots[i] = { deps }; effects.push([i, effect]); }
    },
  };
  const render = () => {
    cursor = 0; dirty = false;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const prior = internals.H; internals.H = hooks;
    try { tree = Component(props); } finally { internals.H = prior; }
    const pending = effects; effects = [];
    for (const [index, effect] of pending) { cleanups.get(index)?.(); cleanups.set(index, effect()); }
  };
  return {
    get tree() { return tree; },
    async flush() { for (let i = 0; i < 12; i++) { if (dirty) render(); await Promise.resolve(); } },
    close() { for (const cleanup of cleanups.values()) cleanup?.(); },
  };
}
export function descendants(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(value => descendants(value, predicate));
  if (!React.isValidElement(node)) return [];
  // Expand shared, stateless presentation just as the DOM renderer does.
  if (['FoxyToolPicker','CollectionStateFilter','CreationSteps','AgendaToolbar'].includes(node.type?.name)) return descendants(node.type(node.props), predicate);
  return [...(predicate(node) ? [node] : []), ...descendants(node.props.children, predicate)];
}
export function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
