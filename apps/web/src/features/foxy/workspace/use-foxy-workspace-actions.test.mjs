import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsModule} from "../../../../../../tests/helpers/load-ts-module.mjs";
function harness(useRealActions=false){const slots=[],cleanups=new Map(),adapters=[],navigations=[];let cursor=0,effects=[],dirty=true,tree;const first={id:'first',getState:()=>({closed:false,subjectId:'a'})},second={id:'second',getState:()=>({closed:false,subjectId:'b'})};
 let props={runtime:first,state:{closed:false,subjectId:'a'},onNavigate:p=>navigations.push(['old',p])};const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={useState:init=>{const i=cursor++;slots[i]??={value:typeof init==='function'?init():init};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;dirty=true;}];},
 useRef:v=>{const i=cursor++;return slots[i]??={current:v};},useEffectEvent:fn=>{const slot=slots[cursor++]??={};slot.fn=fn;return slot.event??=(...args)=>slot.fn(...args);},useEffect:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]={deps};effects.push([i,fn]);}},
 useMemo:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},useCallback:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn};return slots[i].value;}};
 const createFoxyWorkspaceActions=options=>{const a={options,syncs:0,disposed:0,getState:()=>({leave:null,openingResource:false,loadingDestinationId:null,error:null}),sync(){this.syncs++;},dispose(){this.disposed++;},requestNavigate:href=>options.onNavigate(href)};adapters.push(a);return a;};
 const factory=useRealActions?loadTsModule("apps/web/src/features/foxy/workspace/foxy-workspace-actions.ts").createFoxyWorkspaceActions:createFoxyWorkspaceActions;
 const api=loadTsModule("apps/web/src/features/foxy/workspace/use-foxy-workspace-actions.ts",{stubs:{react,
"./foxy-workspace-actions":{createFoxyWorkspaceActions:factory}}});
 const render=(runEffects=true)=>{cursor=0;dirty=false;tree=api.useFoxyWorkspaceActions(props);if(runEffects){const pending=effects;effects=[];for(const [i,fn] of pending){cleanups.get(i)?.();cleanups.set(i,fn());}}};
 return {first,second,adapters,navigations,get tree(){return tree;},get props(){return props;},setProps:p=>{props={...props,...p};dirty=true;},render,async flush(){for(let i=0;i<8;i++){if(dirty)render();await Promise.resolve();}},close(){for(const fn of cleanups.values())fn?.();}};
}
test('hook retains one adapter per runtime and delegates navigation to latest callback',async()=>{const h=harness();await h.flush();assert.equal(h.adapters.length,1);const action=h.tree.actions;
 h.setProps({onNavigate:p=>h.navigations.push(['new',p])});await h.flush();assert.equal(h.adapters.length,1);await action.requestNavigate('/mis-aulas');assert.deepEqual(h.navigations,[['new','/mis-aulas']]);h.close();});
test('coherent snapshot updates sync adapter once; callback-only rerender does not sync',async()=>{const h=harness();await h.flush();const a=h.adapters[0],before=a.syncs;
 h.setProps({onNavigate:()=>{}});await h.flush();assert.equal(a.syncs,before);h.setProps({state:{...h.props.state,chat:{busy:false}}});await h.flush();assert.equal(a.syncs,before+1);h.close();});
test('runtime switch, null or closed immediately fences old actions and cleanup never disposes runtime',async()=>{const h=harness();await h.flush();const old=h.adapters[0];h.setProps({runtime:h.second,state:{closed:false,subjectId:'b'}});h.render();assert.equal(h.tree.actions,null);await h.flush();assert.equal(old.disposed,1);assert.notEqual(h.tree.actions,old);
 h.setProps({runtime:null,state:null});h.render();assert.equal(h.tree.actions,null);await h.flush();h.setProps({runtime:h.second,state:{closed:true,subjectId:'b'}});h.render();assert.equal(h.tree.actions,null);assert.equal(typeof h.first.dispose,'undefined');h.close();});
test('late observer callbacks after cleanup cannot expose old adapter state',async()=>{const h=harness();await h.flush();const old=h.adapters[0];h.setProps({runtime:h.second,state:{closed:false,subjectId:'b'}});await h.flush();
 old.options.onChange({leave:{reason:'unsaved',canSave:true},openingResource:false,loadingDestinationId:null,error:'old private'});await h.flush();assert.notEqual(h.tree.ui?.error,'old private');h.close();});


test('mismatched runtime subject never exposes actions even if prop snapshot looks open',async()=>{
 const h=harness();await h.flush();h.setProps({state:{closed:false,subjectId:'b'}});h.render();assert.equal(h.tree.actions,null);assert.equal(h.tree.ui,null);h.close();
});

test('runtime closure fences stale open prop and disposes adapter',async()=>{
 const h=harness();await h.flush();const old=h.adapters[0];h.first.getState=()=>({closed:true,subjectId:'a'});h.setProps({state:{closed:false,subjectId:'a'}});h.render();assert.equal(h.tree.actions,null);await h.flush();assert.equal(old.disposed,1);h.close();
});

test('late valid state binds an unchanged runtime after initial null snapshot',async()=>{
 const h=harness();h.setProps({state:null});await h.flush();assert.equal(h.tree.actions,null);h.setProps({state:{closed:false,subjectId:'a'}});await h.flush();assert.ok(h.tree.actions);assert.equal(h.adapters.length,1);h.close();
});

test('onChange UI snapshot cannot be mutated after delivery to hook',async()=>{
 const h=harness();await h.flush();const ui={leave:{reason:'unsaved',canSave:true},openingResource:false,loadingDestinationId:null,error:null};h.adapters[0].options.onChange(ui);await h.flush();
 try{ui.leave.reason='pending';ui.error='external';}catch{}assert.equal(h.tree.ui.leave.reason,'unsaved');assert.equal(h.tree.ui.error,null);h.close();
});

test('initial mismatched subject cannot create or expose an adapter',async()=>{
 const h=harness();h.setProps({state:{closed:false,subjectId:'b'}});await h.flush();assert.equal(h.tree.actions,null);assert.equal(h.tree.ui,null);h.close();
});

test('closed prop snapshot on unchanged runtime disposes its adapter',async()=>{
 const h=harness();await h.flush();const old=h.adapters[0];h.setProps({state:{closed:true,subjectId:'a'}});await h.flush();assert.equal(h.tree.actions,null);assert.equal(old.disposed,1);h.close();
});


test('old real facade returns false when runtime changes before effect cleanup',async()=>{
 const h=harness(true);await h.flush();const old=h.tree.actions;assert.ok(old);h.setProps({runtime:h.second,state:{closed:false,subjectId:'b'}});h.render(false);
 assert.equal(h.tree.actions,null);assert.equal(await old.requestNavigate('/mis-aulas'),false);assert.deepEqual(h.navigations,[]);h.close();
});
