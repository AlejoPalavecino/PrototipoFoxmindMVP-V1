import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { deferred, descendants, hookView } from './agenda-ui-helpers.test.mjs';

const feature = 'apps/web/src/features/teacher-support';
const classrooms = [{id:'one',name:'Fotografía y luz',division:'3.º A',coverKey:'books'},{id:'two',name:'Biología',division:'2.º B',coverKey:'science'}];
const student = {classroomId:'one',classroomName:classrooms[0].name,studentId:'a',firstName:'Tomás',lastName:'Prueba',priority:'high',pending:[{activityId:'one',title:'Encuadre',deadlineAt:'2026-10-30T18:00:00Z'}]};
const noEvidence = {...student,studentId:'b',firstName:'Ada',priority:'insufficient',pending:[]};
const record = {...student,completion:{expected:2,delivered:0},performance:{average:'0',graded:2},
  grades:[{activityId:'one',title:'Encuadre',grade:'0'},{activityId:'two',title:'Luz',grade:'0'}],
  observations:[{activityId:'two',attemptId:'attempt',title:'Luz',strengths:['Describió dos planos.'],improvements:[],nextStep:null,feedback:null}],evaluatedAt:'2026-11-18T18:00:00Z'};
const list = (items, total = items.length, page = 1) => ({classrooms,counts:{high:total,medium:0,low:0},items,total,page,pageSize:1});
const button = (view, label) => descendants(view.tree,node=>node.type==='button' && (node.props['aria-label'] ?? node.props.children)===label)[0];
const component = (view, name) => descendants(view.tree,node=>node.type?.name===name)[0];

test('the widget filters by room, ignores stale requests and never lists insufficient evidence', async () => {
  const { TeacherSupportWidget } = loadTsModule(feature + '/TeacherSupportWidget.tsx');
  const slow = deferred();
  const client = {list:async room => room==='two'?slow.promise:list([student,noEvidence])};
  const view = hookView(TeacherSupportWidget,{client});
  try {
    await view.flush();
    assert.ok(button(view,'Ver ficha de Tomás Prueba en Fotografía y luz'));
    assert.equal(button(view,'Ver ficha de Ada Prueba en Fotografía y luz'),undefined);
    button(view,'Filtrar por aula').props.onClick();
    await view.flush();
    component(view,'SupportPicker').props.onSelect('two');
    await view.flush();
    assert.equal(button(view,'Ver ficha de Tomás Prueba en Fotografía y luz'),undefined);
    button(view,'Filtrar por aula').props.onClick();
    await view.flush();
    component(view,'SupportPicker').props.onSelect(null);
    await view.flush();
    slow.resolve(list([{...student,firstName:'Otro',classroomId:'two',classroomName:'Biología'}]));
    await view.flush();
    assert.ok(button(view,'Ver ficha de Tomás Prueba en Fotografía y luz'));
    assert.equal(button(view,'Ver ficha de Otro Prueba en Biología'),undefined);
  } finally { view.close(); }
});

test('record and reading use their own requests, and access removal invalidates the current record', async () => {
  const { TeacherSupportDialog } = loadTsModule(feature + '/TeacherSupportDialog.tsx');
  let revoked=0, evidenceCalls=0;
  const client={record:async()=>record,evidence:async(room,id,attempt)=>{
    evidenceCalls++;
    assert.deepEqual([room,id,attempt],['one','a','attempt']);
    throw Object.assign(Error(),{status:403});
  }};
  const view=hookView(TeacherSupportDialog,{client,student,onClose(){},onRevoked(){revoked++;}});
  try {
    await view.flush();
    assert.equal(evidenceCalls,0);
    const content=component(view,'SupportRecordContent');
    assert.equal(content.props.record.performance.average,'0');
    content.props.onEvidence('attempt');
    await view.flush();
    assert.equal(evidenceCalls,1);
    assert.equal(revoked,1);
    assert.equal(component(view,'SupportRecordContent'),undefined);
  } finally { view.close(); }
});

test('retrying the reading does not independently refresh the underlying record', async () => {
  const { TeacherSupportDialog } = loadTsModule(feature + '/TeacherSupportDialog.tsx');
  let records=0, attempts=0;
  const client={record:async()=>{records++;return record;},evidence:async()=>{
    attempts++;
    if(attempts===1)throw Object.assign(Error(),{status:503});
    return {activityId:'two',attemptId:'attempt',title:'Luz',instructions:'Explicá tu elección.',submittedAt:'2026-11-13T18:00:00Z',timeZone:'America/Argentina/Buenos_Aires',grade:'0',feedback:null,texts:[{prompt:null,text:'Elegí dos planos.'}]};
  }};
  const view=hookView(TeacherSupportDialog,{client,student,onClose(){},onRevoked(){assert.fail('transient error is not a revocation');}});
  try {
    await view.flush();
    component(view,'SupportRecordContent').props.onEvidence('attempt');
    await view.flush();
    button(view,'Reintentar').props.onClick();
    await view.flush();
    assert.equal(attempts,2);
    assert.equal(records,1);
    assert.equal(component(view,'SupportEvidence').props.evidence.grade,'0');
    button(view,'Volver a la ficha').props.onClick();
    await view.flush();
    assert.equal(records,2);
  } finally { view.close(); }
});

test('roster collects paginated results only for the students in the active class', async () => {
  const { useRosterSupport } = loadTsModule(feature + '/use-roster-support.ts');
  const calls=[];
  const client={list:async(room,page,_signal,roster)=>{
    calls.push([room,page,roster]);
    const support=page===1?student:noEvidence;
    return list([support,{...support,classroomId:'private',studentId:'private'}],2,page);
  }};
  const view=hookView(()=>useRosterSupport(client,'one','a,b',0),{});
  try {
    await view.flush();
    assert.deepEqual(calls,[['one',1,true],['one',2,true]]);
    assert.deepEqual([...view.tree.keys()],['a','b']);
    assert.equal(view.tree.get('b').priority,'insufficient');
  } finally { view.close(); }
});
