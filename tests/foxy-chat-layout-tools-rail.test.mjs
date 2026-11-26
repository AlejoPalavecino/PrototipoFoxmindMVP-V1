import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

// Minimal browser surface the layout touches: events, storage and listeners. No layout logic is replaced.
function browser(stored = {}) {
  const storage = { ...stored }, listeners = [];
  globalThis.window = {
    innerWidth: 1440,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
    localStorage: {
      getItem: key => storage[key] ?? null,
      setItem: (key, value) => { storage[key] = String(value); },
      removeItem: key => { delete storage[key]; },
    },
  };
  globalThis.document = {
    addEventListener: (type, fn) => listeners.push([type, fn]),
    removeEventListener: (type, fn) => listeners.splice(listeners.findIndex(entry => entry[1] === fn), 1),
    querySelector: () => null,
  };
  return { storage, listeners, restore() { delete globalThis.window; delete globalThis.document; } };
}

const { FoxyChatLayout } = componentWithPorts('apps/shared-ui/FoxyChatLayout.tsx', {});
const tools = React.createElement('div', null,
  React.createElement('button', { type: 'button', id: 'practice' }, 'Practicar'),
  React.createElement('button', { type: 'button', id: 'outline', disabled: true }, 'Conectar ideas'));

function layout(props) {
  const views = [];
  const base = { view: 'chat', onView: next => views.push(next), history: null, tools, creations: null, children: React.createElement('p', null, 'chat') };
  return { view: hookView(FoxyChatLayout, { ...base, ...props }), views };
}
const menuOf = tree => descendants(tree, node => node.type?.name === 'ToolsMenu')[0];

test('Herramientas es un menú desplegable en la cabecera, no un diálogo que tapa el chat', async () => {
  const env = browser();
  const closed = layout({});
  try {
    await closed.view.flush();
    const menu = menuOf(closed.view.tree);
    assert.equal(menu.props.open, false);
    menu.props.onOpen();
    assert.deepEqual(closed.views, ['tools']);
  } finally { closed.view.close(); }
  const opened = layout({ view: 'tools' });
  try {
    await opened.view.flush();
    const menu = menuOf(opened.view.tree);
    assert.equal(menu.props.open, true);
    assert.equal(descendants(opened.view.tree, node => node.type?.name === 'FoxyDialog').length, 0, 'sin bandeja modal de herramientas');
    const inner = hookView(menu.type, menu.props);
    try {
      await inner.flush();
      const trigger = descendants(inner.tree, node => node.type === 'button' && node.props['aria-label'] === 'Herramientas')[0];
      assert.equal(trigger.props['aria-expanded'], true);
      const group = descendants(inner.tree, node => node.props?.role === 'group')[0];
      assert.equal(trigger.props['aria-controls'], group.props.id);
      assert.ok(env.listeners.some(([type]) => type === 'pointerdown'), 'escucha toques afuera para cerrar');
      // Choosing an enabled tool closes the menu; a disabled one does not.
      const target = { closest: () => ({ disabled: true }) };
      group.props.onClick({ target });
      assert.deepEqual(opened.views, []);
      group.props.onClick({ target: { closest: () => ({ disabled: false }) } });
      assert.deepEqual(opened.views, ['chat']);
      // Escape closes too.
      let prevented = false;
      group.props.onKeyDown({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() {} });
      assert.equal(prevented, true);
      assert.deepEqual(opened.views, ['chat', 'chat']);
    } finally { inner.close(); }
  } finally { opened.view.close(); env.restore(); }
});

test('el riel se pliega a la tira y el pliegue se recuerda en el dispositivo', async () => {
  const env = browser({ 'foxmind:study-rail': 'folded' });
  const rail = React.createElement('div', { id: 'rail' }, 'Temas');
  const mini = React.createElement('div', { id: 'mini' }, 'Tira');
  const { view } = layout({ aside: rail, asideMini: mini, asideFoldKey: 'foxmind:study-rail', asideLabel: 'Tu carpeta' });
  try {
    await view.flush();
    const folded = descendants(view.tree, node => node.type === 'aside')[0];
    assert.equal(folded.props['aria-label'], 'Tu carpeta (plegado)');
    assert.ok(descendants(folded, node => node.props?.id === 'mini').length, 'muestra la tira');
    assert.equal(descendants(folded, node => node.props?.id === 'rail').length, 0);
    descendants(folded, node => node.type === 'button' && node.props['data-rail-fold'] === 'open')[0].props.onClick();
    await view.flush();
    assert.equal(env.storage['foxmind:study-rail'], undefined, 'desplegar olvida el pliegue');
    const open = descendants(view.tree, node => node.type === 'aside')[0];
    assert.ok(descendants(open, node => node.props?.id === 'rail').length);
    const fold = descendants(open, node => node.type === 'button' && node.props['data-rail-fold'] === 'close')[0];
    assert.equal(fold.props['aria-expanded'], true);
    fold.props.onClick();
    await view.flush();
    assert.equal(env.storage['foxmind:study-rail'], 'folded');
  } finally { view.close(); env.restore(); }
});

test('sin tira no hay botón de pliegue: Foxy conserva su mesa sin riel plegable', async () => {
  const env = browser();
  const { view } = layout({ aside: React.createElement('div', null, 'Riel') });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type === 'button' && node.props['data-rail-fold']).length, 0);
  } finally { view.close(); env.restore(); }
});
