import type { Draft } from '../../../../../../src/core/contracts/classrooms.ts';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
export function PendingClassroomCard({
  draft,
  busy,
  onContinue,
  onDelete,
}: {
  draft: Draft;
  busy: boolean;
  onContinue: (id: string) => void;
  onDelete: (draft: Draft) => void;
}) {
  const payload = draft.payload;
  return (
    <article className="class-draft">
      <img src={learningCover(payload.coverKey)} alt="" />
      <div className="draft-copy">
        <span className="draft-label">
          <FoxmindIcon name="edit" />
          Borrador
        </span>
        <h3>{payload.name || 'Tu próxima aula'}</h3>
        <p>{[payload.subject, payload.division].filter(Boolean).join(' · ') || 'Todavía podés darle forma.'}</p>
        {payload.wizardStep === undefined ? null : (
          <div className="draft-progress">
            <span aria-hidden="true">
              {[0, 1, 2, 3].map(step => (
                <i key={step} className={step <= payload.wizardStep! ? 'done' : ''} />
              ))}
            </span>
            Paso {payload.wizardStep + 1} de 4
          </div>
        )}
        <div className="draft-actions">
          <button type="button" className="button primary" disabled={busy} onClick={() => onContinue(draft.id)}>
            <FoxmindIcon name="arrow-right" />
            Continuar creación
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Eliminar borrador ${payload.name || 'sin nombre'}`}
            disabled={busy}
            onClick={() => onDelete(draft)}
          >
            <FoxmindIcon name="trash" />
          </button>
        </div>
      </div>
    </article>
  );
}
