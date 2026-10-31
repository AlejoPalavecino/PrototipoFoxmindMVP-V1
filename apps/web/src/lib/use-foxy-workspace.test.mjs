import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from '../../../../tests/helpers/load-ts-module.mjs';
function harness(initFactory=()=>Promise.resolve()){const slots=[],cleanups=new Map(),runtimes=[],notifications=[];let cursor=0,effects=[],dirty=true,tree,props={subjectId:randomUUID(),onIdentityRequired:c=>notifications.push(['old',c])};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={useState:init=>{const i=cursor++;slots[i]??={value:typeof init==='function'?init():init};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;dirty=true;}];},
 useRef:v=>{const i=cursor++;return slots[i]??={current:v};},useEffect:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]={deps};effects.push([i,fn]);}},useMemo:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},useCallback:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn};return slots[i].value;}};
 const createFoxyWorkspaceRuntime=options=>{const state={subjectId:options.subjectId,closed:false,private:`private-${options.subjectId}`},r={options,state,initCalls:0,disposeCalls:0,init(){this.initCalls++;return initFactory(options.subjectId);},getState(){return {...state};},dispose(){this.disposeCalls++;state.closed=true;},loadClassroom:async()=>null};runtimes.push(r);return r;};
 const api=loadTsModule('apps/web/src/lib/use-foxy-workspace.ts',{stubs:{react,'./foxy-workspace-runtime':{createFoxyWorkspaceRuntime},'./foxy-client':{createWebFoxyClient:()=>({})},'./classroom-client':{createWebClassroomClient:()=>({})}}});
 const render=()=>{cursor=0;dirty=false;tree=api.useFoxyWorkspace(props);const pending=effects;effects=[];for(const [i,fn] of pending){cleanups.get(i)?.();cleanups.set(i,fn());}};
 return {runtimes,notifications,get tree(){return tree;},get props(){return props;},setProps:p=>{props={...props,...p};dirty=true;},render,async flush(){for(let i=0;i<8;i++){if(dirty)render();await Promise.resolve();}},close(){for(const fn of cleanups.values())fn?.();}};
}
test('hook creates one runtime for a subject and callback changes do not recreate it',async()=>{const h=harness();await h.flush();assert.equal(h.runtimes.length,1);assert.equal(h.runtimes[0].initCalls,1);const callback=code=>h.notifications.push(['new',code]);h.setProps({onIdentityRequired:callback});await h.flush();assert.equal(h.runtimes.length,1);h.runtimes[0].options.onIdentityRequired('AUTH_REQUIRED');assert.deepEqual(h.notifications,[['new','AUTH_REQUIRED']]);h.close();});
test('subject A to B immediately fences old snapshot and ignores old notifications',async()=>{const h=harness();await h.flush();const old=h.runtimes[0],subjectB=randomUUID();h.setProps({subjectId:subjectB});h.render();assert.equal(h.tree.state,null);assert.equal(h.tree.runtime,null);await h.flush();assert.equal(old.disposeCalls,1);assert.equal(h.runtimes.length,2);assert.equal(h.tree.state.subjectId,subjectB);
 old.options.onChange({...old.state,closed:false});old.options.onIdentityRequired('AUTH_REQUIRED');await h.flush();assert.equal(h.tree.state.subjectId,subjectB);assert.deepEqual(h.notifications,[]);h.close();});
test('cleanup marks runtime inactive before disposal and late callback is ignored',async()=>{const h=harness();await h.flush();const r=h.runtimes[0];r.dispose=function(){this.disposeCalls++;this.options.onChange({...this.state,closed:false});this.options.onIdentityRequired('AUTH_REQUIRED');this.state.closed=true;};h.close();await h.flush();assert.deepEqual(h.notifications,[]);assert.equal(r.disposeCalls,1);});


test('initializing stays true until runtime init settles, not merely until first snapshot',async()=>{
 let release;const gate=new Promise(r=>release=r),h=harness(()=>gate);await h.flush();assert.ok(h.tree.state);assert.equal(h.tree.initializing,true);
 release();await h.flush();assert.equal(h.tree.initializing,false);h.close();
});

test('old subject initialization cannot finish the new subject loading state',async()=>{
 const gates=new Map(),h=harness(id=>new Promise(r=>gates.set(id,r)));await h.flush();const old=h.props.subjectId,next=randomUUID();h.setProps({subjectId:next});await h.flush();assert.equal(h.tree.initializing,true);
 gates.get(old)();await h.flush();assert.equal(h.tree.state.subjectId,next);assert.equal(h.tree.initializing,true);gates.get(next)();await h.flush();assert.equal(h.tree.initializing,false);h.close();
});
