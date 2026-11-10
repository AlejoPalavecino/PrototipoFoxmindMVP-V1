import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('application shell preserves theme and owns route-heading focus with cleanup', () => {
  const listeners=new Map(); let cleanup;
  const heading={tabIndex:undefined,focus(options){assert.deepEqual(options,{preventScroll:true});this.focused=true;}};
  const previous={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame};
  globalThis.document={querySelector:selector=>{assert.equal(selector,'main h1');return heading;}};
  globalThis.requestAnimationFrame=callback=>callback();
  try {
    const events={on(name,handler){listeners.set(name,handler);},off(name,handler){assert.equal(listeners.get(name),handler);listeners.delete(name);}};
    const {ApplicationShell}=loadTsModule('apps/web/src/application/application-shell.tsx',{stubs:{
      react:{useEffect(callback){cleanup=callback();}},'next/router':{useRouter:()=>({events})},
    }});
    const child={synthetic:true};const tree=ApplicationShell({children:child});
    assert.equal(tree.props.className,'fm3d-theme');assert.equal(tree.props.children,child);
    listeners.get('routeChangeComplete')();assert.equal(heading.tabIndex,-1);assert.equal(heading.focused,true);
    cleanup();assert.equal(listeners.size,0);
  } finally {Object.assign(globalThis,previous);}
});


test('application adapters expose their owning contracts and retired paths stay absent', () => {
  for(const [file,legacy,name,type] of [
    ['apps/web/src/application/navigation/account-navbar.tsx','components/account-navbar.tsx','AccountNavbar','function'],
    ['apps/web/src/application/server/identity-proxy.ts','lib/account-proxy.ts','proxyAccountRequest','function'],
    ['apps/web/src/application/server/account-page.ts','lib/page-server.ts','accountPageProps','function'],
    ['apps/web/src/application/server/token-capture.ts','lib/token-capture.ts','tokenCaptureScript','string'],
    ['apps/shared-ui/class-names.ts','lib/utils.ts','cn','function'],
  ]) {
    const result=loadTsModule(file);
    assert.equal(typeof result[name],type);assert.deepEqual(Object.keys(result),[name]);
    assert.equal(existsSync(`apps/web/src/${legacy}`),false,legacy);
  }
});
