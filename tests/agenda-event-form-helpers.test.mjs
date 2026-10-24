import { randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';

export const zone = 'America/Argentina/Buenos_Aires';
export const day = '2026-10-27';
export function privateEvent(overrides = {}) {
  return { id: randomUUID(), revision: randomUUID(), title: 'Clase de Historia', description: '', category: 'CLASS',
    schedule: { kind: 'TIMED', timeZone: zone, startLocal: `${day}T18:00`, endLocal: `${day}T19:00` },
    repeat: { kind: 'NONE' }, ...overrides };
}
export async function editorView(api, event, onSaved = () => {}) {
  const { useEventEditor } = loadTsModule('apps/agenda-ui/index.ts');
  const view = hookView(() => useEventEditor(api, event, day, zone, onSaved), {});
  await view.flush();
  return view;
}
export function installWindow(confirm = () => true) {
  const previous = globalThis.window;
  globalThis.window = Object.assign(new EventTarget(), { confirm });
  return () => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  };
}
