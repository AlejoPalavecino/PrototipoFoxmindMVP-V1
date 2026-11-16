import styles from './classroom-secondary.module.css';
import type { Summary } from '../../../../../../src/core/contracts/grading.ts';
import { type Dispatch, type SetStateAction, type RefObject, type ReactNode } from 'react';
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
  access?: ReactNode;
  setInviting: Dispatch<SetStateAction<boolean>>; setSummary: Dispatch<SetStateAction<(Summary & { studentId: string }) | null>>;
  setConfirm: Dispatch<SetStateAction<Confirmation>>; action: (task: () => Promise<void>, section?: string) => Promise<void>;
};
const formatDate = (value: string) => new Date(value).toLocaleDateString('es-AR');

export function ClassroomRoster({ tab, teacher, room, busy, members, history, memberResource, historyResource,
  roster, api, id, isCurrentRoom, setInviting, setSummary, action, access }: Props) {
  const historical = tab === 'history';
  const people = historical ? history : members;
  const ready = (historical ? historyResource : memberResource).status === 'ready';
  const name = historical ? 'Historial' : teacher ? 'Aprendemos en grupo' : 'Tu grupo';
  const count = `${people.length} ${people.length === 1 ? 'estudiante' : 'estudiantes'}`;

  return <section className={`parity-roster ${styles.roster}${historical ? ` ${styles.historical}` : ''}`} aria-label={historical ? 'Historial de inscripciones' : 'Integrantes del aula'}>
    {!historical || !ready || people.length > 0 ? <header className={styles.heading}>
      <div><h2>{name}</h2>
        {historical ? <p>Estudiantes que dejaron el aula. Sus registros académicos se conservan.</p>
          : ready ? <p>{count} en {room.name}.</p> : null}
      </div>
      {teacher && tab === 'members' ? <button className="primary" disabled={busy || room.archived} onClick={() => setInviting(true)}>
        <FoxmindIcon name="users" />Invitar estudiantes
      </button> : null}
    </header> : null}
    {access}
    {ready && people.length === 0 ? <div className={`${styles.empty} parity-roster-empty`} role="status">
      {historical ? <img src="/foxmind/foxy.webp" alt="" width={100} height={100}/> : <FoxmindIcon name="users" />}
      <h3>{historical ? 'Cada recorrido deja una historia' : 'Todavía no hay estudiantes en el aula'}</h3>
      {historical ? <p>Acá vas a encontrar a quienes hayan dejado el aula. Sus trabajos y devoluciones se conservan.</p> : null}
    </div> : null}
    <ul className={`p5-roster ${styles.people}`} ref={roster} aria-label={historical ? 'Inscripciones anteriores' : teacher ? 'Alumnos actuales' : 'Compañeros del aula'}>
      {people.map((member, index) => <li key={member.enrollmentId ?? index} className={teacher ? styles.actionable : undefined}
        onClick={event => {
          if (teacher && !(event.target as HTMLElement).closest('button'))
            event.currentTarget.querySelector<HTMLButtonElement>('[data-open-summary]')?.click();
        }}>
        <span className={`p5-avatar ${styles.avatar}`} aria-hidden="true">{initials(member.firstName, member.lastName)}</span>
        <div className={`classroom-person-details ${styles.person}`}>
          <strong>{member.firstName} {member.lastName}</strong>
          <small>{!teacher && member.isSelf === true ? 'Vos' : 'Estudiante'}</small>
          {teacher && historical ? member.periods?.map((period, periodIndex) => <small key={periodIndex} className="classroom-history-date">
            Ingreso: {formatDate(period.joinedAt)} — {period.endedAt
              ? `${formatDate(period.endedAt)} · ${period.endReason === 'LEFT' ? 'Salida voluntaria' : 'Removido por docente'}`
              : 'Actualmente inscripto'}
          </small>) : null}
        </div>
        {teacher ? <div className={`p5-actions ${styles.rowActions}`}><button className={`classroom-person-summary ${styles.more}`} data-open-summary disabled={busy}
          onClick={() => void action(async () => {
            const result = await api.call<Summary>(`/${id}/members/${member.studentId}`);
            if (isCurrentRoom()) setSummary({ ...result, email: member.email, division: room.division, progress: historical, studentId: member.studentId! });
          })}>
          {historical ? 'Ver registros' : 'Ver ficha'}
        </button></div> : null}
      </li>)}
    </ul>
  </section>;
}
