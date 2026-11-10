import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const { AccountProfile } = componentWithPorts('apps/web/src/features/identity/ui/account-profile.tsx', {});
const profile = { id:'avatar-test', firstName:'Cuenta', lastName:'Sintética', email:'avatar@example.test', accountRole:'student', avatarKey:'initials' };

test('avatar selection previews without submitting and returns to initials using native radio inputs', async () => {
  let submits=0;
  const view=hookView(AccountProfile,{profile,firstName:profile.firstName,lastName:profile.lastName,locked:false,busy:false,onFirstName(){},onLastName(){},submit:()=>()=>{submits++;}});
  try {
    await view.flush();
    const radios=()=>descendants(view.tree,node=>node.type==='input'&&node.props.name==='avatarKey');
    assert.equal(radios().length,5);
    assert.equal(radios().filter(node=>node.props.checked)[0].props.value,'initials');
    radios().find(node=>node.props.value==='foxy-reader').props.onChange(); await view.flush();
    assert.equal(radios().filter(node=>node.props.checked)[0].props.value,'foxy-reader');
    assert.ok(descendants(view.tree,node=>node.props.role==='status')[0].props.children.includes(' · Sin guardar'));
    assert.equal(submits,0,'preview must not save');
    radios().find(node=>node.props.value==='initials').props.onChange(); await view.flush();
    assert.equal(radios().filter(node=>node.props.checked)[0].props.value,'initials');
    descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({});
    assert.equal(submits,1);
  } finally { view.close(); }
});

test('loading and saving locks all profile edits including avatar selection', async () => {
  const view=hookView(AccountProfile,{profile,firstName:'Cuenta',lastName:'Sintética',locked:true,busy:true,onFirstName(){},onLastName(){},submit:()=>()=>{}});
  try { await view.flush(); assert.ok(descendants(view.tree,node=>node.type==='fieldset'&&node.props.disabled).length); }
  finally { view.close(); }
});
