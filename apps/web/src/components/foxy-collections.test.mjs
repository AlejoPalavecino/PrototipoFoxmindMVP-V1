import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from '../../../../tests/foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView,deferred} from '../../../../tests/agenda-ui-helpers.test.mjs';

test('Markdown renders headings, lists and emphasis while treating HTML and unsafe links as text',()=>{
 const {FoxyMarkdown}=componentWithPorts('apps/web/src/components/foxy-markdown.tsx',{});
 const html=renderToStaticMarkup(React.createElement(FoxyMarkdown,{markdown:'## Tema\n\n- **Concepto**\n- *Ejemplo*\n\n<img src=x onerror=alert(1)>\n[mal](javascript:alert(1))'}));
 assert.match(html,/<h3>Tema<\/h3>/);assert.match(html,/<ul>/);assert.match(html,/<strong>Concepto<\/strong>/);assert.match(html,/<em>Ejemplo<\/em>/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<a|<img/);
 assert.match(renderToStaticMarkup(React.createElement(FoxyMarkdown,{markdown:'## '})),/##/);
});
const conversation={id:'chat',title:'Mi clase',context:{kind:'GENERAL'},revision:'0'};
const chatState={current:conversation,conversations:[conversation],nextConversationCursor:null,turns:[],activeTurn:null,nextAfterSequence:null,pending:null,busy:false,error:'El título cambió en otra sesión.',capabilities:{textGeneration:{enabled:true},diagramGeneration:{enabled:false}}};

test('opening a text creation keeps its collection mounted for native focus restoration',async()=>{
 const {FoxyWorkspace}=componentWithPorts('apps/web/src/components/foxy-workspace.tsx',{}),opened=[];
 const view=hookView(FoxyWorkspace,{state:chatState,classrooms:[],controller:{},onOpenCreation:item=>opened.push(item)});
 try{await view.flush();descendants(view.tree,n=>n.type==='button'&&n.props.children==='Creaciones')[0].props.onClick();await view.flush();
 const item={id:'turn',turnId:'turn'};descendants(view.tree,n=>typeof n.type==='function'&&n.type.name==='FoxyCollectionPanel')[0].props.onOpen(item);await view.flush();
 assert.equal(opened[0],item);assert.ok(descendants(view.tree,n=>n.props?.title==='Creaciones').length,'Keep collection trigger connected until the resource editor closes');
 }finally{view.close();}
});

test('multiline first classroom message derives a one-line title and preserves the full message', async()=>{
 const {FoxyWorkspace}=componentWithPorts('apps/web/src/components/foxy-workspace.tsx',{}),calls=[];
 const state={...chatState,error:null,current:{...conversation,title:'Nueva conversación',context:{kind:'CLASSROOM',classroomId:'room'}},curriculum:{canGenerate:true,units:[]},selection:{topicIds:[],sourceIds:[]}};
 const message='Prepará un apunte:\nLa célula y sus partes';
 const view=hookView(FoxyWorkspace,{state,classrooms:[{id:'room',name:'Ciencias'}],controller:{rename:async title=>{calls.push(['rename',title]);return !title.includes('\n');},send:async (_purpose,text)=>{calls.push(['send',text]);return 'accepted';}}});
 try { await view.flush(); descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:message}}); await view.flush(); descendants(view.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='textarea').length)[0].props.onSubmit({preventDefault(){}}); await view.flush(); assert.deepEqual(calls,[['rename','Prepará un apunte: La célula y sus partes'],['send',message]]); } finally { view.close(); }
});
test('rename conflict keeps the exact draft open for correction and does not send blank names',async()=>{
 const {FoxyWorkspace}=componentWithPorts('apps/web/src/components/foxy-workspace.tsx',{}),calls=[];
 const view=hookView(FoxyWorkspace,{state:chatState,classrooms:[],controller:{rename:async title=>{calls.push(title);return false;}}});
 try{await view.flush();descendants(view.tree,n=>n.type==='button'&&n.props.children==='Renombrar')[0].props.onClick();await view.flush();
 let input=descendants(view.tree,n=>n.type==='input'&&n.props.autoFocus)[0];input.props.onChange({target:{value:'Título mío'}});await view.flush();
 let form=descendants(view.tree,n=>n.type==='form'&&n.props.className!==undefined&&descendants(n,c=>c.type==='input').length)[0];
 // CSS modules are stubbed by this loader; use the field rather than its class.
 form??=descendants(view.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='input').length)[0];form.props.onSubmit({preventDefault(){}});await view.flush();
 assert.deepEqual(calls,['Título mío']);input=descendants(view.tree,n=>n.type==='input'&&n.props.autoFocus)[0];assert.equal(input.props.value,'Título mío');assert.match(renderToStaticMarkup(view.tree),/El título cambió/);
 input.props.onChange({target:{value:'   '}});await view.flush();descendants(view.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='input').length)[0].props.onSubmit({preventDefault(){}});assert.equal(calls.length,1);
 }finally{view.close();}
});
test('choosing classroom prepares context without sending and blocks composer while loading',async()=>{
 const {FoxyWorkspace}=componentWithPorts('apps/web/src/components/foxy-workspace.tsx',{}),pending=deferred(),calls=[];
 const view=hookView(FoxyWorkspace,{state:{...chatState,error:null},classrooms:[{id:'room',name:'Biología'}],controller:{prepareContext:id=>{calls.push(id);return pending.promise;}}});
 try{await view.flush();descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:'Mi primer pedido'}});await view.flush();descendants(view.tree,n=>n.type==='select'&&n.props['aria-label']==='Contexto del chat')[0].props.onChange({target:{value:'room'}});await view.flush();
 assert.deepEqual(calls,['room']);assert.match(renderToStaticMarkup(view.tree),/Preparando contexto/);
 assert.equal(descendants(view.tree,n=>n.type==='button'&&n.props.type==='submit')[0].props.disabled,true);pending.resolve(true);await view.flush();
 }finally{view.close();}
});
test('first message gives a prepared empty classroom conversation a useful title before sending',async()=>{
 const {FoxyWorkspace}=componentWithPorts('apps/web/src/components/foxy-workspace.tsx',{}),calls=[];
 const state={...chatState,error:null,current:{...conversation,title:'Nueva conversación',context:{kind:'CLASSROOM',classroomId:'room'}},curriculum:{canGenerate:true,units:[]},selection:{topicIds:[],sourceIds:[]}};
 const view=hookView(FoxyWorkspace,{state,classrooms:[{id:'room',name:'Física'}],controller:{rename:async title=>{calls.push(['rename',title]);return true;},send:async (...args)=>{calls.push(['send',...args]);return 'accepted';}}});
 try{await view.flush();descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:'Prepará la clase de luz'}});await view.flush();descendants(view.tree,n=>n.type==='form'&&descendants(n,c=>c.type==='textarea').length)[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(calls[0][0],'rename');assert.equal(calls[0][1],'Prepará la clase de luz');assert.equal(calls[1][0],'send');}finally{view.close();}
});
test('creation collection exposes origin and effective destinations and sends complete remote filters',()=>{
 const {FoxyCollectionPanel}=componentWithPorts('apps/web/src/components/foxy-collection-panel.tsx',{}),calls=[];
 const item={id:'one',kind:'PLAN',title:'Clase de luz',context:{kind:'CLASSROOM',classroomId:'a'},status:'DRAFT',destinations:[{kind:'ACTIVITY',classroomId:'b',classroomName:'Química',id:'activity',state:'DRAFT'}]};
 const tree=FoxyCollectionPanel({page:{items:[item],next:'cursor',loading:false,error:null},query:{q:'',context:'ALL',type:'ALL',status:'ALL'},classrooms:[{id:'a',name:'Física'}],onQuery:q=>calls.push(q),onMore:()=>calls.push('more'),onOpen:value=>calls.push(value),onRefresh:()=>{}});
 const html=renderToStaticMarkup(tree);assert.match(html,/Origen: Física/);assert.match(html,/Química.*Borrador/);assert.doesNotMatch(html,/Asignado/);
 descendants(tree,n=>n.type==='button'&&n.props.children==='Planificaciones')[0].props.onClick();assert.deepEqual(calls[0],{q:'',context:'ALL',type:'PLAN',status:'ALL'});
 descendants(tree,n=>n.type==='button'&&n.props['aria-label']==='Abrir Clase de luz')[0].props.onClick();assert.equal(calls[1],item);
});
test('effective destinations navigate through the guard and preparations never expose a destination link',()=>{
 const {FoxyCollectionPanel}=componentWithPorts('apps/web/src/components/foxy-collection-panel.tsx',{}),calls=[];
 const classroomId='f0b2a217-69b2-4afa-b08a-07960283a607',activityId='2de3e518-788a-44ba-bcc4-b97ce829119b';
 const item={id:'one',kind:'RUBRIC',title:'Criterios',context:{kind:'GENERAL'},status:'DRAFT',destinations:[{kind:'ACTIVITY',classroomId,classroomName:'Física',id:activityId,state:'DRAFT'},{kind:'MATERIAL',classroomId,classroomName:'Física',id:null,state:'PREPARING'}]};
 const tree=FoxyCollectionPanel({page:{items:[item],next:null,loading:false,error:null},query:{q:'',context:'ALL',type:'ALL',status:'ALL'},classrooms:[],onNavigate:path=>calls.push(path)});
 const open=descendants(tree,n=>n.type==='button'&&n.props.children==='Abrir borrador');assert.equal(open.length,1);open[0].props.onClick();assert.match(calls[0],/destino=activity/);assert.match(decodeURIComponent(calls[0]),new RegExp(activityId));
 assert.equal(descendants(tree,n=>n.type==='a').length,0);
});
