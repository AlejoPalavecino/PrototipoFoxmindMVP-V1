import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants, deferred } from './agenda-ui-helpers.test.mjs';
import { createBrujulaSearchClient } from '../apps/shared-ui/brujula-search-client.ts';
import { brujulaSearchDestination, brujulaSearchHref } from '../src/core/domain/classrooms/brujula-search.ts';

const id='11111111-1111-4111-8111-111111111111';
const item=title=>({id,kind:'topic',title,classroomId:id,classroomName:'Biología',division:'A',target:{kind:'classroom',classroomId:id,section:'plan',topicId:id}});
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):text(node?.props?.children??'');
test('cliente valida payload y construye destino canónico exacto sin URL remota', async () => {
  const calls=[],controller=new AbortController();
  const client=createBrujulaSearchClient({call:async(...args)=>{calls.push(args);return {items:[item('Célula')],nextCursor:null};}});
  const page=await client('Biología',null,controller.signal);
  assert.equal(calls[0][0],'/search?q=Biolog%C3%ADa');assert.equal(calls[0][1],'GET');assert.equal(calls[0][3],controller.signal);
  assert.deepEqual(brujulaSearchDestination(brujulaSearchHref(page.items[0].target)),page.items[0].target);
  assert.equal(brujulaSearchDestination('https://external.test'),null);
});
test('cambio de consulta cancela la anterior e ignora respuesta tardía; selección abre tema exacto', async () => {
  const {SearchDialog}=loadTsModule('apps/shared-ui/NavigationSearch.tsx',{stubs:{"./dialog-focus":{openDialog:()=>()=>{}}}});
  const initial=deferred(),next=deferred(),calls=[],followed=[],closed=[];
  const search=(query,cursor,signal)=>{calls.push({query,cursor,signal});return query?next.promise:initial.promise;};
  const view=hookView(SearchDialog,{links:[],search,follow:(_event,href)=>followed.push(href),onClose:()=>closed.push(true)});
  try{
    await view.flush();await pause(10);await view.flush();assert.equal(calls.length,1);
    descendants(view.tree,node=>node.type==='input')[0].props.onChange({target:{value:'célula'}});await view.flush();
    assert.equal(calls[0].signal.aborted,true);
    initial.resolve({items:[item('Respuesta vieja')],nextCursor:null});await view.flush();assert.doesNotMatch(text(view.tree),/Respuesta vieja/);
    await pause(190);await view.flush();assert.equal(calls.length,2);
    next.resolve({items:[item('Célula autorizada')],nextCursor:null});await view.flush();
    const link=descendants(view.tree,node=>node.type==='a'&&text(node).includes('Célula autorizada'))[0];
    assert.ok(link);link.props.onClick({});assert.deepEqual(followed,[brujulaSearchHref(item('').target)]);assert.equal(closed.length,1);
  }finally{view.close();}
  assert.equal(calls[1].signal.aborted,true);
});
