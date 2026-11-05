import { useEffect, useState, type Dispatch, type SetStateAction, type RefObject } from 'react';
import type { ClassroomClient, Detail, Member } from './api.ts';
import { initials } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';
import { ClassroomHistory } from './ClassroomHistory.tsx';
export interface Summary {
  firstName: string; lastName: string;
  attempts: { id: string; title: string; submittedAt: string; number: number; grade: string | null; published: boolean | null }[];
}
type Confirmation = { title: string; text: string; run: () => Promise<void>; scope?: string } | null;
type Resource = { status: string; reload: () => Promise<void> };
type Props = {
  tab: string; teacher: boolean; room: Detail; busy: boolean; members: Member[]; history: Member[];
  memberResource: Resource; historyResource: Resource; roster: RefObject<HTMLUListElement | null>;
  api: ClassroomClient; id: string; isCurrentRoom: () => boolean;
  setInviting: Dispatch<SetStateAction<boolean>>; setSummary: Dispatch<SetStateAction<(Summary & { studentId: string }) | null>>;
  setConfirm: Dispatch<SetStateAction<Confirmation>>; action: (task: () => Promise<void>, section?: string) => Promise<void>;
};
export function ClassroomRoster({ tab, teacher, room, busy, members, history, memberResource, historyResource,
  roster, api, id, isCurrentRoom, setInviting, setSummary, setConfirm, action }: Props) {
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(''); }, [tab, id]);
  const people = tab === 'history' ? history : members;
  const filtered = people.filter(member => `${member.firstName} ${member.lastName}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const ready = (tab === 'history' ? historyResource : memberResource).status === 'ready';
  return <>
                <header className="p5-section-head">
                  <div>
                    <h2><EntryIcon name={tab === 'history' ? 'list' : 'people-fill'} />
                      {tab === 'history'
                        ? 'Historial de alumnos'
                        : teacher
                          ? 'Alumnos'
                          : 'Compañeros'}
                    </h2>
                    <p>
                      {tab === 'history'
                        ? 'Las personas que salieron conservan sus registros.'
                        : teacher
                          ? 'Acompañá a quienes forman parte del aula.'
                          : 'Las personas con las que compartís el aprendizaje.'}
                    </p>
                  </div>
                  {teacher && tab === 'members' ? (
                    <button
                      className="primary"
                      disabled={busy || room.archived}
                      onClick={() => setInviting(true)}
                    >
                      Invitar estudiantes
                    </button>
                  ) : null}
                </header>
                {ready && people.length > 0 ? <div className="classroom-people-toolbar"><p>{people.length} {tab === 'history' ? 'alumnos anteriores' : teacher ? 'alumnos actuales' : 'compañeros'}</p><label>Buscar por nombre<input type="search" aria-label={tab === 'history' ? 'Buscar alumnos anteriores' : 'Buscar personas del aula'} placeholder="Buscar por nombre…" value={query} onChange={event => setQuery(event.target.value)} /></label></div> : null}
                {ready && people.length > 0 && filtered.length === 0 ? <p className="p5-empty" role="status">No se encontraron personas para esta búsqueda.</p> : null}
                {(tab === 'history' ? historyResource : memberResource).status === 'ready' && (tab === 'history' ? history : members).length === 0 ? (
                  <p className="p5-empty" role="status">
                    {tab === 'history'
                      ? 'Todavía no hay salidas registradas.'
                      : 'Todavía no hay estudiantes en el aula.'}
                  </p>
                ) : null}
                <ul className="p5-roster" ref={roster} aria-label={tab === 'history' ? 'Inscripciones anteriores' : teacher ? 'Alumnos actuales' : 'Compañeros del aula'}>
                  {filtered.map(
                    (member, index) => (
                      <li key={member.enrollmentId ?? index}
                        style={teacher ? { cursor: 'pointer' } : undefined}
                        onClick={event => {
                          if (teacher && !(event.target as HTMLElement).closest('button')) {
                            event.currentTarget.querySelector<HTMLButtonElement>('[data-open-summary]')?.click();
                          }
                        }}>
                        <span className="p5-avatar" aria-hidden="true">
                          {initials(member.firstName, member.lastName)}
                        </span>
                        <div className="classroom-person-details">
                          <strong>
                            {member.firstName} {member.lastName}
                          </strong>
                          {teacher
                            ? member.periods?.map((period, i) => (
                                <small key={i} className={tab === 'history' ? 'classroom-history-date' : undefined}>
                                  Ingreso: {new Date(period.joinedAt).toLocaleDateString(
                                    'es-AR',
                                  )}{' '}
                                  —{' '}
                                  {period.endedAt
                                    ? `${new Date(period.endedAt).toLocaleDateString('es-AR')} · ${period.endReason === 'LEFT' ? 'Salida voluntaria' : 'Removido por docente'}`
                                    : 'Actualmente inscripto'}
                                </small>
                              ))
                            : null}
                        </div>
                        {teacher ? (
                          <div className="p5-actions">
                            <button className="classroom-person-summary"
                              data-open-summary
                              disabled={busy}
                              onClick={() =>
                                void action(async () => {
                                  const result = await api.call<Summary>(`/${id}/members/${member.studentId}`);
                                  if (isCurrentRoom()) setSummary({ ...result, studentId: member.studentId! });
                                })
                              }
                            >
                              Ver resumen
                            </button>
                            {tab === 'members' ? (
                              <button
                                disabled={busy || room.archived}
                                onClick={() =>
                                  setConfirm({
                                    title: 'Remover estudiante',
                                    text: `${member.firstName} perderá acceso al aula. Sus entregas, calificaciones y conversaciones se conservan.`,
                                    run: async () => {
                                      await api.call(
                                        `/${id}/members/${member.studentId}/remove`,
                                        'POST',
                                        {},
                                      );
                                      await memberResource.reload();
                                    },
                                  })
                                }
                              >
                                Remover
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ),
                  )}
                </ul>
                {tab === 'history' ? <ClassroomHistory /> : null}
  </>;
}
