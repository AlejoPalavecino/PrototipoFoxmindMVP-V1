import type { Classroom, ClassroomClient, Draft, Invitation } from '../../classrooms-ui/api';

const identifier = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const room = (n: number, name: string, subject: string, coverKey: string, role: Classroom['role'], extra: Partial<Classroom> = {}): Classroom => ({
  id: identifier(n), name, subject, coverKey, role, division: 'A', academicYear: 2026,
  timezone: 'America/Argentina/Buenos_Aires', teacher: role === 'teacher' ? 'Alex Sintético' : 'Luz Ejemplo',
  revision: '1', archived: false, ...extra,
});
const base = [room(1, 'Biología — Exploración', 'Biología', 'biology', 'teacher'),
  room(2, 'Literatura — Ideas y relatos', 'Literatura', 'literature', 'teacher', { division: 'B' }),
  room(3, 'Matemática — Problemas cotidianos', 'Matemática', 'math', 'teacher', { academicYear: 2025, archived: true }),
  room(4, 'Historia — Mundos conectados', 'Historia', 'society', 'student', { division: 'C' })];
const pendingRoom = room(5, 'Geografía — Aula invitada', 'Geografía', 'society', 'student');
const draft: Draft = { id: identifier(20), revision: '1', publishedClassroomId: null,
  payload: { name: 'Ciencias — Nuevo proyecto', subject: 'Ciencias', division: 'D', academicYear: 2026,
    coverKey: 'biology', timezone: 'America/Argentina/Buenos_Aires', units: [] } };
const invitation: Invitation = { id: identifier(30), name: pendingRoom.name, teacher: 'Luz Ejemplo', expiresAt: '2026-11-28T18:00:00Z' };
export interface Receipt { path: string; method: string; synthetic: true }

/** All effects below are per-page memory only. No fetch, upstream, disk or database. */
export function collectionFixture(mode: string, record: (receipt: Receipt) => void): ClassroomClient {
  let rooms = mode === 'empty' ? [] : structuredClone(base);
  let drafts = mode === 'empty' ? [] : [structuredClone(draft)];
  let invitations = mode === 'empty' ? [] : [structuredClone(invitation)];
  let firstError = mode === 'error';
  if (mode === 'archive') rooms = rooms.map(item => ({ ...item, archived: true }));
  if (mode === 'long') rooms = rooms.map(item => ({ ...item, name: `${item.name}: investigación interdisciplinaria sobre nuestra comunidad y sus transformaciones`,
    teacher: 'Docente de ejemplo con nombre deliberadamente extenso', division: 'División interdisciplinaria A' }));
  if (mode === 'many') rooms = Array.from({ length: 24 }, (_, n) => ({ ...rooms[n % 4], id: identifier(100 + n), name: `${rooms[n % 4].name} · Grupo ${n + 1}` }));
  const call: ClassroomClient['call'] = async <T,>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    record({ path, method, synthetic: true });
    if (mode === 'loading' && path === '') await new Promise(() => {});
    if (firstError && path === '') { firstError = false; throw new Error('Lectura sintética interrumpida. Podés volver a intentar.'); }
    if (mode === 'busy' && method !== 'GET') await new Promise(resolve => setTimeout(resolve, 2000));
    let result: unknown;
    if (path === '') result = { teach: rooms.filter(item => item.role === 'teacher'), study: rooms.filter(item => item.role === 'student') };
    else if (path === '/notifications') result = [];
    else if (path === '/drafts' && method === 'GET') result = drafts;
    else if (path === '/drafts' && method === 'POST') { const created = { ...structuredClone(draft), id: identifier(21), payload: {} }; drafts = [...drafts, created]; result = created; }
    else if (path === '/invitations') result = invitations;
    else if (path === `/invitations/${invitation.id}/accept` && method === 'POST') {
      invitations = []; rooms = [...rooms, pendingRoom]; result = {};
    } else if (path === '/codes/preview' && method === 'POST') {
      if ((body as { code: string }).code !== 'SYNTHETIC-CLASS') throw new Error('Código sintético no disponible.');
      result = { confirmation: 'fixture-confirmation', classroom: pendingRoom };
    } else if (path === '/codes/confirm' && method === 'POST') {
      if (!rooms.some(item => item.id === pendingRoom.id)) rooms = [...rooms, pendingRoom]; result = { id: pendingRoom.id };
    } else if (path.startsWith('/drafts/')) {
      const current = drafts.find(item => path === `/drafts/${item.id}`);
      if (!current || path.endsWith('/publish')) throw new Error('Fixture: publicación no habilitada.');
      if (method === 'PATCH') { current.payload = (body as { payload: Draft['payload'] }).payload; current.revision = String(Number(current.revision) + 1); }
      if (method === 'DELETE') {
        const input = body as { revision: string; confirm: boolean };
        if (mode === 'delete-error' || input.confirm !== true || input.revision !== current.revision) throw new Error('Eliminación sintética rechazada.');
        drafts = drafts.filter(item => item.id !== current.id); result = { deleted: true };
      } else
      result = current;
    } else {
      const selected = rooms.find(item => path === `/${item.id}` || path.startsWith(`/${item.id}/`));
      if (!selected || method !== 'GET') throw new Error('Operación fuera de la fixture de colección.');
      if (path === `/${selected.id}`) result = { ...selected, units: [], plans: [] };
      else if (path.endsWith('/wall')) result = { revision: '1', posts: [] };
      else if (path.endsWith('/activities')) result = { revision: '1', activities: [] };
      else if (/\/(members|history|invitations|library)$/.test(path)) result = [];
      else throw new Error('Lectura fuera de la fixture de colección.');
    }
    return structuredClone(result) as T;
  };
  return { call, upload: async () => { throw new Error('Fixture: carga deshabilitada.'); },
    attempt: async () => { throw new Error('Fixture: entrega deshabilitada.'); },
    fileStatus: async () => { throw new Error('Fixture: archivos deshabilitados.'); }, fileUrl: () => '/fixture-disabled' };
}
