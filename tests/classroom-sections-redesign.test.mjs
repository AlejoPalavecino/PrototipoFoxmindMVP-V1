import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const text = n => typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join(' ') : n?.props ? text(n.props.children) : '';
const nodes = (view, predicate) => descendants(view.tree, predicate);
const ports = { '../model/material-preview.ts': { canPreviewMaterial: () => true }, '../../../../../shared-ui/feedback.tsx': { Notice: ({ children }) => React.createElement('p', {}, children), Dialog: () => null, initials: (first, last) => first[0] + last[0] } };
const units = [{ id: 'u1', name: 'Seres vivos', topics: [{ id: 't1', name: 'Células' }, { id: 't2', name: 'Diversidad' }] }, { id: 'u2', name: 'Ambiente', topics: [{ id: 't3', name: 'Ecosistemas' }] }];

test('biblioteca combina búsqueda, unidad y tema localmente y recupera un destino profundo', async () => {
  const { Library } = componentWithPorts('apps/web/src/features/materials/ui/Library.tsx', ports);
  let calls = 0;
  const props = { room: { id: 'r', role: 'student', units }, api: { call: async () => { calls++; return [{ id: 'm1', title: 'Guía', unitId: 'u1', topicId: 't1', fileName: 'guia.pdf', ready: true }, { id: 'm2', title: 'Guía de diversidad', unitId: 'u1', topicId: 't2', fileName: 'diversidad.pdf', ready: true }]; }, fileUrl: id => id }, reload: async () => {} };
  const view = hookView(Library, props); await view.flush();
  try {
    const search=()=>nodes(view,n=>n.type==='input'&&n.props.type==='search')[0];
    search().props.onChange({target:{value:'Diversidad'}});await view.flush();
    assert.deepEqual(nodes(view, n => n.type === 'article').map(n => n.props['data-material-id']), ['m2']);
    props.targetMaterialId = 'm1';
    search().props.onChange({target:{value:'Diversidad '}});await view.flush();
    assert.deepEqual(nodes(view, n => n.type === 'article').map(n => n.props['data-material-id']), ['m1', 'm2']);
    assert.equal(calls, 1);
  } finally { view.close(); }
});

test('contexto de material sobrevive al escaneo y precarga el formulario sin publicar', async () => {
  const { Library } = componentWithPorts('apps/web/src/features/materials/ui/Library.tsx', ports);
  let consumed = 0; const writes = [];
  const context = { unitId: 'u1', topicIds: ['t2'] };
  const props = { room: { id: 'r', role: 'teacher', archived: false, units }, api: { call: async (...args) => { writes.push(args); return []; }, uploadClassroom: async () => ({ id: 'f', name: 'guia.pdf', ready: false, scan: 'PENDING' }), fileStatus: async id => { assert.equal(id, 'f'); return { id, name: 'guia.pdf', ready: true }; } }, reload: async () => {}, uploadContext: context, onUploadContextConsumed: () => { consumed++; props.uploadContext = null; } };
  const view = hookView(Library, props); await view.flush();
  try {
    const upload = nodes(view, n => n.type === 'input' && n.props.type === 'file')[0];
    assert.ok(nodes(view, n => n.type?.name === 'Dialog' && n.props.title === 'Agregar material')[0], 'Context opens the approved upload dialog');
    upload.props.onChange({ target: { files: [{ name: 'guia.pdf' }], value: 'guia.pdf' } }); await view.flush();
    assert.equal(nodes(view, n => n.type?.name === 'MaterialForm')[0].props.busy,true,'Pending security scan disables publication and retains editable metadata');
    assert.equal(writes.filter(([, method]) => method === 'POST').length, 0);
    nodes(view, n => n.type === 'button' && text(n) === 'Consultar revisión del material')[0].props.onClick(); await view.flush();
    const form = nodes(view, n => typeof n.type === 'function' && n.type.name === 'MaterialForm')[0];
    assert.deepEqual(form.props.initial, { title: '', unitId: 'u1', topicId: 't2' });
    assert.equal(consumed, 1);
    assert.equal(writes.filter(([, method]) => method === 'POST').length, 0);
  } finally { view.close(); }
});

test('alumnos e historial filtran nombres sin consultar ni modificar datos', async () => {
  const { ClassroomRoster } = componentWithPorts('apps/web/src/features/classrooms/ui/ClassroomRoster.tsx', ports);
  const members = [{ enrollmentId: 'e1', studentId: 's1', firstName: 'Lucía', lastName: 'Pérez' }, { enrollmentId: 'e2', studentId: 's2', firstName: 'Mateo', lastName: 'Díaz' }];
  const props = { tab: 'members', teacher: true, room: {}, members, history: [members[1]], memberResource: { status: 'ready' }, historyResource: { status: 'ready' } };
  const view = hookView(ClassroomRoster, props); await view.flush();
  try {
    const search = () => nodes(view, n => n.type === 'input' && n.props.type === 'search')[0];
    assert.ok(search()); search().props.onChange({ target: { value: '  LUCÍA  ' } }); await view.flush();
    assert.equal(nodes(view, n => n.type === 'li').length, 1); assert.match(text(view.tree), /Pérez/);
    props.tab = 'history'; search().props.onChange({ target: { value: '' } }); await view.flush();
    assert.match(text(view.tree), /Historial/); assert.equal(nodes(view, n => n.type === 'li').length, 1);
  } finally { view.close(); }
});

test('seguimiento abre solo identificadores reales por callbacks explícitos', async () => {
  const { Progress } = componentWithPorts('apps/web/src/features/grading/ui/Progress.tsx', ports);
  const opened = [];
  const data = { scope: 'member', currentMember: true, completion: { percentage: null }, performance: { average: null }, plan: { taught: 0, total: 0, percentage: null }, activities: [{ id: 'a1', title: 'Explorar', expected: true, grade: null }] };
  const props = { api: { call: async () => data }, classroomId: 'r', onOpenActivity: id => opened.push(id), onOpenStudent: id => opened.push(id) };
  const view = hookView(Progress, props); await view.flush();
  try {
    const button = nodes(view, n => n.type === 'button' && /Ver actividad/.test(text(n)))[0];
    assert.ok(button); button.props.onClick(); assert.deepEqual(opened, ['a1']);
    data.scope = 'classroom'; data.studentCount = 1; data.students = [{ studentId: 's1', firstName: 'Lucía', lastName: 'Pérez', completion: { percentage: null }, performance: { average: null } }];
    const classroom=hookView(Progress,{...props,classroomId:'r2'});try{await classroom.flush();nodes(classroom,n=>n.type==='button'&&text(n).startsWith('Ver ficha'))[0].props.onClick();assert.deepEqual(opened,['a1','s1']);}finally{classroom.close();}
  } finally { view.close(); }
});

test('configuración distingue borrador sin guardar del guardado confirmado y conserva conflictos', async () => {
  const { ClassroomSettings } = componentWithPorts('apps/web/src/features/classrooms/ui/ClassroomSettings.tsx', ports);
  const initial = { name: 'Biología', subject: 'Ciencias', division: '3 A', academicYear: 2026, aiGradingEnabled: false };
  let fail = false;
  const props = { id: 'r', room: { ...initial, revision: '1', archived: false }, isCurrentRoom: () => true, load: async () => {}, setNotice: () => {}, api: { call: async () => { if (fail) throw Error('conflict'); return { revision: '2' }; } }, action: async task => { try { await task(); } catch {} } };
  function Harness() {
    const [settings, setSettings] = React.useState(initial), [settingsRevision, setSettingsRevision] = React.useState('1'), [settingsConflict, setSettingsConflict] = React.useState(false);
    props.forceConflict = () => setSettingsConflict(true);
    return ClassroomSettings({ ...props, settings, setSettings, settingsRevision, setSettingsRevision, settingsConflict, setSettingsConflict });
  }
  const view = hookView(Harness, {}); await view.flush();
  const changeName = async value => { nodes(view, n => n.type === 'input' && n.props.value === 'Biología')[0].props.onChange({ target: { value } }); await view.flush(); };
  const save = async () => { nodes(view, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush(); };
  try {
    assert.match(text(view.tree), /No hay cambios pendientes/);
    await changeName('Biología avanzada');
    assert.match(text(view.tree), /Tenés cambios sin guardar/);
    fail = true; await save();
    assert.match(text(view.tree), /Tenés cambios sin guardar/);
    props.forceConflict(); await view.flush();
    assert.match(text(view.tree), /borrador se conserva/);
    fail = false; await save();
    assert.match(text(view.tree), /Cambios guardados/);
    assert.doesNotMatch(text(view.tree), /Tenés cambios sin guardar/);
  } finally { view.close(); }
});
