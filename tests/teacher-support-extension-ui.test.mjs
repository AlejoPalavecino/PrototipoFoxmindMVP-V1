import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const studyPath = 'apps/web/src/features/study/workspace/StudySharedStrategyDialog.tsx';
const writingPath = 'apps/web/src/features/teacher-support/TeacherWritingPanel.tsx';
const button = (view, label) => descendants(view.tree,node=>node.type==='button' && (node.props['aria-label'] ?? node.props.children)===label)[0];
const field = (view, type) => descendants(view.tree,node=>node.type===type)[0];
const valueText = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(valueText).join(' ') : valueText(node?.props?.children ?? '');

test('only the confirmed, exact strategy is shared with the selected linked classroom and withdrawal identifies it',async()=>{
  const {StudySharedStrategyDialog}=loadTsModule(studyPath);
  const exact='  Me sirve comparar dos ejemplos.\nDespués hago uno por mi cuenta.  ';
  const calls=[];
  const strategy={id:'strategy',classroomId:'room',text:exact};
  const client={
    sharedStrategy:async()=>({strategy:null}),
    shareStrategy:async(...args)=>{calls.push(['put',...args.slice(0,2)]);return {strategy};},
    withdrawStrategy:async(...args)=>{calls.push(['delete',...args.slice(0,2)]);return{strategy:null};}
  };
  const view=hookView(StudySharedStrategyDialog,{client,folderId:'folder',room:{id:'room',name:'Lengua'},onClose(){}});
  try{
    await view.flush();
    field(view,'textarea').props.onChange({target:{value:exact}});
    field(view,'input').props.onChange();
    await view.flush();
    button(view,'Revisar texto').props.onClick();
    await view.flush();
    assert.deepEqual(calls,[]);
    assert.equal(field(view,'blockquote').props.children,exact);
    button(view,'Confirmar y compartir').props.onClick();
    await view.flush();
    assert.deepEqual(calls,[['put','folder',{classroomId:'room',text:exact}]]);
    button(view,'Retirar estrategia').props.onClick();
    await view.flush();
    assert.equal(calls.length,1);
    button(view,'Confirmar retiro').props.onClick();
    await view.flush();
    assert.deepEqual(calls[1],['delete','folder','strategy']);
  }finally{view.close();}
});

test('writing only generates on explicit action and never presents a stale finding',async()=>{
  const {TeacherWritingPanel}=loadTsModule(writingPath);
  let reads=0,requests=0; const opened=[];
  const source={activityId:'source',attemptId:'attempt',title:'Reseña'};
  const report={strengths:[{text:'Usa un ejemplo concreto.',sources:[source]}],improvements:[],nextStep:null};
  const client={
    writing:async()=>{reads++;return {state:'STALE',report,generatedAt:null,error:null};},
    requestWriting:async()=>{requests++;return {state:'READY',report,generatedAt:'2026-11-19T15:00:00Z',error:null};}
  };
  const view=hookView(TeacherWritingPanel,{client,student:{classroomId:'room',studentId:'student'},onEvidence:id=>opened.push(id),onRevoked(){assert.fail();}});
  try{
    await view.flush();
    assert.equal(reads,1);
    assert.equal(requests,0);
    assert.equal(descendants(view.tree,node=>node.type?.name==='WritingFindings').length,0);
    button(view,'Generar análisis').props.onClick();
    await view.flush();
    assert.equal(requests,1);
    const findings=descendants(view.tree,node=>node.type?.name==='WritingFindings');
    const rendered=findings.map(finding=>finding.type(finding.props));
    assert.match(valueText(rendered),/Usa un ejemplo concreto/);
    button({tree:rendered},'Leer entrega · Reseña').props.onClick();
    assert.deepEqual(opened,['attempt']);
  }finally{view.close();}
});

test('a focused teacher record revalidates shared strategies without asking for new analysis', async () => {
  const {TeacherSupportDialog}=loadTsModule('apps/web/src/features/teacher-support/TeacherSupportDialog.tsx');
  const previous=globalThis.window;
  globalThis.window=new EventTarget();
  let reads=0;
  const student={classroomId:'room',studentId:'a',firstName:'Ana',lastName:'Prueba'};
  const client={record:async()=>{
    reads++;
    return {...student,sharedStrategies:reads===1?[{id:'strategy',text:'Exacto'}]:[]};
  },writing:async()=>assert.fail('focus does not open analysis'),requestWriting:async()=>assert.fail('focus does not use AI'),writingEvidence:async()=>assert.fail()};
  const view=hookView(TeacherSupportDialog,{client,student,onClose(){},onRevoked(){assert.fail();}});
  const content=()=>descendants(view.tree,node=>node.type?.name==='SupportRecordContent')[0];
  try{
    await view.flush();
    assert.deepEqual(content().props.record.sharedStrategies,[{id:'strategy',text:'Exacto'}]);
    window.dispatchEvent(new Event('focus'));
    await view.flush();
    assert.equal(reads,2);
    assert.deepEqual(content().props.record.sharedStrategies,[]);
  }finally{view.close();globalThis.window=previous;}
});

test('a withdrawal conflict requires a fresh read and leaves the replacement unsent', async () => {
  const {StudySharedStrategyDialog}=loadTsModule(studyPath);
  let reads=0, withdrawals=0;
  const client={
    sharedStrategy:async()=>({strategy:{id:'strategy-'+(++reads),classroomId:'room',text:reads===1?'Anterior':'Nuevo'}}),
    shareStrategy:async()=>assert.fail(),
    withdrawStrategy:async()=>{withdrawals++;throw Object.assign(Error(),{status:409});},
  };
  const view=hookView(StudySharedStrategyDialog,{client,folderId:'folder',room:{id:'room',name:'Lengua'},onClose(){}});
  try{
    await view.flush();
    button(view,'Retirar estrategia').props.onClick();await view.flush();
    button(view,'Confirmar retiro').props.onClick();await view.flush();
    assert.equal(!!button(view,'Confirmar retiro'),false);
    button(view,'Actualizar estrategia').props.onClick();await view.flush();
    assert.equal(field(view,'blockquote').props.children,'Nuevo');
    assert.deepEqual([reads,withdrawals],[2,1]);
  }finally{view.close();}
});

test('a focus retry fails visibly when the first record has not loaded yet', async () => {
  const {TeacherSupportDialog}=loadTsModule('apps/web/src/features/teacher-support/TeacherSupportDialog.tsx');
  const previous=globalThis.window;
  globalThis.window=new EventTarget();
  let reads=0;
  const student={classroomId:'room',studentId:'a',firstName:'Ana',lastName:'Prueba'};
  const client={record:async()=>{
    if(++reads===1)return new Promise(()=>{});
    throw Object.assign(Error(),{status:503});
  }};
  const view=hookView(TeacherSupportDialog,{client,student,onClose(){},onRevoked(){assert.fail();}});
  try{
    await view.flush();
    window.dispatchEvent(new Event('focus'));
    await view.flush();
    assert.equal(reads,2);
    assert.ok(button(view,'Reintentar'));
  }finally{view.close();globalThis.window=previous;}
});
