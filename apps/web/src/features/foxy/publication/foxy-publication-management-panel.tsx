import type { FoxyPublicationSummary, FoxyPublicationRetryReason } from '../../../../../../src/core/domain/foxy/resource.ts';
import type { createFoxyWorkspaceRuntime } from '../workspace/foxy-workspace-runtime';
import type { createFoxyWorkspaceActions } from '../workspace/foxy-workspace-actions';

type RuntimeState = ReturnType<ReturnType<typeof createFoxyWorkspaceRuntime>['getState']>;
type Actions = ReturnType<typeof createFoxyWorkspaceActions>['management'];
type Props = { publication: FoxyPublicationSummary; management: NonNullable<RuntimeState['management']>; actions: Actions; locked: boolean };

const guidance: Record<FoxyPublicationRetryReason, string> = {
  STATE: '',
  SOURCE_CHANGED: 'El recurso guardado cambió. Guardá los cambios y prepará una nueva versión.',
  DESTINATION_UNAVAILABLE: 'Revisá el aula y prepará una nueva versión si corresponde.',
  INVALID_RESOURCE: 'Revisá el recurso guardado y prepará una nueva versión.',
  REFERENCED: 'Esta preparación ya está asociada a un material.',
  BUSY: 'La preparación está ocupada. Actualizá su estado más tarde.',
  CONTENT_REJECTED: 'El archivo fue rechazado. Editá el recurso y prepará una nueva versión.',
  FILE_UNAVAILABLE: 'El archivo no está disponible. Editá el recurso y prepará una nueva versión.',
};

export function FoxyPublicationManagementPanel({ publication, management, actions, locked }: Props) {
  const info = management.management;
  const matching = !!info && info.publicationId.toLowerCase() === publication.id.toLowerCase() && info.publicationRevision === publication.revision;
  const blocked = locked || management.busy || !!management.pending;
  const reason = matching && info.retryReason ? guidance[info.retryReason] : '';
  return <section aria-label="Gestión de la preparación">
    {management.loading && <p role="status">Actualizando la preparación…</p>}
    {management.error && <p role="alert">{management.error}</p>}
    {management.busy && <p role="status">Procesando la solicitud…</p>}
    {management.pending && !management.busy && <div>
      <p>No pudimos confirmar la solicitud. Podés reintentar la misma solicitud.</p>
      <button type="button" className="p5-action" disabled={locked} onClick={() => void actions.retryRequest()}>Reintentar solicitud</button>
    </div>}
    {management.receipt && <p role="status">{management.receipt.action === 'RETRY' ? 'Reintento registrado.' : 'Descarte registrado.'} Actualizando estado.</p>}
    {publication.state === 'FAILED' && <div>
      <p>Se reintentará la versión guardada. Los cambios del borrador se conservan.</p>
      {reason && <p>{reason}</p>}
      <button type="button" className="p5-action" disabled={blocked || !matching || !management.canRetry}
        onClick={() => void actions.retryPreparation()}>Reintentar preparación</button>
    </div>}
    {publication.state === 'DISCARDED' && matching && info.cleanupState !== 'NOT_REQUESTED' && <p role="status">
      {info.cleanupState === 'DONE' ? 'Preparación descartada. El espacio de esta preparación ya no está reservado.'
        : info.cleanupState === 'FAILED' ? 'La preparación sigue descartada. Todavía no se pudo liberar el espacio.'
          : 'Preparación descartada. La liberación de espacio está pendiente.'}
    </p>}
    {publication.state !== 'PUBLISHED' && publication.state !== 'DISCARDED' && <>
      {!management.discardReview && <button type="button" className="p5-action" disabled={blocked || !matching || !management.canReviewDiscard}
        onClick={() => actions.reviewDiscard()}>Descartar preparación</button>}
      {management.discardReview && <div>
        <p>Descartar «{management.discardReview.title}», versión {management.discardReview.revision}. El recurso y el borrador se conservan.</p>
        <label><input type="checkbox" checked={management.discardReviewed} disabled={blocked}
          onChange={event => actions.setDiscardReviewed(event.currentTarget.checked)} /> Entiendo que se retirará el PDF privado de esta preparación</label>
        <button type="button" className="p5-action" disabled={blocked || !management.canDiscard} onClick={() => void actions.discard()}>Confirmar descarte</button>
        <button type="button" className="p5-action" disabled={blocked} onClick={() => actions.cancelDiscardReview()}>Conservar preparación</button>
      </div>}
    </>}
    <button type="button" className="p5-action" disabled={management.loading} onClick={() => void actions.refresh()}>Actualizar estado</button>
  </section>;
}
