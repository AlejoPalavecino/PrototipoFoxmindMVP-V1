import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from '../../../../tests/helpers/load-ts-module.mjs';
const rid=randomUUID(),room=randomUUID(),a=randomUUID(),b=randomUUID();
const item=(id,state='PREPARING',revision='1')=>({id,resourceId:rid,resourceRevision:'7',classroomId:room,title:'Guía',unitId:null,topicId:null,state,revision});
const inspection=(p)=>({publication:p,classroomRevision:'4',classroomArchived:false,errorCode:null});
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function fixture(){let editor={resource:{id:rid,revision:'7'},dirty:false,busy:false,pending:null,conflict:null},preparation={result:null};const calls=[],pages=[],inspections=[],timers=[];
 const client={listPublications:async(...args)=>{calls.push(['list',...args]);const value=pages.shift();if(value instanceof Error)throw value;return value??{items:[],nextAfterId:null};},
 inspectPublication:async(...args)=>{calls.push(['inspect',...args]);const value=inspections.shift();if(value instanceof Error)throw value;return value??inspection(item(args[0]));}};
 const options={client,resource:{getState:()=>editor},preparation:{getState:()=>preparation},onChange:()=>{},setTimeout:(fn,ms)=>{const t={ms,cleared:false,fn:()=>{t.cleared=true;return fn();}};timers.push(t);return t;},clearTimeout:t=>{t.cleared=true;}};
 return {options,client,calls,pages,inspections,timers,setEditor:v=>editor=v,setPreparation:v=>preparation=v};}
function create(f){const api=loadTsModule('apps/web/src/lib/foxy-publication-history-controller.ts');assert.equal(typeof api.createFoxyPublicationHistoryController,'function');return api.createFoxyPublicationHistoryController(f.options);}
const failure=code=>Object.assign(Error(code),{code,status:code==='AUTH_REQUIRED'?401:503});
test('syncResource is read-only, pages follow cursor even when short, refresh replaces',async()=>{const f=fixture(),c=create(f);c.syncResource();assert.equal(f.calls.length,0);f.pages.push({items:[item(a)],nextAfterId:a},{items:[item(b)],nextAfterId:null});
 await c.loadMore();assert.equal(c.getState().nextAfterId,a);await c.loadMore();assert.deepEqual(c.getState().items.map(p=>p.id),[a,b]);assert.deepEqual(f.calls.filter(x=>x[0]==='list').map(x=>x[2]),[{limit:20,afterId:null},{limit:20,afterId:a}]);
 f.pages.push({items:[item(b)],nextAfterId:null});await c.refreshList();assert.deepEqual(c.getState().items.map(p=>p.id),[b]);c.dispose();});
test('selected PREPARING polls serially after completion and stops at READY',async()=>{const f=fixture(),c=create(f),gate=deferred();c.syncResource();f.inspections.push(inspection(item(a)));await c.select(a);assert.equal(f.timers.length,1);assert.equal(f.timers[0].ms,2000);
 f.client.inspectPublication=async(...args)=>{f.calls.push(['inspect',...args]);return gate.promise;};const running=f.timers[0].fn();await Promise.resolve();assert.equal(f.timers.length,1);gate.resolve(inspection(item(a,'READY','2')));await running;
 assert.equal(c.getState().inspection.publication.state,'READY');assert.equal(f.timers.filter(t=>!t.cleared).length,0);c.dispose();});
test('new selection aborts and ignores older pending inspection',async()=>{const f=fixture(),c=create(f),gate=deferred();c.syncResource();f.client.inspectPublication=async(id)=>id===a?gate.promise:inspection(item(b,'READY','2'));
 const old=c.select(a);await Promise.resolve();await c.select(b);gate.resolve(inspection(item(a,'READY','9')));await old;assert.equal(c.getState().selectedId,b);assert.equal(c.getState().inspection.publication.id,b);c.dispose();});
test('older revision in stale list cannot replace newer selected state and UUID comparisons ignore case',async()=>{const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'READY','1000000000000000001')));await c.select(a.toUpperCase());
 f.pages.push({items:[item(a,'PREPARING','999999999999999999')],nextAfterId:null});await c.refreshList();assert.equal(c.getState().inspection.publication.state,'READY');assert.equal(c.getState().inspection.publication.revision,'1000000000000000001');c.dispose();});
test('resource revision mismatch stops polling, and failed poll requires explicit refresh',async()=>{const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a)));await c.select(a);f.setEditor({resource:{id:rid,revision:'8'}});c.syncResource();assert.equal(c.getState().staleResource,true);assert.ok(f.timers.every(t=>t.cleared));
 f.setEditor({resource:{id:rid,revision:'7'}});c.syncResource();f.inspections.push(failure('SERVICE_UNAVAILABLE'));await c.refreshSelected();assert.ok(c.getState().inspectionError);const count=f.calls.length;assert.ok(f.timers.every(t=>t.cleared));await Promise.resolve();assert.equal(f.calls.length,count);c.dispose();});
test('syncPreparation selects actual returned result once, refreshes list without inventing item',async()=>{const f=fixture(),c=create(f);c.syncResource();f.setPreparation({result:item(a)});f.pages.push({items:[],nextAfterId:null});f.inspections.push(inspection(item(a)));await c.syncPreparation();
 assert.equal(c.getState().selectedId,a);assert.deepEqual(c.getState().items,[]);const count=f.calls.length;await c.syncPreparation();assert.equal(f.calls.length,count);c.dispose();});
test('identity loss clears history and dispose suppresses delayed results',async()=>{const f=fixture(),c=create(f);c.syncResource();f.pages.push({items:[item(a)],nextAfterId:null});await c.loadMore();f.inspections.push(failure('AUTH_REQUIRED'));await c.select(a);
 assert.equal(c.getState().resourceId,null);assert.deepEqual(c.getState().items,[]);assert.equal(c.getState().inspection,null);const count=f.calls.length;c.dispose();await c.loadMore();await c.refreshSelected();assert.equal(f.calls.length,count);});

test('equal publication revision refreshes independent classroom archive and revision metadata',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.inspections.push({...inspection(item(a,'READY','1000000000000000000')),classroomRevision:'4',classroomArchived:false});await c.select(a);
 f.inspections.push({...inspection(item(a,'READY','1000000000000000000')),classroomRevision:'5',classroomArchived:true});await c.refreshSelected();
 assert.equal(c.getState().inspection.classroomRevision,'5');assert.equal(c.getState().inspection.classroomArchived,true);c.dispose();
});

test('older inspection than list does not revive PREPARING or restart polling',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.pages.push({items:[item(a,'READY','1000000000000000001')],nextAfterId:null});await c.loadMore();
 f.inspections.push(inspection(item(a,'PREPARING','1000000000000000000')));await c.select(a);
 assert.notEqual(c.getState().inspection?.publication.state,'PREPARING');assert.ok(f.timers.every(t=>t.cleared));c.dispose();
});

test('preparation received during list request triggers a fresh list after it settles',async()=>{
 const f=fixture(),c=create(f),gate=deferred();c.syncResource();let count=0;
 f.client.listPublications=async(...args)=>{f.calls.push(['list',...args]);return ++count===1?gate.promise:{items:[item(a)],nextAfterId:null};};
 const first=c.loadMore();await Promise.resolve();f.setPreparation({result:item(a)});f.inspections.push(inspection(item(a)));const syncing=c.syncPreparation();
 gate.resolve({items:[],nextAfterId:null});await Promise.all([first,syncing]);assert.equal(count,2);assert.deepEqual(c.getState().items.map(p=>p.id),[a]);c.dispose();
});

test('classroom revision high-water survives switching publications and classrooms',async()=>{
 const f=fixture(),c=create(f),roomB=randomUUID(),cId=randomUUID();c.syncResource();
 f.inspections.push({...inspection(item(a,'READY','1')),classroomRevision:'100'});await c.select(a);
 f.inspections.push({...inspection({...item(b,'READY','1'),classroomId:roomB}),classroomRevision:'1'});await c.select(b);
 f.inspections.push({...inspection(item(cId,'READY','1')),classroomRevision:'99'});await c.select(cId);
 const view=c.getState().inspection;if(view)assert.ok(BigInt(view.classroomRevision)>=100n);else assert.ok(c.getState().inspectionError);c.dispose();
});

test('published terminal state cannot revert to READY despite a larger revision',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'PUBLISHED','5')));await c.select(a);
 f.inspections.push(inspection(item(a,'READY','6')));await c.refreshSelected();assert.notEqual(c.getState().inspection?.publication.state,'READY');c.dispose();
});

test('newer inspection updates an existing list row without creating absent rows',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.pages.push({items:[item(a,'PREPARING','1')],nextAfterId:null});await c.loadMore();
 f.inspections.push(inspection(item(a,'READY','2')));await c.select(a);
 assert.equal(c.getState().items.length,1);assert.equal(c.getState().items[0].state,'READY');assert.equal(c.getState().items[0].revision,'2');
 f.inspections.push(inspection(item(b,'READY','3')));await c.select(b);assert.deepEqual(c.getState().items.map(p=>p.id),[a]);c.dispose();
});

test('late list cannot show stale or terminal-regressing rows for previously inspected publications',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'READY','10')));await c.select(a);assert.deepEqual(c.getState().items,[]);
 f.pages.push({items:[item(a,'PREPARING','9')],nextAfterId:null});await c.refreshList();assert.equal(c.getState().items[0].state,'READY');assert.equal(c.getState().items[0].revision,'10');
 f.inspections.push(inspection(item(a,'PUBLISHED','11')));await c.refreshSelected();f.pages.push({items:[item(a,'READY','12')],nextAfterId:null});await c.refreshList();
 assert.notEqual(c.getState().items[0]?.state,'READY');c.dispose();
});

test('foreign resource rows do not poison known publication revision or visible items',async()=>{
 const f=fixture(),c=create(f);c.syncResource();const foreign={...item(a,'PUBLISHED','999'),resourceId:randomUUID()};
 f.pages.push({items:[foreign],nextAfterId:null});await c.refreshList();assert.deepEqual(c.getState().items,[]);
 f.inspections.push(inspection(item(a,'READY','2')));await c.select(a);assert.equal(c.getState().inspection?.publication.state,'READY');c.dispose();
});

test('list projects previously inspected high-water after selecting a different publication',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'READY','10')));await c.select(a);assert.deepEqual(c.getState().items,[]);
 f.inspections.push(inspection(item(b,'READY','1')));await c.select(b);f.pages.push({items:[item(a,'PREPARING','9')],nextAfterId:null});await c.refreshList();
 const row=c.getState().items.find(p=>p.id===a);assert.ok(row);assert.equal(row.state,'READY');assert.equal(row.revision,'10');c.dispose();
});

test('list retains published high-water row despite later invalid READY with greater revision',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'PUBLISHED','11')));await c.select(a);
 f.pages.push({items:[item(a,'READY','12')],nextAfterId:null});await c.refreshList();const row=c.getState().items.find(p=>p.id===a);
 assert.ok(row);assert.equal(row.state,'PUBLISHED');assert.equal(row.revision,'11');c.dispose();
});

test('discarded terminal publication never returns to READY or PREPARING in inspection',async()=>{
 for(const prior of ['READY','PREPARING']){const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'DISCARDED','5')));await c.select(a);
  f.inspections.push(inspection(item(a,prior,'6')));await c.refreshSelected();assert.notEqual(c.getState().inspection?.publication.state,prior,prior);
  assert.equal(f.timers.filter(t=>!t.cleared).length,0,prior);c.dispose();}
});

test('history page keeps known discarded row and cannot resurrect preview state',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'DISCARDED','11')));await c.select(a);
 f.pages.push({items:[item(a,'READY','12')],nextAfterId:null});await c.refreshList();const row=c.getState().items.find(p=>p.id===a);
 assert.ok(row);assert.equal(row.state,'DISCARDED');assert.equal(row.revision,'11');assert.notEqual(c.getState().inspection?.publication.state,'READY');c.dispose();
});

test('newer discarded list row invalidates an already-selected READY preview and confirmation',async()=>{
 const f=fixture(),c=create(f);c.syncResource();f.inspections.push(inspection(item(a,'READY','2')));await c.select(a);
 f.pages.push({items:[item(a,'DISCARDED','3')],nextAfterId:null});await c.refreshList();
 assert.equal(c.getState().items.find(p=>p.id===a)?.state,'DISCARDED');
 assert.notEqual(c.getState().inspection?.publication.state,'READY','a later discard must prevent presenting the old READY inspection');
 assert.equal(f.timers.filter(t=>!t.cleared).length,0);c.dispose();
});

test('text history refuses a VISUAL inspection and keeps it out of text rows',async()=>{
 const f=fixture(),c=create(f),visual={id:a,sourceKind:'VISUAL',assetId:randomUUID(),assetRevision:'2',classroomId:room,title:'Imagen',unitId:null,topicId:null,state:'READY',revision:'3'};
 c.syncResource();f.inspections.push(inspection(visual));await c.select(a);assert.equal(c.getState().inspection,null);assert.ok(c.getState().inspectionError);assert.ok(!c.getState().items.some(p=>p.id===a));c.dispose();
});
