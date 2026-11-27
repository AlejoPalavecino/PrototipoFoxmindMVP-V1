import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

for (const viewName of ['settings','recover-password']) {
  test(`Brújula ${viewName}: reject mismatching confirmation before mutation; omit confirmation from matching request`, async () => {
    const previous = { window: globalThis.window, sessionStorage: globalThis.sessionStorage, FormData: globalThis.FormData };
    globalThis.window = Object.assign(new EventTarget(), { __foxmindTakeToken: () => 'proof-from-email' });
    globalThis.sessionStorage = { getItem: () => null };
    globalThis.FormData = class { constructor(form) { return Object.entries(form.fields); } };
    const calls=[], user={id:'user',firstName:'Synthetic',lastName:'User',email:'synthetic@example.test',emailVerified:true,accountRole:'teacher'};
    const account=loadTsModule('apps/web/src/features/identity/index.ts'), navigation=({...loadTsModule('apps/web/src/application/clients/classroom-client.ts'),classroomDestination:loadTsModule('apps/web/src/application/navigation/destinations.ts').safeDestination,classroomAuthHref:loadTsModule('apps/web/src/application/navigation/destinations.ts').authHref,classroomHomeHref:loadTsModule('apps/web/src/application/navigation/destinations.ts').classroomHomeHref,classroomHomeDestination:loadTsModule('apps/web/src/application/navigation/destinations.ts').classroomHomeDestination});
    const noop=()=>null, placeholder=new Proxy({default:noop},{get:(target,key)=>key==='__esModule'?true:target[key]??noop});
    const ports={'next/head':placeholder,'next/link':placeholder,'next/router':{useRouter:()=>({isReady:true,query:{},push:async()=>{}})},
      '../features/identity/index':{...account,createAccountClient:()=>({session:async()=>({authenticated:true,user}),mutate:async(path,fields)=>{calls.push({path,fields});return {result:user};}})},'../application/academic-classroom-client.ts':navigation};
    for(const name of ['./ui/button','./ui/input','./ui/label','../application/navigation/account-navbar','../../../shared-ui','../../../shared-ui/index','../../../shared-ui/FoxmindIllustration'])ports[name]=placeholder;
    const {AccountScreen}=componentWithPorts('apps/web/src/screens/identity-screen.tsx',ports);
    const view=hookView(AccountScreen,{view:viewName});
    try {
      await view.flush();
      const child=descendants(view.tree,n=>n.type?.name===(viewName==='settings'?'AccountSettings':'AccountFlowForms'))[0];
      let formTree=child.type(child.props);
      if(viewName==='recover-password') {const recover=descendants(formTree,n=>n.type?.name==='Recover')[0];formTree=recover.type(recover.props);}
      const confirmation=descendants(formTree,n=>n.props.name==='confirmPassword')[0];
      assert.ok(confirmation,'form exposes a real confirmation field');
      assert.equal(confirmation.props.autoComplete,'new-password');
      const submit=child.props.submit(viewName==='settings'?'/account/password':'/auth/password-recovery/confirm','Changed');
      const fields={newPassword:'a valid long new password',confirmPassword:'different long password',...(viewName==='settings'?{currentPassword:'the current password'}:{})};
      const event={preventDefault(){},currentTarget:{fields,querySelectorAll:()=>[]}};
      submit(event);await view.flush();assert.equal(calls.length,0,'mismatch must not mutate');
      fields.confirmPassword=fields.newPassword;submit(event);await view.flush();assert.equal(calls.length,1);
      assert.equal(Object.hasOwn(calls[0].fields,'confirmPassword'),false,'confirmation is UI only');
      assert.equal(calls[0].fields.newPassword,fields.newPassword);
      if(viewName==='recover-password')assert.equal(calls[0].fields.token,'proof-from-email');
    } finally {view.close();Object.assign(globalThis,previous);}
  });
}
