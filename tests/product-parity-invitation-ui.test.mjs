import test from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const app = 'apps/web/src/application/academic-Classrooms.tsx';
const panel = 'apps/web/src/features/classrooms/ui/PendingInvitations.tsx';
const invitation = {
  id: 'a1111111-1111-4111-8111-111111111111', name: 'Ciencias', teacher: 'Docente QA', subject: 'Ciencias',
  division: 'A', academicYear: 2026, expiresAt: '2026-12-01T12:00:00Z',
};
const other = { ...invitation, id: 'b2222222-2222-4222-8222-222222222222', name: 'Historia' };
const classroomId = 'c3333333-3333-4333-8333-333333333333';
const acceptedMessage = 'Ya sos parte de Ciencias. La encontrás en tus aulas.';
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) :
  Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const element = (view, predicate) => descendants(view.tree, predicate)[0];
const component = (view, name) => element(view, node => node.type?.name === name);
const button = (view, label) => element(view, node => node.type === 'button' && text(node) === label);

async function collection({ requestedInvitation = invitation.id.toUpperCase(), linked = true, navigate = async () => true, fail = false } = {}) {
  const { ClassroomsApp } = loadTsModule(app);
  const calls = [], resolved = [], entered = [];
  let pending = [invitation, other], study = [];
  const view = hookView(ClassroomsApp, {
    requestedInvitation: linked ? requestedInvitation : undefined, displayName: 'Estudiante QA', accountRole: 'student',
    onResolveInvitation: linked ? async (...args) => { resolved.push(args); return navigate(); } : undefined,
    onEnterClassroom: async id => { entered.push(id); return navigate(); },
    api: { call: async (path, method) => {
      calls.push([path, method]);
      if (method === 'POST') {
        if (fail) throw new Error('Problema de prueba');
        pending = [other];
        if (!path.endsWith('/accept')) return { ok: true };
        study = [{ id: classroomId, name: invitation.name }];
        return { id: classroomId };
      }
      if (path === '/invitations') return pending;
      return path === '/drafts' ? [] : { teach: [], study };
    } },
  });
  await view.flush();
  return { view, calls, resolved, entered, modal: () => component(view, 'PendingInvitations') };
}

test('Aceptar y unirme confirma adhesión y vuelve a Activas sin abrir el aula', async () => {
  const {view, calls, resolved, entered, modal} = await collection();
  try {
    assert.equal(calls.filter(([,method]) => method === 'POST').length, 0);
    await modal().props.onAccept(invitation); await view.flush();
    assert.deepEqual(resolved, [[acceptedMessage]]);
    assert.deepEqual(entered, []);
    assert.deepEqual(calls.filter(([,method]) => method === 'POST'), [[`/invitations/${invitation.id}/accept`, 'POST']]);
    assert.doesNotMatch(text(view.tree), /Esta invitación no está pendiente/);
  } finally { view.close(); }
});

test('Aceptar desde la colección vuelve a Activas y reinicia los filtros', async () => {
  const {view, entered, modal} = await collection({ linked: false });
  try {
    const original = component(view, 'ClassroomCollection');
    original.props.onSearch('archivo'); await view.flush();
    await modal().props.onAccept(invitation); await view.flush();
    assert.deepEqual(entered, []);
    const updated = component(view, 'ClassroomCollection');
    assert.notEqual(updated.key, original.key);
    assert.equal(updated.props.search, '');
    assert.deepEqual(updated.props.study.map(item => item.id), [classroomId]);
    assert.ok(text(view.tree).includes(acceptedMessage));
  } finally { view.close(); }
});

test('Rechazar un enlace confirmado limpia la selección, muestra éxito y actualiza notificaciones', async () => {
  const {view, resolved, entered, modal} = await collection({ navigate: async () => false });
  try {
    const before = component(view, 'AppNavbar').props.notifications.props.refresh;
    await modal().props.onDecline(invitation); await view.flush();
    assert.deepEqual(resolved, [['Invitación rechazada.']]);
    assert.deepEqual(entered, []);
    assert.match(text(view.tree), /Invitación rechazada/);
    assert.doesNotMatch(text(view.tree), /Esta invitación no está pendiente/);
    assert.deepEqual(modal().props.items, [other]);
    assert.equal(modal().props.requested, undefined);
    assert.equal(component(view, 'AppNavbar').props.notifications.props.refresh, before + 1);
  } finally { view.close(); }
});

test('Una respuesta fallida conserva el enlace y la invitación para reintentar', async () => {
  const {view, resolved, entered, modal} = await collection({fail: true});
  try {
    await assert.rejects(() => modal().props.onDecline(invitation), /Problema de prueba/);
    await view.flush();
    assert.deepEqual(resolved, []);
    assert.deepEqual(entered, []);
    assert.equal(modal().props.requested.toLowerCase(), invitation.id);
    assert.equal(modal().props.items[0].id, invitation.id);
    assert.doesNotMatch(text(view.tree), /Invitación rechazada/);
  } finally { view.close(); }
});

test('El selector abre la invitación solicitada sin escribir, incluso si el UUID llega en mayúsculas o cambia', async () => {
  const {PendingInvitations} = loadTsModule(panel);
  let request;
  const writes = [];
  const view = hookView(() => {
    const [requested, setRequested] = useState(invitation.id.toUpperCase());
    request = setRequested;
    return PendingInvitations({ requested, items: [invitation, other], onAccept: async item => writes.push(item), onDecline: async item => writes.push(item) });
  }, {});
  try {
    await view.flush();
    assert.match(text(component(view, 'Dialog')), /Ciencias/);
    component(view, 'Dialog').props.onClose(); await view.flush();
    assert.equal(component(view, 'Dialog'), undefined);
    request(other.id.toUpperCase()); await view.flush();
    assert.match(text(component(view, 'Dialog')), /Historia/);
    assert.deepEqual(writes, []);
    button(view, 'Aceptar y unirme').props.onClick();
    button(view, 'Aceptar y unirme').props.onClick();
    await view.flush();
    assert.deepEqual(writes, [other]);
  } finally { view.close(); }
});

test('Un fallo al confirmar mantiene abierto el diálogo y deja reintentar la misma respuesta', async () => {
  const { PendingInvitations } = loadTsModule(panel);
  let calls = 0;
  const view = hookView(PendingInvitations, {
    requested: invitation.id, items: [invitation],
    onDecline: async () => assert.fail('No se eligió rechazar'),
    onAccept: async item => {
      assert.equal(item.id, invitation.id);
      if (++calls === 1) throw new Error('Conexión interrumpida');
    },
  });
  try {
    await view.flush();
    button(view, 'Aceptar y unirme').props.onClick(); await view.flush();
    assert.match(text(component(view, 'Dialog')), /No pudimos confirmar tu respuesta/);
    assert.equal(button(view, 'Aceptar y unirme').props.disabled, false);
    button(view, 'Aceptar y unirme').props.onClick(); await view.flush();
    assert.equal(component(view, 'Dialog'), undefined);
    assert.equal(calls, 2);
  } finally { view.close(); }
});

test('La pantalla resuelve el enlace con reemplazo de la ruta, no con una segunda entrada de historial', async () => {
  const routeCalls = [];
  const router = { isReady: true, asPath: `/mis-aulas?invitacion=${invitation.id}`,
    replace: async href => { routeCalls.push(['replace', href]); return true; },
    push: async href => { routeCalls.push(['push', href]); return true; },
  };
  const { ClassroomsScreen } = loadTsModule('apps/web/src/screens/classrooms-screen.tsx', { stubs: {
    'next/router': { useRouter: () => router },
    '../features/identity/index.ts': { createAccountClient: () => ({ session: async () => ({
      authenticated: true, user: { id: 'student', emailVerified: true, accountRole: 'student' },
    }) }) },
    '../application/academic-useAgendaTarget.ts': { useAgendaTarget: () => ({}) },
  } });
  let refresh;
  const view = hookView(() => {
    const [, redraw] = useState(0);
    refresh = () => redraw(value => value + 1);
    return ClassroomsScreen({});
  }, {});
  try {
    await view.flush();
    const props = component(view, 'ClassroomsApp').props;
    await props.onResolveInvitation(acceptedMessage);
    assert.deepEqual(routeCalls, [['replace', '/mis-aulas']]);
    router.asPath = '/mis-aulas';
    refresh(); await view.flush();
    assert.equal(component(view, 'ClassroomsApp').props.navigationNotice, acceptedMessage);
    assert.equal(component(view, 'ClassroomsApp').props.requestedInvitation, undefined);
    assert.equal(await props.onResolveInvitation('Una respuesta anterior'), false);
    assert.deepEqual(routeCalls, [['replace', '/mis-aulas']]);
  } finally { view.close(); }
});

test('el diálogo muestra portada real, grupo y beneficios sin acción extra de rechazo', async () => {
 const {PendingInvitations}=loadTsModule(panel);
 const writes=[];const view=hookView(PendingInvitations,{items:[{...invitation,coverKey:'math'}],requested:invitation.id,onAccept:async item=>writes.push(item),onDecline:async()=>assert.fail()});
 try {await view.flush();const dialog=component(view,'Dialog');assert.equal(dialog.props.title,'Hay un lugar para vos');
 assert.match(text(dialog),/Tu docente/);assert.match(text(dialog),/Ciclo 2026/);assert.match(text(dialog),/Materiales y actividades/);
 assert.equal(descendants(dialog,n=>n.type==='img')[0].props.src,'/foxmind/math.webp');
 assert.equal(button(view,'Rechazar invitación'),undefined);button(view,'Ahora no').props.onClick();await view.flush();assert.deepEqual(writes,[]);assert.equal(component(view,'Dialog'),undefined);
 }finally{view.close();}
});

test('código consulta preview real y confirmación vuelve a Activas sin entrar al interior', async () => {
 const {ClassroomsApp}=loadTsModule(app);const calls=[],entered=[];
 const view=hookView(ClassroomsApp,{displayName:'QA',accountRole:'student',onEnterClassroom:async id=>entered.push(id),api:{call:async(path,method,body)=>{
  calls.push([path,method,body]);if(path==='/codes/preview')return {confirmation:'opaque-confirmation',classroom:{...invitation,coverKey:'math'}};
  if(path==='/codes/confirm')return {id:classroomId};return path===''?{teach:[],study:[]}:[];
 }}});
 try {await view.flush();component(view,'ClassroomCollectionHero').props.onJoin();await view.flush();
 assert.equal(component(view,'Dialog').props.title,'Un nuevo lugar para aprender');
 element(view,n=>n.type==='input'&&n.props.autoComplete==='off').props.onChange({target:{value:'123 456'}});await view.flush();
 element(view,n=>n.type==='form').props.onSubmit({preventDefault(){}});await view.flush();
 assert.deepEqual(calls.find(([p])=>p==='/codes/preview')[2],{code:'123456'});
 assert.equal(component(view,'Dialog').props.title,'Hay un lugar para vos');
 assert.equal(component(view,'InvitationPreview').props.classroom.coverKey,'math');
 assert.equal(calls.filter(([p])=>p==='/codes/confirm').length,0);
 const before=component(view,'ClassroomCollection');element(view,n=>n.type==='form').props.onSubmit({preventDefault(){}});await view.flush();
 assert.deepEqual(calls.find(([p])=>p==='/codes/confirm')[2],{confirmation:'opaque-confirmation'});
 assert.deepEqual(entered,[]);assert.equal(component(view,'Dialog'),undefined);assert.notEqual(component(view,'ClassroomCollection').key,before.key);assert.match(text(view.tree),/Ya sos parte de Ciencias/);
 }finally{view.close();}
});

test('guardar y salir confirmado abre Borradores con éxito sin publicar', async () => {
 const {ClassroomsApp}=loadTsModule(app); const calls=[]; const draft={id:'saved-draft',revision:1,payload:{name:'Mi borrador'}};
 const view=hookView(ClassroomsApp,{displayName:'QA',accountRole:'teacher',api:{call:async(path,method)=>{calls.push([path,method]);return path===''?{teach:[],study:[]}:path==='/drafts'&&method==='POST'?draft:path==='/drafts'?[draft]:[];}}});
 try {await view.flush();component(view,'ClassroomCollectionHero').props.onCreate();await view.flush();
 const wizard=element(view,n=>typeof n.props.onPublished==='function'); assert.ok(wizard);
 wizard.props.onExit();await view.flush();
 assert.equal(component(view,'ClassroomCollection').props.initialState,'pending');
 const success=element(view,n=>n.props['data-notice-kind']==='success');assert.ok(success);assert.match(text(success),/Borrador guardado/);
 assert.equal(calls.some(([p])=>p.includes('publish')),false);
 }finally{view.close();}
});

test('avisos informativos externos no se anuncian como éxito', async () => {
 const {ClassroomsApp}=loadTsModule(app);
 const view=hookView(ClassroomsApp,{displayName:'QA',accountRole:'teacher',navigationNotice:'Ya no tenés acceso al aula',api:{call:async path=>path===''?{teach:[],study:[]}:[]}});
 try {await view.flush();assert.equal(element(view,n=>n.props['data-notice-kind']==='success'),undefined);assert.match(text(view.tree),/Ya no tenés acceso/);}finally{view.close();}
});

test('navegar desde Inicio conserva Borradores y el tipo de aviso sin filtrar a otra cuenta', async () => {
 let accountId='teacher';const routes=[];
 const router={isReady:true,asPath:'/inicio',replace:async()=>true,push:async href=>{routes.push(href);return true;}};
 const {ClassroomsScreen}=loadTsModule('apps/web/src/screens/classrooms-screen.tsx',{stubs:{
  'next/router':{useRouter:()=>router},
  '../features/identity/index.ts':{createAccountClient:()=>({session:async()=>({authenticated:true,user:{id:accountId,emailVerified:true,accountRole:'teacher'}})})},
  '../application/academic-useAgendaTarget.ts':{useAgendaTarget:()=>({})},
 }});
 let view=hookView(ClassroomsScreen,{initialPresentation:'home'});
 try {await view.flush();component(view,'ClassroomsApp').props.onNavigate('classrooms','Borrador guardado',{kind:'success',collectionState:'pending'});await view.flush();assert.deepEqual(routes,['/mis-aulas']);}
 finally{view.close();}
 router.asPath='/mis-aulas';view=hookView(ClassroomsScreen,{});
 try {await view.flush();const props=component(view,'ClassroomsApp').props;assert.equal(props.navigationNotice,'Borrador guardado');assert.deepEqual(props.navigationFeedback,{kind:'success',collectionState:'pending'});
 props.onNavigate('classrooms','Privado',{kind:'success',collectionState:'pending'});await view.flush();}
 finally{view.close();}
 accountId='other-teacher';view=hookView(ClassroomsScreen,{});
 try {await view.flush();const props=component(view,'ClassroomsApp').props;assert.equal(props.navigationNotice,'');assert.equal(props.navigationFeedback,undefined);}
 finally{view.close();}
});
