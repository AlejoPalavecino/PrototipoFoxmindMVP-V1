import test from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const { AccountProfile } = loadTsModule('apps/web/src/features/identity/ui/account-profile.tsx');
const profile = { id: 'user', firstName: 'Cuenta', lastName: 'Sintética', email: 'test@example.test', accountRole: 'teacher', avatarKey: 'initials' };
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const button = (view, label) => descendants(view.tree, node => (node.type === 'button' || node.type?.name === 'Button') && text(node) === label)[0];

test('E10 previsualiza nombre y avatar, y descarta cambios sin pedir PATCH', async () => {
  let onFirstName;
  const requests = [];
  const view = hookView(() => {
    const [firstName, setFirstName] = useState(profile.firstName), [lastName, setLastName] = useState(profile.lastName);
    onFirstName = setFirstName;
    return AccountProfile({ profile, firstName, lastName, locked: false, busy: false,
      onFirstName: setFirstName, onLastName: setLastName, submit: (...config) => () => requests.push(config) });
  }, {});
  const avatarField = () => descendants(view.tree, node => node.type === 'input' && node.props.name === 'avatarKey')[0];
  try {
    await view.flush();
    assert.equal(button(view, 'Descartar cambios').props.disabled, true);
    onFirstName('Muestra');
    await view.flush();
    assert.match(text(view.tree), /Muestra Sintética/);
    button(view, 'Cambiar avatar').props.onClick(); await view.flush();
    const reader = descendants(view.tree, node => node.type === 'input' && node.props.type === 'radio' && node.props.value === 'foxy-reader')[0];
    reader.props.onChange(); await view.flush();
    assert.equal(avatarField().props.value, 'initials');
    button(view, 'Cancelar').props.onClick(); await view.flush();
    assert.equal(avatarField().props.value, 'initials');
    button(view, 'Cambiar avatar').props.onClick(); await view.flush();
    descendants(view.tree, node => node.type === 'input' && node.props.value === 'foxy-reader')[0].props.onChange(); await view.flush();
    button(view, 'Usar este avatar').props.onClick(); await view.flush();
    assert.equal(avatarField().props.value, 'foxy-reader');
    assert.deepEqual(requests, []);
    button(view, 'Descartar cambios').props.onClick(); await view.flush();
    assert.equal(avatarField().props.value, 'initials');
    assert.match(text(view.tree), /Cuenta Sintética/);
    assert.deepEqual(requests, []);
  } finally { view.close(); }
});
