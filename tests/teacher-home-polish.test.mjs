import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants, deferred } from './agenda-ui-helpers.test.mjs';

const page = items => ({status:'ready',items,totalItems:items.length,nextCursor:null});
const room = id => ({id,title:id,classroom:{id,name:id,division:'A',role:'teacher',archived:false,coverKey:'books'},target:{kind:'classroom',classroomId:id,section:'plan'}});
const data = {subjectId:'owner',timeZone:'UTC',generatedAt:'2026-11-11T12:00:00Z',modules:{classrooms:page([room('first'),room('second')]),review:page([]),queries:page([])}};
const text = node => typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):text(node?.props?.children??'');
const button = (view,label) => descendants(view.tree,node=>node.type==='button'&&text(node).trim()===label)[0];

test('Each teacher action asks for an explicit destination and does not change focus',async()=>{
  const {HomeTeacherTools}=loadTsModule('apps/web/src/features/home/ui/HomeShortcuts.tsx');
  const calls=[];
  const view=hookView(props=>{const tree=HomeTeacherTools(props);return tree.type?.name==='ClassroomActions'?tree.type(tree.props):tree;},{data,onAction:value=>calls.push(value),onSelected:()=>assert.fail('focus changed'),onClassrooms(){}});
  try {
    await view.flush();
    for(const [label,kind] of [['Crear actividad','create-activity'],['Agregar material','upload-material'],['Publicar aviso','publish-notice'],['Ver progreso','classroom']]){
      button(view,label).props.onClick();await view.flush();
      assert.equal(calls.length,0);
      const picker=descendants(view.tree,node=>node.type?.name==='HomeRoomPicker')[0];
      assert.ok(picker,label);
      picker.props.onSelect(room('second'));await view.flush();
      assert.deepEqual(calls.pop(),{kind,classroomId:'second',...(kind==='classroom'?{section:'progress'}:{})});
    }
  }finally{view.close();}
});

test('Room picker loads more authorized classrooms, retries, and requires a selection',async()=>{
  const {HomeRoomPicker}=loadTsModule('apps/web/src/features/home/ui/HomeRoomPicker.tsx');
  const calls=[];let fail=true;
  const view=hookView(HomeRoomPicker,{data:{...data,modules:{...data.modules,classrooms:{...page([room('first'),room('second')]),nextCursor:'next'}}},title:'Elegí un aula',onClose(){},onSelect:value=>calls.push(value),onUnauthorized(){},
    client:{page:async query=>{assert.equal(query.cursor,'next');if(fail)throw Error();return {subjectId:'owner',module:'classrooms',page:page([room('third'),{...room('archived'),classroom:{...room('archived').classroom,archived:true}}])};}}});
  try{
    await view.flush();assert.equal(button(view,'Continuar').props.disabled,true);
    button(view,'Cargar más aulas').props.onClick();await view.flush();
    assert.match(text(view.tree),/No pudimos/);fail=false;
    button(view,'Reintentar').props.onClick();await view.flush();
    const options=descendants(view.tree,node=>node.type==='input'&&node.props.type==='radio');
    assert.equal(options.length,3);
    options[2].props.onChange();await view.flush();
    button(view,'Continuar').props.onClick();assert.equal(calls[0].id,'third');
  }finally{view.close();}
});

test('Order changes start at page one, keep independent orders and reject stale responses',async()=>{
  const {useHome}=loadTsModule('apps/web/src/features/home/model/use-home.ts');
  const previous=globalThis.window;globalThis.window=new EventTarget();
  const a=deferred(),b=deferred(),requests=[];
  const client={read:async()=>data,page:query=>{requests.push(query);return requests.length===1?a.promise:b.promise;}};
  const view=hookView(()=>useHome(client,'owner'),{});
  try{
    await view.flush();
    view.tree.changeOrder('review','desc');await view.flush();
    view.tree.changeOrder('review','asc');await view.flush();
    assert.deepEqual(requests.map(q=>[q.module,q.order,q.cursor]),[['review','desc',null],['review','asc',null]]);
    b.resolve({subjectId:'owner',module:'review',page:page([{id:'new'}])});await view.flush();
    a.resolve({subjectId:'owner',module:'review',page:page([{id:'stale'}])});await view.flush();
    assert.equal(view.tree.data.modules.review.items[0].id,'new');
    assert.deepEqual(view.tree.orders,{review:'asc',queries:'desc'});
  }finally{view.close();globalThis.window=previous;}
});

test('A single eligible classroom discovered after pagination is preselected',async()=>{
  const {HomeRoomPicker}=loadTsModule('apps/web/src/features/home/ui/HomeRoomPicker.tsx');
  const view=hookView(HomeRoomPicker,{data:{...data,modules:{...data.modules,classrooms:{...page([]),nextCursor:'next'}}},title:'Elegí un aula',onClose(){},onSelect(){},onUnauthorized(){},
    client:{page:async()=>({subjectId:'owner',module:'classrooms',page:page([room('only')])})}});
  try{
    await view.flush();button(view,'Cargar más aulas').props.onClick();await view.flush();
    assert.equal(descendants(view.tree,n=>n.type==='input')[0].props.checked,true);
    assert.equal(button(view,'Continuar').props.disabled,false);
  }finally{view.close();}
});

test('A classroom page belonging to another account is rejected',async()=>{
  const {HomeRoomPicker}=loadTsModule('apps/web/src/features/home/ui/HomeRoomPicker.tsx');
  let revoked=0;
  const view=hookView(HomeRoomPicker,{data:{...data,modules:{...data.modules,classrooms:{...page([]),nextCursor:'next'}}},title:'Elegí un aula',onClose(){},onSelect(){assert.fail();},onUnauthorized(){revoked++;},
    client:{page:async()=>({subjectId:'someone-else',module:'classrooms',page:page([room('private')])})}});
  try{
    await view.flush();button(view,'Cargar más aulas').props.onClick();await view.flush();
    assert.equal(revoked,1);assert.equal(descendants(view.tree,n=>n.type==='input').length,0);
  }finally{view.close();}
});

test('Retrying a student module never presents teacher ordering state',async()=>{
  const {useHome}=loadTsModule('apps/web/src/features/home/model/use-home.ts');
  const previous=globalThis.window;globalThis.window=new EventTarget();
  const pending=deferred();
  const client={read:async()=>data,page:()=>pending.promise};
  const stable=hookView(()=>useHome(client,'owner'),{});
  try{
    await stable.flush();void stable.tree.retry('pending');await stable.flush();
    assert.equal(stable.tree.ordering.pending,undefined);
    pending.resolve({subjectId:'owner',module:'pending',page:page([])});await stable.flush();
  }finally{stable.close();globalThis.window=previous;}
});

test('A refresh isolates a failed reordered module while keeping unrelated data',async()=>{
  const {useHome}=loadTsModule('apps/web/src/features/home/model/use-home.ts');
  const previous=globalThis.window;globalThis.window=new EventTarget();
  let fail=false;
  const client={read:async()=>structuredClone(data),page:async()=>{if(fail)throw Object.assign(Error(),{code:'SERVICE_UNAVAILABLE'});return {subjectId:'owner',module:'review',page:page([])};}};
  const view=hookView(()=>useHome(client,'owner'),{});
  try{
    await view.flush();view.tree.changeOrder('review','desc');await view.flush();
    fail=true;await view.tree.refresh();await view.flush();
    assert.equal(view.tree.data?.modules.classrooms.status,'ready');
    assert.equal(view.tree.data?.modules.review.status,'error');
    assert.equal(view.tree.orders.review,'desc');
  }finally{view.close();globalThis.window=previous;}
});

test('Transient pagination failure retains rows and retries with the same cursor and order',async()=>{
  const {HomeModulePanel}=loadTsModule('apps/web/src/features/home/ui/HomeModulePanel.tsx');
  let failure=true;const requests=[];
  const view=hookView(HomeModulePanel,{name:'review',order:'desc',data:{...data,modules:{...data.modules,review:{...page([{id:'first'}]),nextCursor:'next'}}},onClose(){},onAction(){},onUnauthorized(){assert.fail();},
    client:{page:async query=>{requests.push(query);if(failure)throw Error();return {subjectId:'owner',module:'review',page:page([{id:'second'}])};}}});
  try{
    await view.flush();button(view,'Cargar más').props.onClick();await view.flush();
    assert.equal(descendants(view.tree,n=>n.type?.name==='HomeRow').length,1);
    failure=false;button(view,'Reintentar').props.onClick();await view.flush();
    assert.equal(descendants(view.tree,n=>n.type?.name==='HomeRow').length,2);
    assert.deepEqual(requests.map(q=>[q.cursor,q.order]),[['next','desc'],['next','desc']]);
  }finally{view.close();}
});

test('Refresh revalidates a focused classroom beyond the first page without stale data',async()=>{
  const {useHome}=loadTsModule('apps/web/src/features/home/model/use-home.ts');
  const previous=globalThis.window;globalThis.window=new EventTarget();
  const calls=[];
  const client={read:async()=>({...data,modules:{...data.modules,classrooms:{...page([room('first')]),nextCursor:'next'}}}),
    page:async query=>{calls.push(query);return {subjectId:'owner',module:'classrooms',page:page([{...room('chosen'),title:'Updated title'}])};}};
  const view=hookView(()=>useHome(client,'owner','chosen'),{});
  try{
    await view.flush();
    assert.deepEqual(view.tree.data.modules.classrooms.items.map(x=>x.id),['first','chosen']);
    assert.equal(view.tree.data.modules.classrooms.items[1].title,'Updated title');
    assert.equal(calls[0].cursor,'next');
  }finally{view.close();globalThis.window=previous;}
});

test('One known active classroom is selected even when archived rooms occupy later pages',async()=>{
  const {HomeRoomPicker}=loadTsModule('apps/web/src/features/home/ui/HomeRoomPicker.tsx');
  const view=hookView(HomeRoomPicker,{data:{...data,memberships:{teach:1},modules:{...data.modules,classrooms:{...page([room('only')]),nextCursor:'archived'}}},title:'Elegí un aula',onClose(){},onSelect(){},onUnauthorized(){}});
  try{await view.flush();assert.equal(button(view,'Continuar').props.disabled,false);}finally{view.close();}
});
