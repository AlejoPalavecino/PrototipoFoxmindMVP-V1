import type { Summary } from "../../../../../../src/core/contracts/grading.ts";
import { useEffect, useState, type Dispatch, type SetStateAction, type RefObject, type ReactNode } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail, Member } from '../../../../../../src/core/contracts/classrooms.ts';
import { initials } from '../../../../../shared-ui/academic-cover.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
type Confirmation = { title: string; text: string; run: () => Promise<void>; scope?: string } | null;
type Resource = { status: string; reload: () => Promise<void> };
type Props = {
  tab: string; teacher: boolean; room: Detail; busy: boolean; members: Member[]; history: Member[];
  memberResource: Resource; historyResource: Resource; roster: RefObject<HTMLUListElement | null>;
  api: ClassroomClient; id: string; isCurrentRoom: () => boolean;
  access?:ReactNode;
  setInviting: Dispatch<SetStateAction<boolean>>; setSummary: Dispatch<SetStateAction<(Summary & { studentId: string }) | null>>;
  setConfirm: Dispatch<SetStateAction<Confirmation>>; action: (task: () => Promise<void>, section?: string) => Promise<void>;
};
export function ClassroomRoster({ tab, teacher, room, busy, members, history, memberResource, historyResource,
  roster, api, id, isCurrentRoom, setInviting, setSummary, setConfirm, action,access }: Props) {
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(''); }, [tab, id]);
  const people = tab === 'history' ? history : members;
  const filtered = people.filter(member => `${member.firstName} ${member.lastName}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const ready = (tab === 'history' ? historyResource : memberResource).status === 'ready';
  return <>
                <header className="p5-section-head">
                  <div>
                    <h2>
                      {tab === 'history'
                        ? 'Historial'
                        : teacher
                          ? 'Alumnos'
                          : 'Compañeros'}
                    </h2>
                    <p>
                      {tab === 'history'
                        ? 'Estudiantes que dejaron el aula. Sus registros académicos se conservan.'
                        : teacher
                          ? 'Consultá quiénes integran el aula y acompañá su recorrido.'
                          : 'Estas personas comparten el aula con vos.'}
                    </p>
                  </div>
                  {teacher && tab === 'members' ? (
                    <button
                      className="primary"
                      disabled={busy || room.archived}
                      onClick={() => setInviting(true)}
                    >
                      <FoxmindIcon name="users"/>Invitar alumnos
                    </button>
                  ) : null}
                </header>
                {access}
                {ready && tab!=='history' ? <div className="classroom-people-toolbar"><h3>Integrantes <span>{people.length}</span></h3><label><span className="sr-only">Buscar por nombre</span><input type="search" aria-label="Buscar personas del aula" placeholder="Buscar por nombre" value={query} onChange={event => setQuery(event.target.value)} /></label></div> : null}
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
                          {teacher && member.email ? <small>{member.email}</small> : null}
                          {teacher && tab==='history'
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
                                  if (isCurrentRoom()) setSummary({ ...result, email:member.email,division:room.division,progress:tab==='history',studentId: member.studentId! });
                                })
                              }
                            >
                              {tab==='history'?'Ver registros':'Ver ficha'} <FoxmindIcon name="arrow-right"/>
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ),
                  )}
                </ul>
  </>;
}
