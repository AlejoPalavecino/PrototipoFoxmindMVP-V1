import surface from '../apps/classrooms-ui/classrooms-surface.module.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClassroomView } from '../apps/classrooms-ui/ClassroomView.tsx';
import { AppNavbar } from '../apps/shared-ui/AppNavbar.tsx';
import '../apps/shared-ui/design-tokens.css';
import '../apps/web/styles/globals.css';
import '../apps/classrooms-ui/styles.css';
import '../apps/shared-ui/folders.css';
import '../apps/shared-ui/foxmind-3d.css';
import '../apps/shared-ui/workspace.css';
const roomId = 'a1111111-1111-4111-8111-111111111111';
const secondId = 'd1111111-1111-4111-8111-111111111111';
const postId = 'b1111111-1111-4111-8111-111111111111';
const replyId = 'c1111111-1111-4111-8111-111111111111';
const state = window.auditFixture = { calls: [], role: 'teacher', inviteFail: true, revision: '1', conflict: false, rosterFail: false, holdRoom: false, detailFail: false, pending: [] };
const summaryScenario = new URLSearchParams(window.location.search).get('scenario') === 'summary';
let releaseRemoval;
const detail = (id = roomId) => ({ id, name: id === roomId ? 'Aula sintética' : 'Aula segunda', subject: 'Matemática', division: 'A', academicYear: 2026, timezone: 'UTC', coverKey: 'explore', archived: false, teacher: 'Docente Fixture', role: state.role, revision: state.revision, units: [], plans: [] });
const content = (id, body) => ({ id, body, authorName: 'Persona Fixture', initials: 'PF', createdAt: '2026-01-01T00:00:00Z', editedAt: null, removedAt: null, canEdit: false, canRemove: false });
const post = { ...content(postId, 'Hilo sintético objetivo'), type: 'NOTICE', replies: [content(replyId, 'Respuesta objetivo lejana')], replyCount: 45, repliesNextCursor: null, repliesPreviousCursor: 'earlier' };
const api = { fileUrl: () => '#', call: async (path, method, body, signal) => {
  state.calls.push({ path, method: method ?? 'GET', body });
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
  if (path === `/${roomId}` || path === `/${secondId}`) { if (state.detailFail) throw new Error('Detalle temporalmente no disponible'); const snapshot = detail(path.slice(1)); if (state.holdRoom) return await new Promise(resolve => state.pending.push(() => resolve(snapshot))); return snapshot; }
  if (summaryScenario && path.endsWith('/remove') && method === 'POST') {
    if (state.deferRemoval) {
      state.removalPending = true;
      await new Promise(resolve => { releaseRemoval = resolve; });
      state.removalPending = false;
    }
    state.removed = true;
    return {};
  }
  if (path.endsWith('/members') && state.rosterFail) throw new Error('Alumnos temporalmente no disponibles');
  if (path.endsWith('/members')) return [
    { studentId: 'student-1', firstName: 'Ada', lastName: 'Prueba', periods: [] },
    ...(summaryScenario && state.removed ? [{ studentId: 'student-2', firstName: 'Bea', lastName: 'Prueba', periods: [] }] : []),
  ];
  if (path.endsWith('/history')) return [{ studentId: 'student-2', firstName: 'Bea', lastName: 'Historial', periods: [] }];
  if (path.endsWith('/invitations')) { if (state.inviteFail) throw new Error('Invitaciones temporalmente no disponibles'); return []; }
  if (path.endsWith('/settings')) { if (state.conflict) throw Object.assign(new Error('Conflicto sintético'), { code: 'CONFLICT', status: 409 }); state.revision = '2'; return { revision: '2' }; }
  if (path.includes('/wall/') && !path.includes('/replies')) return { revision: '1', post };
  if (path.includes('/wall') && path.includes('/replies')) return { revision: '1', postId, replies: post.replies, nextCursor: null, previousCursor: null };
  if (path.includes('/wall')) return { revision: '1', posts: [], nextCursor: null };
  throw new Error(`Ruta sintética no implementada: ${path}`);
} };
function SummaryApp() {
  window.auditControl = {
    deferRemoval: () => { state.deferRemoval = true; },
    releaseRemoval: () => {
      if (!state.removalPending || !releaseRemoval) throw new Error('No removal pending');
      const release = releaseRemoval; releaseRemoval = undefined; release();
    },
  };
  return <div className="fm3d-theme" data-qa-fixture="true"><div className={`p5-app fm3-classrooms classroom-interior-reference ${surface.scope}`}>
    <AppNavbar logoHref="/mis-aulas" displayName="Docente Fixture" links={[{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas', current: true }, { href: '/agenda', label: 'Agenda' }]} />
    <main id="classroom-main" className="p5-main"><ClassroomView api={api} id={roomId} initialCode={null} onExit={() => {}} /></main>
  </div></div>;
}
function App() {
  const [variant, setVariant] = useState(0), [target, setTarget] = useState(null), [currentRoom, setCurrentRoom] = useState(roomId);
  window.auditControl = { setRoom: id => setCurrentRoom(id), releasePending: () => state.pending.splice(0).forEach(fn => fn()), showTeacher: () => { state.role = 'teacher'; setTarget(null); setVariant(x => x + 1); }, showStudent: () => { state.role = 'student'; setTarget(null); setVariant(x => x + 1); }, showTarget: () => { setTarget({ classroomId: roomId, postId, replyId }); setVariant(x => x + 1); }, refresh: () => setVariant(x => x + 1) };
  return <div className={`fm3d-theme ${surface.scope}`}><ClassroomView key={variant} api={api} id={currentRoom} initialCode={null} onExit={() => {}} wallTarget={target} /></div>;
}
createRoot(document.getElementById('root')).render(summaryScenario ? <SummaryApp /> : <App />);
