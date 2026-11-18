import { authoringFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';import assert from 'node:assert/strict';
import {loadTsModule} from './helpers/load-ts-module.mjs';import {hookView,descendants} from './agenda-ui-helpers.test.mjs';
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):text(n?.props?.children??'');
const room={id:'room',name:'Ciencias',division:'A',role:'teacher',archived:false,revision:'r1',timezone:'UTC',units:[{id:'unit',name:'Unidad',topics:[{id:'topic',name:'Tema'}]}]};
const draft={id:'existing',type:'ASSIGNMENT',status:'DRAFT',title:'Actividad',objective:'Objetivo guardado',teacherComment:'Comentario guardado',unitId:'unit',topicId:'topic',topicIds:['topic'],evaluationRubric:[{name:'Evidencia',description:'Relaciona conceptos',weight:100}],instructions:'Resolver',attachmentRequired:false,questions:[],instructionFiles:[],materials:[],deadlineAt:null,allowLate:false,locked:false};
const find=(v,p)=>descendants(v.tree,p);
async function clickButton(view, label) {
 const button = find(view, node => node.type === 'button' && text(node).trim() === label)[0];
 assert.ok(button, `Missing action: ${label}`);
 assert.equal(Boolean(button.props.disabled), false, label);
 button.props.onClick();
 await view.flush();
}
async function openNewEditor(view) {
 await view.flush();
 await clickButton(view, 'Crear actividad');
 const editor = find(view, node => node.type?.name === 'ActivityAuthoring')[0];
 assert.ok(editor, 'Creating opens the shared editor at Alcance');
 assert.equal(editor.props.data.activity.id, '', 'Opening does not persist a draft');
 return editor;
}
async function reachReview(view) {
 await clickButton(view, 'Continuar');
 await clickButton(view, 'Continuar a revisión');
}
for(const assigned of [false,true])test(`confirmed ${assigned?'assignment':'draft save'} opens its canonical activity sheet`,async()=>{
 const {Activities}=loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');const result={revision:'r2',activity:{...draft,id:'saved',status:assigned?'PUBLISHED':'DRAFT'}};
 const calls=[];
 const api={call:async(path,method)=>{calls.push([path,method]);return path.endsWith('/library')?[]:path.endsWith('/preview')?result:path.endsWith('/progress')?{scope:'classroom',students:[]}:{activities:[]};}};
 const view=hookView(Activities,{api,room,reload:async()=>{}});
 try {
  const editor=await openNewEditor(view);
  await editor.props.onSaved(assigned,'saved');await view.flush();
  assert.equal(find(view,n=>n.type?.name==='ActivityAuthoring').length,0);
  const sheet=find(view,n=>n.type?.name==='AttemptHistory')[0];
  assert.equal(sheet?.props.activityId,'saved');
  assert.equal(sheet.props.activityPreview,result.activity);
  assert.ok(calls.some(([path,method])=>path==='/room/activities/saved/preview'&&method==='GET'));
 }finally{view.close();}
});
test('blank manual form requires an explicit activity type before saving or reviewing',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx'),calls=[];
 const view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {api:{call:async(...a)=>{calls.push(a);return {revision:'r2'};}},room,data:{activity:{...draft,id:'',title:null,instructions:null,objective:null},revision:'r1'},materials:[],onSaved:async()=>{},onClose(){}}));
 try{await view.flush();const choice=find(view,n=>n.type?.name==='ActivityTypeChoice')[0];assert.equal(choice.props.value,'');
  await clickButton(view, 'Continuar');
  assert.match(text(view.tree), /Elegí un tipo de actividad/);
  assert.equal(find(view,n=>n.type==='form')[0].props['data-authoring-step'],0);
  find(view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(calls.length,0);assert.match(text(view.tree),/Elegí un tipo de actividad/);
 }finally{view.close();}
});

test('reviewing an incomplete saved draft cannot bypass required publication fields',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx'),calls=[];
 const view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {api:{call:async(...args)=>calls.push(args)},room,data:{activity:{...draft,objective:''},revision:'r1'},materials:[],initialReview:true,onSaved:async()=>{},onClose(){}}));
 try{await view.flush();await clickButton(view, 'Publicar actividad');assert.equal(calls.length,0);
  assert.match(text(view.tree),/Escribí el objetivo de aprendizaje/);
  assert.equal(find(view,n=>n.type==='form')[0].props['data-authoring-step'],1);
  assert.equal(find(view,n=>n.type==='button'&&text(n)==='Asignar al aula').length,0);}finally{view.close();}
});

test('confirmed publication followed by navigation failure retries only reads and never labels it private',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx'),calls=[];let navigation=0;
 const view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {api:{call:async(...args)=>{calls.push(args);return {revision:'r2'};}},room,data:{activity:draft,revision:'r1'},materials:[],initialReview:true,onSaved:async()=>{if(++navigation===1)throw new Error('Read unavailable');},onClose(){}}));
 try{await view.flush();await clickButton(view, 'Publicar actividad');assert.equal(calls.length,0);
  await clickButton(view, 'Asignar al aula');assert.deepEqual(calls.map(args=>args[2].operation.action),['save','publish']);assert.doesNotMatch(text(view.tree),/Borrador privado/);assert.match(text(view.tree),/Actividad asignada a Ciencias/);find(view,n=>n.type==='button'&&text(n)==='Abrir actividad asignada')[0].props.onClick();await view.flush();assert.equal(navigation,2);assert.equal(calls.length,2);}finally{view.close();}
});

test('late save refresh cannot reopen an editor the teacher already closed',async()=>{
 const {Activities}=loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');let release,reloads=0;
 const delayed=new Promise(resolve=>{release=resolve;});const reads=[];
 const api={call:async path=>{reads.push(path);return path.endsWith('/library')?[]:path.endsWith('/preview')?{activity:draft,revision:'r2'}:{activities:[]};}};
 const view=hookView(Activities,{api,room,reload:()=>{reloads++;return delayed;}});
 try {
  const author=await openNewEditor(view);
  const saving=author.props.onSaved(false,'saved');
  assert.equal(reloads,1,'Save refresh started before closing the editor');
  author.props.onClose();await view.flush();release();await saving;await view.flush();
  assert.equal(find(view,n=>n.type?.name==='ActivityAuthoring'||n.type?.name==='AttemptHistory').length,0);
  assert.equal(reads.some(path=>path.endsWith('/saved/preview')),false);
 }finally{release();view.close();}
});

test('save acknowledgement arriving after editor closure has no navigation effects',async()=>{
 const {Activities}=loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');let reloads=0;const reads=[];
 const view=hookView(Activities,{api:{call:async path=>{reads.push(path);return path.endsWith('/library')?[]:{activities:[]};}},room,reload:async()=>{reloads++;}});
 try{const old=await openNewEditor(view);old.props.onClose();await view.flush();await old.props.onSaved(true,'saved-old');await view.flush();assert.equal(reloads,0);assert.equal(reads.some(path=>path.endsWith('/preview')),false);assert.equal(find(view,n=>n.type?.name==='ActivityAuthoring'||n.type?.name==='AttemptHistory').length,0);}finally{view.close();}
});

test('written resources produce a real Unicode DOCX with escaped content and no executable markup',async()=>{
 const {createTextDocument}=loadTsModule('apps/shared-ui/text-document.ts');
 const yauzl=await import('yauzl');const bytes=createTextDocument('Biología á 🦊','Una célula\n<script>literal & texto</script>');
 const entries=await new Promise((resolve,reject)=>yauzl.fromBuffer(Buffer.from(bytes),{lazyEntries:true},(error,zip)=>{if(error)return reject(error);const found={};zip.on('error',reject);zip.on('entry',entry=>zip.openReadStream(entry,(error,stream)=>{if(error)return reject(error);const chunks=[];stream.on('data',chunk=>chunks.push(chunk));stream.on('end',()=>{found[entry.fileName]=Buffer.concat(chunks).toString('utf8');zip.readEntry();});stream.on('error',reject);}));zip.on('end',()=>resolve(found));zip.readEntry();}));
 assert.equal(Object.keys(entries).length,3);assert.match(entries['word/document.xml'],/Biología á 🦊/);assert.match(entries['word/document.xml'],/&lt;script&gt;literal &amp; texto&lt;\/script&gt;/);assert.throws(()=>createTextDocument('Título','x'.repeat(100001)));assert.throws(()=>createTextDocument('Título','invalid\u0000'));
});

test('reading and exporting saved notes preserves their structure and displays the same simple math', async () => {
 const {FoxyMarkdown}=loadTsModule('apps/shared-ui/markdown.tsx');
 const {downloadTextDocument,downloadMarkdownText}=loadTsModule('apps/shared-ui/text-document.ts');
 const content=String.raw`# Costo total

El plan A cuesta **$300 + 50 \times v$** y el B cobra $80 por viaje.

1. Compará los dos planes.
2. Calculá cuántos viajes los igualan.

${'`$x$`'} y $\unsupported{q}$ quedan legibles.

<script>texto literal</script>`;
 const html=renderToStaticMarkup(React.createElement(FoxyMarkdown,{markdown:content}));
 assert.match(html,/<strong>300 \+ 50 × v<\/strong> y el B cobra \$80/);
 assert.match(html,/<code>\$x\$<\/code>/);
 assert.match(html,/<ol>/);
 assert.doesNotMatch(html,/<script>/);

 const blobs=[];
 const previousDocument=globalThis.document;
 const createObjectURL=URL.createObjectURL;
 const revokeObjectURL=URL.revokeObjectURL;
 try {
  globalThis.document={body:{append(){}},createElement:()=>({click(){},remove(){}})};
  URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:foxmind-synthetic';};
  URL.revokeObjectURL=()=>{};
  downloadTextDocument('Planes de viaje',content);
  downloadMarkdownText('Planes de viaje',content);
 } finally {
  globalThis.document=previousDocument;
  URL.createObjectURL=createObjectURL;
  URL.revokeObjectURL=revokeObjectURL;
 }
 const bytes=Buffer.from(await blobs[0].arrayBuffer());
 const plain=await blobs[1].text();
 assert.match(plain,/1\. Compará los dos planes\./);
 assert.match(plain,/300 \+ 50 × v y el B cobra \$80/);
 assert.doesNotMatch(plain,/\*\*|# Costo/);
 const word=bytes.toString('utf8');
 assert.match(word,/<w:pStyle w:val="Title"\/>/);
 assert.match(word,/<w:pStyle w:val="Heading1"\/>/);
 assert.match(word,/<w:numPr>/);
 assert.match(word,/<w:b\/>/);
 assert.match(word,/<w:t xml:space="preserve">300 \+ 50 × v<\/w:t>/);
 assert.match(word,/word\/styles\.xml/);
 assert.match(word,/word\/numbering\.xml/);
 assert.match(word,/&lt;script&gt;texto literal&lt;\/script&gt;/);
});

test('manual flow exposes scope, content and deadline before a read-only review',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
 const calls=[],view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {api:{call:async(...a)=>{calls.push(a);return {revision:'r2'};}},room,data:{activity:{...draft,id:''},revision:'r1'},materials:[],onSaved:async()=>{},onClose(){}}));
 try{await view.flush();const steps=find(view,n=>n.type==='ol'&&n.props['aria-label']==='Etapas de edición')[0];
 assert.equal(steps.props.children.length,3);
 assert.match(text(steps),/Alcance.*Contenido.*Revisión/);
 assert.ok(find(view,n=>n.type?.name==='ActivityAssignment').length);
 assert.equal(calls.length,0);
 await clickButton(view, 'Continuar');
 for (const label of ['Consigna', 'Plazo de entrega']) {
  const fieldset = find(view, node => node.type === 'fieldset' && node.props['aria-label'] === label)[0];
  assert.equal(Boolean(fieldset.props.hidden), false, label);
 }
 const rubric = find(view, node => node.type === 'button' && text(node).trim().startsWith('Rúbrica'))[0];
 assert.ok(rubric);
 rubric.props.onClick();
 await view.flush();
 assert.deepEqual(find(view, node => node.type?.name === 'EvaluationRubricEditor')[0].props.criteria, draft.evaluationRubric);
 await clickButton(view, 'Continuar a revisión');
 assert.ok(find(view,n=>n.props?.['aria-label']==='Revisión del borrador').length);
 assert.equal(calls.length,0);
 }finally{view.close();}
});
test('explicit assignment from review saves a new draft before publication and never requires an earlier save click',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx'),calls=[];
 const view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {api:{call:async(...a)=>{calls.push(a);return {id:'new-id',revision:String(calls.length+1)};}},room,data:{activity:{...draft,id:''},revision:'r1'},materials:[],onSaved:async()=>{},onClose(){}}));
 try{await view.flush();await reachReview(view);assert.equal(calls.length,0);
  await clickButton(view, 'Publicar actividad');assert.equal(calls.length,0);
  await clickButton(view, 'Asignar al aula');assert.deepEqual(calls.map(call=>call[2].operation.action),['create','save','publish']);assert.equal(calls.at(-1)[2].operation.id,'new-id');}finally{view.close();}
});
test('opening activity creation prepares a local editor with zero writes',async()=>{
 const {Activities}=loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx'),calls=[];
 const api={call:async(...a)=>{calls.push(a);if(a[1]==='POST')return {id:'created',revision:'r2'};return a[0].endsWith('/library')?[]:a[0].endsWith('/preview')?{activity:draft,revision:'r2'}:{activities:[]};}};
 const view=hookView(Activities,{api,room,reload:async()=>{}});try{
  await openNewEditor(view);
  assert.ok(calls.some(([path,method])=>path==='/room/library'&&method==='GET'));
  assert.ok(calls.every(([,method])=>method==='GET'),'Opening never writes a draft');
 }finally{view.close();}
});
test('manual objective/comment hydrate, edit and save independently from instructions and private rubric',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx'),calls=[];
 const view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {api:{call:async(...a)=>{calls.push(a);return {revision:'r2'};}},room,data:{activity:draft,revision:'r1'},materials:[],onSaved:async()=>{},onClose(){}}));
 try{await view.flush();const objective=find(view,n=>n.type==='textarea'&&n.props.name==='objective')[0],comment=find(view,n=>n.type==='textarea'&&n.props.name==='teacherComment')[0];assert.ok(objective);assert.ok(comment);assert.equal(objective.props.value,draft.objective);assert.equal(comment.props.value,draft.teacherComment);objective.props.onChange({target:{value:'Nuevo objetivo'}});comment.props.onChange({target:{value:'Aclaración visible'}});await view.flush();find(view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();const payload=calls.find(a=>a[2]?.operation.action==='save')[2].operation.payload;assert.equal(payload.objective,'Nuevo objetivo');assert.equal(payload.teacherComment,'Aclaración visible');assert.equal(payload.instructions,'Resolver');assert.equal(payload.aiGradingRubric,'');}finally{view.close();}
});
test('wall post title is text-safe and removed post hides title as well as body',()=>{const {WallContentView}=loadTsModule('apps/web/src/features/communication/ui/Wall.tsx');const content={title:'<script>literal title</script>',body:'Mensaje',authorName:'Docente',initials:'D',createdAt:'2026-11-05T10:00:00Z'};const heading=descendants(WallContentView({content}),n=>n.type==='h3')[0];assert.equal(text(heading),content.title);assert.equal(descendants(WallContentView({content:{...content,removedAt:'2026-11-05'}}),n=>n.type==='h3').length,0);});

test('new form creates once at explicit save, saves with returned revision and retains local content on retry',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx'),calls=[];let saves=0;
 const view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {api:{call:async(...a)=>{calls.push(a);if(a[2]?.operation.action==='create')return {id:'created-id',revision:'r2'};if(++saves===1)throw new Error('Temporary failure');return {revision:'r3'};}},room,data:{activity:{...draft,id:''},revision:'r1'},materials:[],onSaved:async()=>{},onClose(){}}));
 try{await view.flush();await reachReview(view);assert.equal(calls.length,0);find(view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();assert.deepEqual(calls.map(a=>a[2].operation.action),['create','save']);assert.equal(calls[1][2].revision,'r2');assert.equal(calls[1][2].operation.id,'created-id');find(view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(calls.filter(a=>a[2].operation.action==='create').length,1);assert.equal(calls.at(-1)[2].operation.payload.objective,draft.objective);assert.ok(calls.every(a=>a[2].operation.action!=='publish'));}finally{view.close();}
});
test('wall title validates code points before submit and replies omit title field',async()=>{
 const {TextForm}=loadTsModule('apps/web/src/features/communication/ui/Wall.tsx');const calls=[];
 const view=hookView(TextForm,{label:'Publicar aviso',initial:'Mensaje',withTitle:true,titleRequired:true,busy:false,onSave:async(...a)=>calls.push(a)});
 try{await view.flush();const submit=()=>find(view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});submit();await view.flush();assert.equal(calls.length,0);find(view,n=>n.type==='input'&&n.props.name==='title')[0].props.onChange({target:{value:'😀'.repeat(121)}});await view.flush();submit();assert.equal(calls.length,0);find(view,n=>n.type==='input')[0].props.onChange({target:{value:'😀'.repeat(120)}});await view.flush();submit();assert.equal(calls[0][1],'😀'.repeat(120));}finally{view.close();}
 const reply=hookView(TextForm,{label:'Responder',initial:'Respuesta',busy:false,onSave:async(...a)=>calls.push(a)});try{await reply.flush();assert.equal(find(reply,n=>n.type==='input'&&n.props.name==='title').length,0);find(reply,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});assert.equal(calls.at(-1)[1],undefined);}finally{reply.close();}
});
