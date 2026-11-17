import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const base = 'apps/web/src/features/classrooms/ui/';
const room = { id: 'room', name: 'Aula sintética', subject: 'Materia', division: 'A', academicYear: 2026,
  coverKey: 'biology', aiGradingEnabled: true, revision: '3', archived: false, role: 'teacher' };
const noop = () => {};
const props = { room, id: room.id, busy: false, teacher: true, tab: 'members', members: [], history: [],
  memberResource: {status:'ready'}, historyResource: {status:'ready'}, roster: {current:null},
  setInviting: noop, setSummary: noop, setConfirm: noop, action: task => task(), isCurrentRoom: () => true };

test('wall uses reference list without filters and archived classrooms have no publishing action', async () => {
  const { Wall } = loadTsModule('apps/web/src/features/communication/ui/Wall.tsx');
  for (const archived of [false,true]) {
    const view=hookView(Wall,{room:{...room,archived},api:{call:async()=>({revision:'1',posts:[],nextCursor:null})},reload:async()=>{}});
    try { await view.flush();
      assert.equal(descendants(view.tree,n=>n.props['aria-label']==='Filtrar publicaciones').length,0);
      const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):text(n?.props?.children??'');
      assert.equal(descendants(view.tree,n=>n.type==='button'&&text(n).includes('Publicar aviso')).length,archived?0:1);
    }finally{view.close();}
  }
});

test('wall composing opens the reference role dialog and posting action', async () => {
  const { Wall } = loadTsModule('apps/web/src/features/communication/ui/Wall.tsx');
  const view=hookView(Wall,{room,api:{call:async()=>({revision:'1',posts:[],nextCursor:null})},reload:async()=>{}});
  try { await view.flush();
    descendants(view.tree,n=>n.type==='button'&&n.props.className==='primary')[0].props.onClick(); await view.flush();
    const dialog=descendants(view.tree,n=>n.type?.name==='Dialog')[0];
    assert.equal(dialog.props.title,'Una idea para tu grupo');
    assert.equal(descendants(dialog,n=>n.type?.name==='TextForm')[0].props.label,'Publicar mensaje');
  } finally {view.close();}
});

test('reply dialog preserves permissions and closes after confirmed save even if refresh fails', async () => {
  const { Wall } = loadTsModule('apps/web/src/features/communication/ui/Wall.tsx');
  const post={id:'post',authorName:'Docente sintético',initials:'DS',body:'Mensaje',createdAt:'2026-11-16T12:00:00Z',editedAt:null,removedAt:null,
    canEdit:false,canRemove:false,type:'NOTICE',replies:[],replyCount:0,repliesNextCursor:null,repliesPreviousCursor:null};
  const calls=[];
  const previous=globalThis.requestAnimationFrame; globalThis.requestAnimationFrame=fn=>fn();
  const view=hookView(Wall,{room:{...room,role:'student'},api:{call:async(path,method,body)=>{calls.push({method,body});return {revision:'1',posts:[post],nextCursor:null};}},reload:async()=>{throw Error('refresh unavailable');}});
  try {await view.flush();
    assert.equal(descendants(view.tree,n=>n.type==='button'&&/Editar|Eliminar/.test(n.props['aria-label']??'')).length,0);
    descendants(view.tree,n=>n.props['data-reply-trigger']==='post')[0].props.onClick(); await view.flush();
    const dialog=descendants(view.tree,n=>n.type?.name==='Dialog'&&n.props.title==='Continuar la conversación')[0];
    assert.ok(dialog); await descendants(dialog,n=>n.type?.name==='TextForm')[0].props.onSave('Respuesta sintética'); await view.flush();
    assert.equal(calls.filter(c=>c.method==='POST').length,1);
    assert.deepEqual(calls.find(c=>c.method==='POST').body,{revision:'1',operation:{action:'reply',postId:'post',body:'Respuesta sintética'}});
    assert.equal(descendants(view.tree,n=>n.type?.name==='Dialog').length,0);
  } finally {view.close(); globalThis.requestAnimationFrame=previous;}
});

test('people match role rows, hide incidental search/email, and mark self only from explicit identity', () => {
  const { ClassroomRoster } = loadTsModule('apps/web/src/features/classrooms/members/ClassroomRoster.tsx');
  const members = [{ firstName:'Alex', lastName:'Prueba', studentId:'one', email:'synthetic@example.test', isSelf:false },
    { firstName:'Alex', lastName:'Prueba', studentId:'two', isSelf:true }];
  const teacher = renderToStaticMarkup(React.createElement(ClassroomRoster, {...props,members}));
  assert.match(teacher, /Aprendemos en grupo/); assert.match(teacher, /Ver ficha/);
  assert.doesNotMatch(teacher, /type="search"|synthetic@example/);
  const student = renderToStaticMarkup(React.createElement(ClassroomRoster, {...props,members,teacher:false}));
  assert.match(student, /Tu grupo/); assert.equal((student.match(/<small>Vos<\/small>/g)||[]).length,1);
  assert.doesNotMatch(student, /Ver ficha|Invitar estudiantes|synthetic@example/);
});

test('settings only edit reference fields and preserve persisted year and AI state when saving', async () => {
  const { ClassroomSettings } = loadTsModule('apps/web/src/features/classrooms/settings/ClassroomSettings.tsx');
  const calls=[];
  const view=hookView(ClassroomSettings,{...props,settings:{name:room.name,subject:room.subject,division:room.division,academicYear:2026,coverKey:'math',aiGradingEnabled:true},
    settingsRevision:'3',api:{call:async(...args)=>{calls.push(args);return {revision:'4'};}},setSettings:noop,
    setSettingsRevision:noop,setSettingsConflict:noop,setNotice:noop,load:async()=>{},reloadSettings:async()=>{}});
  try {
    await view.flush();
    const inputs=descendants(view.tree,node=>node.type==='input');
    assert.equal(inputs.filter(n=>n.props.type==='number'||n.props.type==='checkbox').length,0);
    assert.deepEqual(inputs.filter(n=>n.props.type==='radio').map(n=>n.props.value),['literature','biology','math']);
    descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({preventDefault:noop}); await view.flush();
    assert.equal(calls[0][2].academicYear,2026); assert.equal(calls[0][2].aiGradingEnabled,true); assert.equal(calls[0][2].coverKey,'math');
  } finally {view.close();}
});

test('sticky settings submit remains disabled outside the fieldset for archived rooms or pending saves', () => {
  const { ClassroomSettings }=loadTsModule('apps/web/src/features/classrooms/settings/ClassroomSettings.tsx');
  for(const state of [{busy:true,room},{busy:false,room:{...room,archived:true}}]) {
    const markup=renderToStaticMarkup(React.createElement(ClassroomSettings,{...props,...state,settings:room,settingsRevision:'3'}));
    assert.match(markup, /type="submit" disabled=""/);
    assert.match(markup, /<fieldset disabled=""/);
  }
});

test('members student projection distinguishes homonyms without leaking peer IDs, emails or periods', async () => {
  const { membersOperation }=loadTsModule('apps/api/src/modules/classrooms/infrastructure/memberships-operations-2.ts');
  const rows=['self','other','former'].map((id,i)=>({student_id:id,enrollment_id:id,first_name:'Alex',last_name:'Prueba',email:id+'@example.test',active:i<2}));
  let queries=0;
  const capability={run:async(request,_write,fn)=>fn({query:async()=>{queries++;return rows;}},{id:request}),
    classroom:async(_tx,actor,_id,_write,history)=>{if(actor.id==='stranger'||history)throw Object.assign(new Error('Forbidden'),{code:'FORBIDDEN'});return {teacher_id:'teacher'};}};
  assert.deepEqual(await membersOperation(capability,'self','room'),[
    {firstName:'Alex',lastName:'Prueba',isSelf:true},{firstName:'Alex',lastName:'Prueba',isSelf:false}]);
  await assert.rejects(membersOperation(capability,'stranger','room'),{code:'FORBIDDEN'});
  await assert.rejects(membersOperation(capability,'self','room',true),{code:'FORBIDDEN'});
  assert.equal(queries,1);
});
