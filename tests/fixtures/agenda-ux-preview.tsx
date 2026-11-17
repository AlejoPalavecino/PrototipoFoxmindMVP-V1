// Actual Agenda and app styles; synthetic in-memory client, no account or provider.
import { createRoot } from 'react-dom/client';
import { Agenda } from '../../apps/web/src/features/agenda/calendar/Agenda';
import { AppNavbar } from '../../apps/shared-ui/AppNavbar';
import { expandAgendaEvent, type PrivateEvent } from '../../src/core/domain/agenda/index';
import { type AgendaClient } from '../../apps/web/src/features/agenda/api/api';
import '../../apps/shared-ui/design-tokens.css';
import '../../apps/web/styles/globals.css';
import '../../apps/web/src/application/shell/styles/academic.css';
import '../../apps/web/src/application/shell/styles/folders.css';
import '../../apps/web/src/application/shell/styles/foxmind-3d.css';
import '../../apps/web/src/application/shell/styles/workspace.css';

const stamp = '2026-11-12T12:00:00Z', zone = 'America/Argentina/Buenos_Aires';
const scenario = new URLSearchParams(location.search).get('scenario');
let events: PrivateEvent[] = scenario === 'empty' ? [] : ['Preparar la clase de Ciencias', 'Reunión de equipo', 'Repasar contenidos'].map((title, index) => ({
  id: `11111111-1111-4111-8111-11111111111${index}`, revision: '1', createdAt: stamp, updatedAt: stamp,
  title, description: 'Evento sintético para verificar la agenda.', category: 'CLASS', color: ['ORANGE', 'BLUE', 'GREEN'][index] as PrivateEvent['color'],
  schedule: { kind: 'TIMED', timeZone: zone, startLocal: `2026-11-12T${9 + index}:00`.replace('T9:', 'T09:'), endLocal: `2026-11-12T${10 + index}:00` }, repeat: { kind: 'NONE' },
}));
const calls: unknown[] = [];
Object.assign(window, { agendaQA: { calls, events: () => events } });
let failed = scenario === 'error';
const api: AgendaClient = {
  async list(range) {
    if (scenario === 'loading') await new Promise(() => {});
    if (failed) { failed = false; throw new Error('Error sintético recuperable'); }
    return { serverTime: stamp, nextCursor: null, items: events.flatMap(event => expandAgendaEvent(event, range)) };
  },
  async upcoming() { return { serverTime: stamp, items: [] }; },
  async get(id) { return events.find(event => event.id === id)!; },
  async put(id, payload) { const saved = { ...payload, id, revision: '1', createdAt: stamp, updatedAt: stamp }; calls.push({ method: 'put', payload }); events.push(saved); return saved; },
  async replace(id, revision, payload) { const saved = { ...payload, id, revision: '2', createdAt: stamp, updatedAt: stamp }; events = events.map(event => event.id === id ? saved : event); return saved; },
  async remove(id) { events = events.filter(event => event.id !== id); },
  async open(target) { calls.push(target); return target; },
};
sessionStorage.setItem('foxmind-agenda-view', JSON.stringify({ month: '2026-11', day: '2026-11-12', zone }));
createRoot(document.getElementById('root')!).render(<div className="fm3d-theme">
  <AppNavbar homeNavigation logoHref="/" currentPath="/agenda" displayName="Alex Demo" links={[{ href: '/', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas' }, { href: '/agenda', label: 'Agenda', current: true }]} />
  <div className="p5-app fm3-classrooms"><Agenda api={api} onOpen={target => calls.push(target)} /></div>
</div>);
