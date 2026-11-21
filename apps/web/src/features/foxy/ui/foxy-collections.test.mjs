import { classroomHomeHref } from "../../../application/navigation/destinations.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from "../../../../../../tests/foxmind-3d-flows-loader.test.mjs";
import {descendants,hookView,deferred} from "../../../../../../tests/agenda-ui-helpers.test.mjs";

test('Markdown renders headings, lists and emphasis while treating HTML and unsafe links as text',()=>{
 const {FoxyMarkdown}=componentWithPorts("apps/shared-ui/markdown.tsx",{});
 const html=renderToStaticMarkup(React.createElement(FoxyMarkdown,{markdown:'## Tema\n\n- **Concepto**\n- *Ejemplo*\n\n<img src=x onerror=alert(1)>\n[mal](javascript:alert(1))'}));
 assert.match(html,/<h3>Tema<\/h3>/);assert.match(html,/<ul>/);assert.match(html,/<strong>Concepto<\/strong>/);assert.match(html,/<em>Ejemplo<\/em>/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<a|<img/);
 assert.match(renderToStaticMarkup(React.createElement(FoxyMarkdown,{markdown:'## '})),/##/);
 const note=renderToStaticMarkup(React.createElement(FoxyMarkdown,{markdown:'Primera idea\n---\nSegunda idea con `---`.'}));
 assert.match(note,/<p>Primera idea<\/p><hr\s*\/?><p>Segunda idea con <code>---<\/code>/);
});

const conversation={id:'chat',title:'Mi clase',context:{kind:'GENERAL'},revision:'0'};
const chatState={current:conversation,conversations:[conversation],nextConversationCursor:null,turns:[],activeTurn:null,nextAfterSequence:null,pending:null,busy:false,error:'El título cambió en otra sesión.',capabilities:{textGeneration:{enabled:true},diagramGeneration:{enabled:false}}};

test('opening a text creation keeps its collection mounted for native focus restoration',async()=>{
 const {FoxyWorkspace}=componentWithPorts("apps/web/src/features/foxy/workspace/foxy-workspace.tsx",{}),opened=[];
 const view=hookView(FoxyWorkspace,{state:chatState,classrooms:[],controller:{},onOpenCreation:item=>opened.push(item)});
 const layout=()=>descendants(view.tree,n=>n.type?.name==='FoxyChatLayout')[0];
 try{await view.flush();layout().props.onView('creations');await view.flush();
 const item={id:'turn',turnId:'turn'};layout().props.creations.props.onOpen(item);await view.flush();
 assert.equal(opened[0],item);assert.equal(layout().props.view,'creations','Keep collection trigger connected until the resource editor closes');
 }finally{view.close();}
});

test('multiline first classroom message derives a one-line title and preserves the full message', async()=>{
 const {FoxyWorkspace}=componentWithPorts("apps/web/src/features/foxy/workspace/foxy-workspace.tsx",{}),calls=[];
 const state={...chatState,error:null,current:{...conversation,title:'Nueva conversación',context:{kind:'CLASSROOM',classroomId:'room'}},curriculum:{canGenerate:true,units:[]},selection:{topicIds:[],sourceIds:[]}};
 const message='Prepará un apunte:\nLa célula y sus partes';
 const view=hookView(FoxyWorkspace,{state,classrooms:[{id:'room',name:'Ciencias'}],controller:{rename:async title=>{calls.push(['rename',title]);return !title.includes('\n');},send:async (_purpose,text)=>{calls.push(['send',text]);return 'accepted';}}});
 try { await view.flush(); descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:message}}); await view.flush(); descendants(view.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='textarea').length)[0].props.onSubmit({preventDefault(){}}); await view.flush(); assert.deepEqual(calls,[['rename','Prepará un apunte: La célula y sus partes'],['send',message]]); } finally { view.close(); }
});
test('rename conflict keeps the exact draft open for correction and does not send blank names',async()=>{
 const {FoxyWorkspace}=componentWithPorts("apps/web/src/features/foxy/workspace/foxy-workspace.tsx",{}),calls=[];
 const view=hookView(FoxyWorkspace,{state:chatState,classrooms:[],controller:{select:async()=>true,rename:async title=>{calls.push(title);return false;}}});
 const rename=()=>descendants(view.tree,n=>n.type?.name==='FoxyRenameDialog')[0];
 let dialog;
 try{await view.flush();descendants(view.tree,n=>n.type?.name==='FoxyChatLayout')[0].props.history.props.onRename(conversation);await view.flush();
 assert.ok(rename(),'workspace opens the real rename dialog');
 // Mount the extracted owner with the workspace's real callbacks and props.
 dialog=hookView(rename().type,rename().props);await dialog.flush();
 let input=descendants(dialog.tree,n=>n.type==='input'&&n.props.autoFocus)[0];input.props.onChange({target:{value:'Título mío'}});await dialog.flush();
 let form=descendants(dialog.tree,n=>n.type==='form'&&n.props.className!==undefined&&descendants(n,c=>c.type==='input').length)[0];
 // CSS modules are stubbed by this loader; use the field rather than its class.
 form??=descendants(dialog.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='input').length)[0];await form.props.onSubmit({preventDefault(){}});await dialog.flush();await view.flush();
 assert.deepEqual(calls,['Título mío']);input=descendants(dialog.tree,n=>n.type==='input'&&n.props.autoFocus)[0];assert.equal(input.props.value,'Título mío');assert.match(renderToStaticMarkup(dialog.tree),/El título cambió/);
 assert.ok(rename(),'a rejected rename keeps the workspace dialog open');
 input.props.onChange({target:{value:'   '}});await dialog.flush();await descendants(dialog.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='input').length)[0].props.onSubmit({preventDefault(){}});assert.equal(calls.length,1);
 }finally{dialog?.close();view.close();}
});
test('choosing classroom prepares context without sending and blocks composer while loading',async()=>{
 const {FoxyWorkspace}=componentWithPorts("apps/web/src/features/foxy/workspace/foxy-workspace.tsx",{
   '../../../shared/use-chat-attachments':{useChatAttachments:()=>({items:[],ready:true,busy:false})},
 }),pending=deferred(),calls=[];
 const view=hookView(FoxyWorkspace,{state:{...chatState,error:null},classrooms:[{id:'room',name:'Biología'}],controller:{prepareContext:id=>{calls.push(id);return pending.promise;}}});
 try{await view.flush();descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:'Mi primer pedido'}});await view.flush();
 descendants(view.tree,n=>n.type?.name==='FoxyChatLayout')[0].props.context.props.onClick();await view.flush();
 const picker=descendants(view.tree,n=>n.type?.name==='FoxyContextPicker')[0];
 assert.deepEqual(calls,[]);assert.equal(picker.props.classrooms[0].name,'Biología');
 picker.props.onApply('room');await view.flush();
 assert.deepEqual(calls,['room']);assert.match(renderToStaticMarkup(view.tree),/Preparando contexto/);
 assert.equal(descendants(view.tree,n=>n.type==='button'&&n.props.type==='submit')[0].props.disabled,true);pending.resolve(true);await view.flush();
 }finally{view.close();}
});
test('first message gives a prepared empty classroom conversation a useful title before sending',async()=>{
 const {FoxyWorkspace}=componentWithPorts("apps/web/src/features/foxy/workspace/foxy-workspace.tsx",{}),calls=[];
 const state={...chatState,error:null,current:{...conversation,title:'Nueva conversación',context:{kind:'CLASSROOM',classroomId:'room'}},curriculum:{canGenerate:true,units:[]},selection:{topicIds:[],sourceIds:[]}};
 const view=hookView(FoxyWorkspace,{state,classrooms:[{id:'room',name:'Física'}],controller:{rename:async title=>{calls.push(['rename',title]);return true;},send:async (...args)=>{calls.push(['send',...args]);return 'accepted';}}});
 try{await view.flush();descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:'Prepará la clase de luz'}});await view.flush();descendants(view.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='textarea').length)[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(calls[0][0],'rename');assert.equal(calls[0][1],'Prepará la clase de luz');assert.equal(calls[1][0],'send');}finally{view.close();}
});
test('creation collection uses compact type chips and opens the saved creation without exposing destination controls',async()=>{
 const {FoxyCollectionPanel}=componentWithPorts("apps/web/src/features/foxy/collections/foxy-collection-panel.tsx",{}),calls=[];
 const item={id:'one',kind:'PLAN',title:'Clase de luz',context:{kind:'CLASSROOM',classroomId:'a'},status:'DRAFT',destinations:[{kind:'ACTIVITY',classroomId:'b',classroomName:'Química',id:'activity',state:'DRAFT'}]};
 const view=hookView(FoxyCollectionPanel,{page:{items:[item],next:'cursor',loading:false,error:null},query:{q:'',context:'ALL',type:'ALL',status:'ALL'},classrooms:[{id:'a',name:'Física'}],onQuery:q=>calls.push(q),onMore:()=>calls.push('more'),onOpen:value=>calls.push(value),onRefresh:()=>{}});
 try {
  await view.flush();
  const html=renderToStaticMarkup(view.tree);assert.match(html,/Con vínculos/);assert.doesNotMatch(html,/Origen:|Abrir borrador|Asignado/);
  descendants(view.tree,n=>n.type==='button'&&n.props.children==='Clases')[0].props.onClick();assert.deepEqual(calls[0],{q:'',context:'ALL',type:'PLAN',status:'ALL'});
  descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Abrir Clase de luz')[0].props.onClick();assert.equal(calls[1],item);
 } finally { view.close(); }
});
test('creation collection defers destination navigation to the guarded resource review',async()=>{
 const {FoxyCollectionPanel}=componentWithPorts("apps/web/src/features/foxy/collections/foxy-collection-panel.tsx",{}),calls=[];
 const classroomId='f0b2a217-69b2-4afa-b08a-07960283a607',activityId='2de3e518-788a-44ba-bcc4-b97ce829119b';
 const item={id:'one',kind:'RUBRIC',title:'Criterios',context:{kind:'GENERAL'},status:'DRAFT',destinations:[{kind:'ACTIVITY',classroomId,classroomName:'Física',id:activityId,state:'DRAFT'},{kind:'MATERIAL',classroomId,classroomName:'Física',id:null,state:'PREPARING'}]};
 const view=hookView(FoxyCollectionPanel,{page:{items:[item],next:null,loading:false,error:null},query:{q:'',context:'ALL',type:'ALL',status:'ALL'},classrooms:[],destinationHref:classroomHomeHref,onNavigate:path=>calls.push(['navigate',path]),onOpen:value=>calls.push(['open',value])});
 try {
  await view.flush();
  assert.equal(descendants(view.tree,n=>n.type==='button'&&n.props.children==='Abrir borrador').length,0);
  descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Abrir Criterios')[0].props.onClick();assert.deepEqual(calls,[['open',item]]);
  assert.equal(descendants(view.tree,n=>n.type==='a').length,0);
 } finally { view.close(); }
});

test('context, status, type and title filters are composed for the server', async () => {
 const {FoxyCollectionPanel,FoxyConversationPanel}=componentWithPorts('apps/web/src/features/foxy/collections/foxy-collection-panel.tsx',{});
 const page={items:[],next:null,loading:false,error:null}, classrooms=[{id:'room',name:'Fotografía'}], queries=[];
 const query={q:'luz',context:'room',type:'RUBRIC',status:'PUBLISHED'};
 const creations=hookView(FoxyCollectionPanel,{page,classrooms,query,onQuery:value=>queries.push(value)});
 const history=hookView(FoxyConversationPanel,{page,classrooms,query:{q:'luz',context:'room'},onQuery:value=>queries.push(value)});
 try{
  await creations.flush();await history.flush();
  descendants(creations.tree,n=>n.type==='input'&&n.props.type==='search')[0].props.onChange({target:{value:'contraste'}});
  descendants(creations.tree,n=>n.type==='button'&&n.props.children==='Esquemas')[0].props.onClick();
  descendants(history.tree,n=>n.type==='input'&&n.props.type==='search')[0].props.onChange({target:{value:'contraste'}});
  assert.deepEqual(queries,[{...query,q:'contraste'},{...query,type:'DIAGRAM'},{q:'contraste',context:'room'}]);
  assert.match(renderToStaticMarkup(creations.tree),/Todos los contextos|Todos los estados/);
 }finally{creations.close();history.close();}
});

test('visual prompt survives a rebuilt transcript and keeps its place before later text', () => {
 const {renderFoxyTranscript}=componentWithPorts('apps/web/src/features/foxy/conversations/foxy-transcript.tsx',{});
 const turn=(id,at,message)=>({id,createdAt:at,state:'READY',purpose:'CHAT',message,answer:{markdown:'Respuesta'}});
 const first=turn('first','2026-01-01T00:00:01Z','Primer texto');
 const later=turn('later','2026-01-01T00:00:03Z','Texto posterior');
 const visual={id:'visual',createdAt:'2026-01-01T00:00:02Z',kind:'DIAGRAM',state:'READY',prompt:'Consigna original del esquema'};
 const html=renderToStaticMarkup(renderFoxyTranscript({state:{...chatState,turns:[first,later]},
  chatFollow:{},controller:{},attachmentCount:0,enabled:true,visualTimeline:{jobs:[visual],onOpen(){}}}));
 assert.ok(html.indexOf('Primer texto')<html.indexOf(visual.prompt));
 assert.ok(html.indexOf(visual.prompt)<html.indexOf('Texto posterior'));
 assert.match(html,/Explorar esquema/);
});

test('the classroom scope announces one selected source in the singular', async () => {
  const {FoxyScopeDialog}=componentWithPorts('apps/web/src/features/foxy/context/foxy-scope-dialog.tsx',{});
  const empty={items:[],next:null};
  const view=hookView(FoxyScopeDialog,{
    curriculum:{units:[]},selection:{topicIds:[],sourceIds:['plan:sample']},
    sources:{PLAN:empty,MATERIAL:empty,ACTIVITY:empty},error:null,onClose(){},
  });
  try {
    await view.flush();
    const html=renderToStaticMarkup(view.tree);
    assert.match(html,/1 fuente seleccionada\./);
    assert.doesNotMatch(html,/1 fuentes seleccionadas/);
  } finally { view.close(); }
});

test('partial chat text is readable while running and disappears on failure, cancellation, loss of contact or final answer', () => {
 const {renderFoxyTranscript}=componentWithPorts("apps/web/src/features/foxy/conversations/foxy-transcript.tsx",{});
 const turn={id:'turn',sequence:1,state:'RUNNING',purpose:'CHAT',message:'Hola',partialMarkdown:'Primer fragmento <b>sin interpretar</b>',answer:null};
 function render(patch={},pollError=null) {
   return renderToStaticMarkup(renderFoxyTranscript({state:{...chatState,pollError,turns:[{...turn,...patch}],activeTurn:{id:'turn',state:patch.state??'RUNNING'}},chatFollow:{},controller:{},enabled:true}));
 }
 assert.match(render(),/Primer fragmento &lt;b&gt;sin interpretar&lt;\/b&gt;/);
 assert.match(render(),/Detener/);
 for(const state of ['CANCELLED','FAILED','STALE','QUEUED']) assert.doesNotMatch(render({state}),/Primer fragmento/);
 assert.doesNotMatch(render({purpose:'RUBRIC'}),/Primer fragmento/);
 assert.doesNotMatch(render({},'Falló la consulta'),/Primer fragmento/);
 const final=render({state:'READY',answer:{title:'Foxy',markdown:'Contenido final'}});
 assert.match(final,/Contenido final/);
 assert.doesNotMatch(final,/Primer fragmento/);
});

test('the acknowledged turn keeps the same stop control when its first HTTP reading arrives', () => {
 const {renderFoxyTranscript}=componentWithPorts('apps/web/src/features/foxy/conversations/foxy-transcript.tsx',{});
 const activeTurn={id:'accepted-turn',sequence:1,state:'RUNNING'};
 const turn={...activeTurn,purpose:'CHAT',message:'Hola',createdAt:'2026-11-17T12:00:00Z',answer:null,partialMarkdown:'Primer fragmento'};
 function render(turns,pendingVisible) {
   return renderFoxyTranscript({state:{...chatState,error:null,turns,activeTurn},chatFollow:{},controller:{},
     pendingText:'Hola',pendingVisible,enabled:true});
 }
 function runningControl(tree) {
   const entry=descendants(tree,node=>node.type===React.Fragment&&node.key===activeTurn.id)[0];
   assert.ok(entry,'the acknowledged turn must already occupy its keyed transcript entry');
   const article=entry.props.children;
   assert.equal(article.type,'article');
   assert.equal(article.props.children[1]?.type.name,'FoxyWait');
   const wait=article.props.children[1];
   assert.equal(typeof wait.props.onStop,'function');
   return wait;
 }
 for (const pendingVisible of [true,false]) {
   const first=runningControl(render([],pendingVisible));
   const next=runningControl(render([turn],false));
   assert.equal(first.type,next.type);
   assert.equal(next.props.partialText,'Primer fragmento');
 }
});
