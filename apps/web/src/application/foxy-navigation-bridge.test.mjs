import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsModule} from "../../../../tests/helpers/load-ts-module.mjs";
function fixture(){const calls=[],listeners=new Map(),entries=['/inicio','/foxy-ai'];let index=1,blocked=true;
 const window={location:{assign:href=>{entries.splice(index+1);entries.push(href);index++;calls.push(['assign',href]);},replace:href=>{entries[index]=href;calls.push(['replace',href]);}},
 addEventListener:(name,fn)=>{calls.push(['add',name]);listeners.set(name,fn);},removeEventListener:(name,fn)=>{calls.push(['remove',name]);if(listeners.get(name)===fn)listeners.delete(name);}};
 const options={window,shouldBlock:()=>blocked,hidePresentation:()=>calls.push(['hide']),onError:()=>calls.push(['error'])};return {options,calls,listeners,entries,setBlocked:v=>blocked=v,index:()=>index};}
function create(f){const api=loadTsModule("apps/web/src/application/foxy-navigation-bridge.ts");assert.equal(typeof api.createFoxyNavigationBridge,'function');return api.createFoxyNavigationBridge(f.options);}
test('document entry capture is first-write-only and scoped to document',()=>{const {captureDocumentEntry,getDocumentEntryPath,isFoxyDocument}=loadTsModule("apps/web/src/application/foxy-document-boundary.ts");const first={},second={},unknown={};
 captureDocumentEntry(first,'/inicio');captureDocumentEntry(first,'/foxy-ai');captureDocumentEntry(second,'/foxy-ai/');assert.equal(getDocumentEntryPath(first),'/inicio');assert.equal(isFoxyDocument(first),false);
 assert.equal(getDocumentEntryPath(second),'/foxy-ai/');assert.equal(isFoxyDocument(second),true);assert.equal(getDocumentEntryPath(unknown),null);assert.equal(isFoxyDocument(unknown),false);
});
test('bridge construction has no effects; install and dispose are idempotent',()=>{const f=fixture(),bridge=create(f);assert.deepEqual(f.calls,[]);bridge.install();bridge.install();
 assert.deepEqual(f.calls.filter(x=>x[0]==='add').map(x=>x[1]).sort(),['beforeunload','pagehide','pageshow']);bridge.dispose();bridge.dispose();assert.equal(f.listeners.size,0);assert.equal(f.calls.filter(x=>x[0]==='remove').length,3);});
test('beforeunload reads live guard and uses native preventDefault only when blocked',()=>{const f=fixture(),bridge=create(f);bridge.install();const event={prevented:false,returnValue:undefined,preventDefault(){this.prevented=true;}};
 f.listeners.get('beforeunload')(event);assert.equal(event.prevented,true);assert.equal(event.returnValue,'');f.setBlocked(false);const clean={prevented:false,preventDefault(){this.prevented=true;}};f.listeners.get('beforeunload')(clean);assert.equal(clean.prevented,false);assert.equal(clean.returnValue,undefined);bridge.dispose();});
test('native assign and replace preserve previous synthetic history entry; unsafe hrefs never navigate',()=>{const f=fixture(),bridge=create(f);bridge.install();for(const href of ['https://evil.test','//evil.test','/\\evil','javascript:alert(1)','/mis-aulas\n']){bridge.navigate(href);bridge.replace(href);}
 assert.equal(f.calls.some(x=>x[0]==='assign'||x[0]==='replace'),false);bridge.navigate('/mis-aulas?aula=123');assert.deepEqual(f.entries,['/inicio','/foxy-ai','/mis-aulas?aula=123']);bridge.replace('/sign-in');assert.deepEqual(f.entries,['/inicio','/foxy-ai','/sign-in']);bridge.dispose();});
test('pagehide hides synchronously; persisted pageshow replaces once and disposed callbacks do nothing',()=>{const f=fixture(),bridge=create(f);bridge.install();const hide=f.listeners.get('pagehide'),show=f.listeners.get('pageshow');show({persisted:false});assert.equal(f.calls.some(x=>x[0]==='replace'),false);
 hide({persisted:true});assert.equal(f.calls.at(-1)[0],'hide');show({persisted:true});show({persisted:true});assert.deepEqual(f.calls.filter(x=>x[0]==='replace'),[['replace','/foxy-ai']]);
 bridge.dispose();const count=f.calls.length;hide({persisted:true});show({persisted:true});bridge.navigate('/inicio');assert.equal(f.calls.length,count);});
test('navigation exceptions expose only a generic error and leave private presentation hidden',()=>{const f=fixture();f.options.window.location.replace=()=>{throw Error('synthetic private location');};const bridge=create(f);bridge.install();f.listeners.get('pagehide')({});f.listeners.get('pageshow')({persisted:true});assert.ok(f.calls.some(x=>x[0]==='hide'));assert.ok(f.calls.some(x=>x[0]==='error'));bridge.dispose();});
