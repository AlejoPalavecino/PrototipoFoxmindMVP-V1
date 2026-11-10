import test from 'node:test';
import assert from 'node:assert/strict';
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

test('legacy global adapters forward named implementations without duplication', () => {
  for(const [file,target,name] of [
    ['apps/web/src/components/account-navbar.tsx','../application/navigation/account-navbar.tsx','AccountNavbar'],
    ['apps/web/src/lib/account-proxy.ts','../application/server/identity-proxy.ts','proxyAccountRequest'],
    ['apps/web/src/lib/page-server.ts','../application/server/account-page.ts','accountPageProps'],
    ['apps/web/src/lib/token-capture.ts','../application/server/token-capture.ts','tokenCaptureScript'],
    ['apps/web/src/lib/utils.ts','../../../shared-ui/class-names.ts','cn'],
  ]) {
    const implementation=()=>{};const result=loadTsModule(file,{stubs:{[target]:{[name]:implementation}}});
    assert.equal(result[name],implementation);assert.deepEqual(Object.keys(result),[name]);
  }
});
