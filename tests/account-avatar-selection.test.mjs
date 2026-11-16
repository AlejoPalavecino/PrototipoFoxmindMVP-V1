import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const { AccountProfile } = componentWithPorts('apps/web/src/features/identity/ui/account-profile.tsx', {});
const profile = { id:'avatar-test', firstName:'Cuenta', lastName:'Sintética', email:'avatar@example.test', accountRole:'student', avatarKey:'initials' };

const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const button = (view, label) => descendants(view.tree, node => (node.type === 'button' || node.type?.name === 'Button') && text(node) === label)[0];
const field = view => descendants(view.tree, node => node.type === 'input' && node.props.name === 'avatarKey')[0];
const radios = view => descendants(view.tree, node => node.type === 'input' && node.props.name === 'profile-preview-avatar');

test('avatar picker previews independently and only applies the choice to the profile form on confirm', async () => {
  const submissions = [];
  const view = hookView(AccountProfile, { profile, firstName: profile.firstName, lastName: profile.lastName,
    locked: false, busy: false, onFirstName() {}, onLastName() {}, submit: (...config) => () => submissions.push(config) });
  try {
    await view.flush();
    assert.equal(radios(view).length, 0);
    button(view, 'Cambiar avatar').props.onClick(); await view.flush();
    assert.equal(radios(view).length, 5);
    assert.equal(radios(view).find(node => node.props.checked).props.value, 'initials');
    radios(view).find(node => node.props.value === 'foxy-reader').props.onChange(); await view.flush();
    assert.equal(radios(view).find(node => node.props.checked).props.value, 'foxy-reader');
    assert.equal(field(view).props.value, 'initials');
    button(view, 'Usar este avatar').props.onClick(); await view.flush();
    assert.equal(field(view).props.value, 'foxy-reader');
    assert.match(text(view.tree), /Tenés cambios sin guardar/);
    assert.equal(submissions.length, 0);
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    assert.deepEqual(submissions, [['/account', 'Guardaste los cambios de tu perfil.', 'PATCH']]);
    button(view, 'Cambiar avatar').props.onClick(); await view.flush();
    radios(view).find(node => node.props.value === 'initials').props.onChange(); await view.flush();
    button(view, 'Usar este avatar').props.onClick(); await view.flush();
    assert.equal(field(view).props.value, 'initials');
    assert.equal(button(view, 'Guardar cambios').props.disabled, true);
    assert.equal(submissions.length, 1);
  } finally { view.close(); }
});

test('loading and saving locks all profile edits including avatar selection', async () => {
  const view=hookView(AccountProfile,{profile,firstName:'Cuenta',lastName:'Sintética',locked:true,busy:true,onFirstName(){},onLastName(){},submit:()=>()=>{}});
  try { await view.flush(); assert.ok(descendants(view.tree,node=>node.type==='fieldset'&&node.props.disabled).length); }
  finally { view.close(); }
});
