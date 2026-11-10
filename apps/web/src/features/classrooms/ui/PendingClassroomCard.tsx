import type { Draft } from '../../../../../../src/core/contracts/classrooms.ts';
import { Cover } from '../../../../../shared-ui/academic-cover.tsx';

export function PendingClassroomCard({ draft, busy, onContinue, onDelete }: {
  draft: Draft; busy: boolean; onContinue: (id: string) => void; onDelete: (draft: Draft) => void;
}) {
  const payload = draft.payload;
  return <article className="cl-course cl-pending-course">
    <div className="cl-cover"><Cover kind={payload.coverKey} /></div>
    <div className="cl-course-content">
      <p className="cl-pending-banner">Pendiente de creación</p>
      <h3>{payload.name || 'Aula sin nombre'}</h3>
      <p>{[payload.subject, payload.division, payload.academicYear].filter(Boolean).join(' · ') || 'Completá los datos para crear tu aula.'}</p>
      <p>El aula todavía no está creada ni disponible para estudiantes.</p>
      <div className="cl-pending-actions">
        <button type="button" className="primary" disabled={busy} onClick={() => onContinue(draft.id)}>Continuar creación</button>
        <button type="button" disabled={busy} onClick={() => onDelete(draft)}>Eliminar pendiente</button>
      </div>
    </div>
  </article>;
}
