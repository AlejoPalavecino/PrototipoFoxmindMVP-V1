import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Agenda, AgendaClientError, type AgendaClient } from '../../agenda-ui/index';
import { AppNavbar } from '../../shared-ui/AppNavbar';
import { expandAgendaEvent, type AcademicDeadline, type PrivateEvent } from '../../../src/core/domain/index';

const id = '11111111-1111-4111-8111-111111111111';
const stamp = '2026-10-25T12:00:00Z';
const deadline: AcademicDeadline = { kind: 'ACADEMIC_DEADLINE', id: 'deadline', target: { classroomId: id, activityId: id }, classroomName: 'Ciencias Naturales · 3º A', title: 'La célula y sus funciones', activityType: 'ASSIGNMENT', role: 'student', deadlineAt: '2026-10-29T01:00:00Z', timeZone: 'America/Argentina/Buenos_Aires', pending: true, resubmission: false };
const initial: PrivateEvent = { id, revision: 'fixture-r1', createdAt: stamp, updatedAt: stamp, title: 'Repasar contenidos', description: 'Un recordatorio privado de prueba.', category: 'CLASS', color: 'ORANGE', schedule: { kind: 'TIMED', timeZone: 'America/Argentina/Buenos_Aires', startLocal: '2026-10-28T09:00', endLocal: '2026-10-28T10:00' }, repeat: { kind: 'NONE' } };

export default function QA() {
  const router = useRouter(), mode = String(router.query.mode ?? 'populated');
  const [ready, setReady] = useState(false), [action, setAction] = useState('');
  useEffect(() => {
    sessionStorage.setItem('foxmind-agenda-view', JSON.stringify({ month: '2026-10', day: '2026-10-28', zone: 'America/Argentina/Buenos_Aires' }));
    setReady(true);
  }, []);
  const api = useMemo<AgendaClient>(() => {
    const deadlines = mode === 'empty' ? [] : mode === 'reference' ? [
      { ...deadline, id: 'deadline-reading', title: 'Comentario de lectura', classroomName: 'Lengua y Literatura', deadlineAt: '2026-10-26T21:00:00Z' },
      { ...deadline, id: 'deadline-math', title: 'Problemas proporcionales', classroomName: 'Matemática', deadlineAt: '2026-10-27T21:00:00Z' },
    ] : [deadline];
    let events: PrivateEvent[] = mode === 'empty' ? [] : [{ ...initial, ...(mode === 'all-day' ? { schedule: { kind: 'ALL_DAY' as const, startDate: '2026-10-28', endDateExclusive: '2026-10-29' }, repeat: { kind: 'WEEKLY' as const, untilDate: '2026-11-18' } } : {}) }];
    const calls: unknown[] = [];
    const record = (method: string, ...args: unknown[]) => { calls.push({ method, args }); setAction(JSON.stringify(calls)); };
    const read = async () => {
      if (mode === 'loading') await new Promise(() => {});
      if (mode === 'error') throw new AgendaClientError('SERVICE_UNAVAILABLE', 503);
    };
    return {
      async list(range) { await read(); return { serverTime: stamp, nextCursor: null, items: [...events.flatMap(event => expandAgendaEvent(event, range)), ...deadlines] }; },
      async upcoming() { await read(); return { serverTime: stamp, items: deadlines }; },
      async get(eventId) { record('get', eventId); return events.find(event => event.id === eventId)!; },
      async put(eventId, payload) { record('put', eventId, payload); const saved = { ...payload, id: eventId, revision: 'fixture-r2', createdAt: stamp, updatedAt: stamp }; events.push(saved); return saved; },
      async replace(eventId, revision, payload) { record('replace', eventId, revision, payload); if (mode === 'conflict') throw new AgendaClientError('CONFLICT', 409); const saved = { ...initial, ...payload, id: eventId, revision: 'fixture-r2' }; events = events.map(event => event.id === eventId ? saved : event); return saved; },
      async remove(eventId, revision) { record('remove', eventId, revision); events = events.filter(event => event.id !== eventId); },
      async open(target) { record('open', target); return target; },
    };
  }, [mode]);
  return <div className="p5-app fm3-classrooms"><a className="skip-link" href="#agenda-main">Saltar al contenido</a><AppNavbar logoHref="/mis-aulas" displayName="Alex Prueba" links={[{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas' }, { href: '/agenda', label: 'Agenda', current: true }]} onNavigate={value => setAction(value)} />{ready ? <Agenda key={mode} api={api} onOpen={target => setAction(JSON.stringify(target))} /> : null}<output data-qa-action>{action}</output></div>;
}
