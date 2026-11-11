import React from 'react';
import { loadTsModule } from '../load-ts-module.mjs';
import { componentWithPorts } from '../../foxmind-3d-flows-loader.test.mjs';
import { descendants } from '../../agenda-ui-helpers.test.mjs';

export const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
const expand = node => {
  if (Array.isArray(node)) return node.map(expand);
  if (!React.isValidElement(node)) return node;
  if (['WizardGeneral', 'WizardPlan', 'WizardPlanSource', 'WizardCover', 'WizardReview', 'WizardCurriculum', 'WizardSuggestions', 'PlanExtraction','CreationSteps'].includes(node.type?.name)) return expand(node.type(node.props));
  return React.cloneElement(node, undefined, expand(node.props.children));
};
function mount(Component, props) {
  const slots = [], cleanups = new Map(); let cursor = 0, dirty = true, tree, effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; dirty = true; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useMemo(factory, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: factory(), deps }; return slots[i].value; },
    useCallback(value, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { value, deps }; return slots[i].value; },
    useEffect(effect, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { slots[i] = { deps }; effects.push([i, effect]); } },
  };
  return {
    get tree() { return expand(tree); },
    async flush() { for (let pass = 0; pass < 30; pass++) {
      if (dirty) { cursor = 0; dirty = false; const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internal.H;
        internal.H = hooks; try { tree = Component(props); } finally { internal.H = previous; }
        const pending = effects; effects = []; for (const [i, effect] of pending) { cleanups.get(i)?.(); cleanups.set(i, effect()); }
      } await Promise.resolve();
    } },
    close() { for (const cleanup of cleanups.values()) cleanup?.(); },
  };
}
export const initialDraft = () => ({ id: 'draft', revision: '1', publishedClassroomId: null, payload: {
  name: 'Ciencias', subject: 'Biología', division: 'A', academicYear: 2026, timezone: 'UTC', coverKey: 'biology', planFileId: 'approved',
  units: [{ name: 'Primera', topics: [{ name: 'Célula' }] }, { name: 'Segunda', topics: [{ name: 'Ecosistema' }] }],
} });
export const ready = id => ({ id, name: 'plan.pdf', ready: true, upload: 'COMPLETE', validation: 'APPROVED', scan: 'CLEAN', rejectionCode: null });
export async function wizard({ draft = initialDraft(), upload, call, fileStatus, extractionBusy = false, extractionView = null } = {}) {
  const oldWindow = globalThis.window; globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const calls = [], uploads = [], exits = [], published = [], extractionInputs = [], noop = () => null;
  const { Wizard } = componentWithPorts('apps/web/src/application/academic-Wizard.tsx', {"../../../../../shared-ui/academic-cover.tsx":{...loadTsModule('apps/shared-ui/academic-cover.tsx'),Cover: noop,Notice: ({ children }) => React.createElement('div', {}, children),coverOptions: () => [{ key: 'biology', label: 'Biología' }]},
"../../../shared-ui/academic-cover.tsx":{...loadTsModule('apps/shared-ui/academic-cover.tsx'),Cover: noop,Notice: ({ children }) => React.createElement('div', {}, children),coverOptions: () => [{ key: 'biology', label: 'Biología' }]},
"./PlanExtraction.tsx":{PlanExtraction: ({ extraction }) => React.createElement('button', { type: 'button', onClick: extraction.cancel }, 'Continuar manualmente')},
"../features/curriculum/index.ts":{...loadTsModule('apps/web/src/features/curriculum/index.ts'),classroomZones: () => [{ value: 'UTC', label: 'UTC' }],usePlanExtraction: options => { extractionInputs.push(options); return { busy: extractionBusy, view: extractionView, cancel: () => {} }; }},
"./classroom-zones.ts":{classroomZones: () => [{ value: 'UTC', label: 'UTC' }]},
"./index.ts":{EntryIcon: noop,FoxmindIcon: noop,FoxmindIllustration: noop,AiProgress: noop},
"../../../../../shared-ui/index.ts":{EntryIcon: noop,FoxmindIcon: noop,FoxmindIllustration: noop,AiProgress: noop},
"../../../shared-ui/index.ts":{EntryIcon: noop,FoxmindIcon: noop,FoxmindIllustration: noop,AiProgress: noop}});
  const api = { call: async (...args) => { calls.push(args); return call ? call(...args) : { ...draft, revision: '2', payload: args[2]?.payload ?? draft.payload }; },
    upload: async (...args) => { uploads.push(args); return upload ? upload(...args) : ready('replacement'); }, fileStatus: fileStatus ?? (async id => ready(id)), fileUrl: () => '/fixture.pdf' };
  const view = mount(Wizard, { api, draft, onExit: () => exits.push(true), onPublished: (...args) => published.push(args) });
  await view.flush();
  return { view, calls, uploads, exits, published, extractionInputs, close() { view.close(); globalThis.window = oldWindow; } };
}
export const nodes = (view, predicate) => descendants(view.tree, predicate);
export const button = (view, label) => nodes(view, n => n.type === 'button').find(n => text(n).trim() === label || n.props['aria-label'] === label);
export async function advance(view) { nodes(view, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush(); }
export const toggles = view => nodes(view, n => n.type === 'button' && typeof n.props['aria-expanded'] === 'boolean' && /unidad/i.test(`${n.props['aria-label'] ?? ''} ${text(n)}`));

export async function manualPlan(f) { await advance(f.view); nodes(f.view, n => n.type === "input" && n.props.name === "plan-method" && n.props.value === "manual")[0].props.onChange(); await f.view.flush(); await advance(f.view); }
