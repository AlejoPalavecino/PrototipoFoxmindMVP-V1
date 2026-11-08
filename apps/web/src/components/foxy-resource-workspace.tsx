import { useEffect, useRef } from 'react';
import { downloadTextDocument } from '../../../shared-ui/text-document';
import { openDialog } from '../../../shared-ui/dialog-focus';
import type { Classroom } from '../../../classrooms-ui/api';
import type { createFoxyWorkspaceRuntime } from '../lib/foxy-workspace-runtime';
import type { createFoxyWorkspaceActions } from '../lib/foxy-workspace-actions';
import { FoxyActivityHandoffPanel } from './foxy-activity-handoff-panel';
import { FoxyPublicationManagementPanel } from './foxy-publication-management-panel';
import styles from './foxy-workspace.module.css';

type RuntimeState = ReturnType<ReturnType<typeof createFoxyWorkspaceRuntime>['getState']>;
type Actions = ReturnType<typeof createFoxyWorkspaceActions>;
type Props = { resource: NonNullable<RuntimeState['resource']>; preparation: NonNullable<RuntimeState['preparation']>;
  history: NonNullable<RuntimeState['history']>; confirmation: NonNullable<RuntimeState['confirmation']>;
  management?: RuntimeState['management'];
  initialHandoffMode?: 'ACTIVITY' | 'RUBRIC'; handoffRuntime?: ReturnType<typeof createFoxyWorkspaceRuntime>; handoffState?: RuntimeState['activityHandoff'];
  classrooms: Classroom[]; ui: ReturnType<Actions['getState']>; actions: Actions;
  publicationFileUrl: (id: string, mode: 'preview' | 'download') => string };
const button = 'p5-action';
export function FoxyResourceWorkspace(props: Props) {
  const { resource, preparation, history, confirmation, classrooms, ui, actions } = props;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current; if (!dialog) return;
    const doc = dialog.ownerDocument, parent = doc.activeElement?.closest('dialog') as HTMLDialogElement | null;
    const close = openDialog(dialog);
    return () => {
      close();
      queueMicrotask(() => {
        if (parent?.isConnected && parent.open && (doc.activeElement === doc.body || dialog.contains(doc.activeElement))) {
          parent.querySelector<HTMLElement>('input[type="search"],button')?.focus({ preventScroll: true });
        }
      });
    };
  }, []);
  if (resource.status === 'closed' && !ui.openingResource) return null;
  const draft = resource.draft, destination = preparation.destination;
  const currentUnit = destination?.units.find(unit => unit.id === preparation.metadata.unitId);
  const inspected = history.inspection, pub = inspected?.publication;
  const samePublication = (id: string) => !!pub && id.toLowerCase() === pub.id.toLowerCase();
  const discardedKnown = !!pub && (pub.state === 'DISCARDED'
    || history.items.some(item => samePublication(item.id) && item.state === 'DISCARDED')
    || (!!preparation.result && samePublication(preparation.result.id) && preparation.result.state === 'DISCARDED')
    || (props.management?.receipt?.action === 'DISCARD' && samePublication(props.management.receipt.publicationId)));
  const available = !!pub && !discardedKnown && !history.staleResource && (pub.state === 'READY' || pub.state === 'PUBLISHED');
  const link = (mode: 'preview' | 'download') => {
    if (!available || !pub || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(pub.id)) return null;
    const url = props.publicationFileUrl(pub.id, mode), expected = `/api/v1/foxy-ai/publications/${pub.id}/file?mode=${mode}`;
    return url === expected ? url : null;
  };
  const preview = link('preview'), download = link('download');
  const confirmLocked = confirmation.busy || !!confirmation.pending || !!props.handoffState?.busy || !!props.handoffState?.pending;
  const managementLocked = !!props.management?.busy || !!props.management?.pending;
  const mutationLocked = confirmLocked || managementLocked;
  const invalid = (value: string, max: number) => !value.trim() || [...value].length > max || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value);
  const invalidTitle = !!draft && invalid(draft.title, 200), invalidText = !!draft && invalid(draft.markdown, 50000);
  const receiptId = confirmation.receipt?.publicationId;
  const receiptPublication = receiptId ? (pub?.id.toLowerCase() === receiptId.toLowerCase() ? pub : history.items.find(item => item.id.toLowerCase() === receiptId.toLowerCase())) : undefined;
  const receiptRoom = receiptPublication && classrooms.find(room => room.id.toLowerCase() === receiptPublication.classroomId.toLowerCase());
  const roomId = receiptRoom?.id && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(receiptRoom.id) ? receiptRoom.id : null;
  return <dialog ref={ref} role="dialog" aria-modal="true" aria-labelledby="foxy-resource-title" className={`p5-dialog ${styles.editor ?? ''}`}
    onCancel={event => { event.preventDefault(); actions.resource.close(); }}>
    <header><h2 id="foxy-resource-title">Recurso de Foxy AI</h2>
      <button type="button" className="p5-close" aria-label="Cerrar diálogo" onClick={() => actions.resource.close()}>×</button></header>
    {ui.leave ? <section aria-labelledby="foxy-leave-title" className="p5-notice">
      <h3 id="foxy-leave-title">Antes de salir</h3>
      <p>{ui.leave.reason === 'unsaved' ? 'Tenés cambios sin guardar.' : 'La solicitud puede haberse completado. Podés consultar el resultado al volver.'}</p>
      {ui.leave.canSave && <button type="button" className={button} onClick={() => void actions.saveAndContinue()}>Guardar y continuar</button>}
      <button type="button" className={button} onClick={() => void actions.discardAndContinue()}>{ui.leave.reason === 'unsaved' ? 'Descartar cambios y continuar' : 'Cerrar vista y continuar'}</button>
      <button type="button" className={button} onClick={() => actions.cancelLeave()}>Seguir editando</button>
    </section> : null}
    {ui.error && <p role="alert">{ui.error}</p>}
    {resource.status === 'loading' || ui.openingResource ? <p role="status">Cargando recurso…</p> : null}
    {resource.status === 'unavailable' ? <p role="alert">{resource.error ?? 'El recurso no está disponible.'}</p> : null}
    {resource.resource && draft && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
      <section aria-labelledby="foxy-editor-title" style={{ flex: '2 1 26rem', minWidth: 0 }}>
        <h3 id="foxy-editor-title">Editar material</h3>
        <p>{resource.dirty ? 'Cambios sin guardar' : 'Recurso guardado'}</p>
        <label htmlFor="foxy-resource-name">Título</label>
        <input id="foxy-resource-name" value={draft.title} disabled={confirmLocked} aria-invalid={invalidTitle} aria-describedby="foxy-title-help"
          onChange={e => actions.resource.updateDraft({ ...draft, title: e.currentTarget.value })} />
        <small id="foxy-title-help">{[...draft.title].length} / 200 caracteres{invalidTitle ? ' · Escribí un título válido.' : ''}</small>
        <label htmlFor="foxy-resource-text">Contenido</label>
        <textarea id="foxy-resource-text" rows={14} value={draft.markdown} disabled={confirmLocked} aria-invalid={invalidText} aria-describedby="foxy-text-help"
          onChange={e => actions.resource.updateDraft({ ...draft, markdown: e.currentTarget.value })} />
        <small id="foxy-text-help">{[...draft.markdown].length} / 50000 caracteres{invalidText ? ' · Escribí contenido válido.' : ''}</small>
        {resource.error && <p role="alert">{resource.error}</p>}
        {resource.conflict && <section aria-label="Conflicto de edición"><p>El recurso cambió en otra sesión. Versión guardada: {resource.conflict.title}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{resource.conflict.markdown}</pre>
          <button type="button" className={button} onClick={() => actions.resource.resolveConflict('keep-local')}>Conservar mis cambios</button>
          <button type="button" className={button} onClick={() => actions.resource.resolveConflict('use-server')}>Usar versión guardada</button></section>}
        {resource.errorCode === 'CONFLICT' && !resource.conflict && <button type="button" className={button} onClick={() => void actions.resource.refreshConflict()}>Consultar versión guardada</button>}
        {resource.pending ? <button type="button" className={button} disabled={mutationLocked} onClick={() => void actions.resource.retry()}>Reintentar guardado</button>
          : <button type="button" className="p5-primary" disabled={!resource.dirty || resource.busy || mutationLocked} onClick={() => void actions.resource.save()}>Guardar cambios</button>}
      </section>
      <section aria-labelledby="foxy-publish-title" style={{ flex: '1 1 20rem', minWidth: 0 }}>
        {props.handoffRuntime && props.handoffState && <FoxyActivityHandoffPanel key={`${resource.resource?.id}:${props.initialHandoffMode ?? ""}`} initialMode={props.initialHandoffMode} runtime={props.handoffRuntime} state={props.handoffState} resource={resource} classrooms={classrooms} onNavigate={href => { void actions.requestNavigate(href); }} locked={mutationLocked || preparation.busy || !!preparation.pending} />}
        <h3 id="foxy-publish-title">Preparar para Biblioteca</h3>
        <p>La preparación es privada y todavía no es visible para estudiantes.</p>
        <label htmlFor="foxy-destination">Aula de destino</label>
        <select id="foxy-destination" value={destination?.id ?? ''} disabled={mutationLocked || !!preparation.pending || preparation.busy}
          onChange={e => { if (e.currentTarget.value) void actions.preparation.selectDestination(e.currentTarget.value); }}>
          <option value="">Elegí un aula</option>{classrooms.filter(room => room.role === 'teacher' && !room.archived).map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
        {ui.loadingDestinationId && <p role="status">Cargando aula…</p>}
        <label htmlFor="foxy-publication-title">Título en Biblioteca</label>
        <input id="foxy-publication-title" value={preparation.metadata.title} disabled={mutationLocked || !!preparation.pending || preparation.busy}
          onChange={e => actions.preparation.setTitle(e.currentTarget.value)} />
        <label htmlFor="foxy-unit">Unidad</label>
        <select id="foxy-unit" value={preparation.metadata.unitId ?? ''} disabled={!destination || mutationLocked || !!preparation.pending || preparation.busy}
          onChange={e => actions.preparation.selectUnit(e.currentTarget.value || null)}>
          <option value="">Material adicional</option>{destination?.units.filter(unit => unit.id).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select>
        <label htmlFor="foxy-topic">Tema</label>
        <select id="foxy-topic" value={preparation.metadata.topicId ?? ''} disabled={!currentUnit || mutationLocked || !!preparation.pending || preparation.busy}
          onChange={e => actions.preparation.selectTopic(e.currentTarget.value || null)}>
          <option value="">Sin tema</option>{currentUnit?.topics.filter(topic => topic.id).map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
        </select>
        {preparation.error && <p role="alert">{preparation.error}</p>}
        {preparation.pending ? <button type="button" className={button} disabled={mutationLocked} onClick={() => void actions.preparation.retry()}>Reintentar preparación</button>
          : <button type="button" className="p5-primary" disabled={!preparation.canPrepare || mutationLocked} onClick={() => void actions.preparation.prepare()}>Preparar PDF</button>}
        <h3>Preparaciones</h3>
        {history.error && <p role="alert">{history.error} <button type="button" className={button} onClick={() => void actions.history.refreshList()}>Reintentar historial</button></p>}
        {!history.items.length && !history.loading && !history.error && <p>No hay preparaciones guardadas.</p>}
        <ul>{history.items.map(item => <li key={item.id}><button type="button" className={button} disabled={mutationLocked}
          onClick={() => void actions.history.select(item.id)}>{item.title} · {classrooms.find(room => room.id === item.classroomId)?.name ?? 'Aula'} · {item.state}</button></li>)}</ul>
        {history.nextAfterId && <button type="button" className={button} onClick={() => void actions.history.loadMore()}>Ver más preparaciones</button>}
        {history.inspectionError && <p role="alert">{history.inspectionError} <button type="button" className={button} onClick={() => void actions.history.refreshSelected()}>Actualizar</button></p>}
        {history.staleResource && <p>Esta preparación corresponde a una versión anterior del recurso.</p>}
        {pub?.state === 'PREPARING' && !discardedKnown && <p role="status">Preparando archivo. Todavía no es visible para estudiantes.</p>}
        {pub?.state === 'FAILED' && !discardedKnown && <p>La preparación falló. El recurso guardado se conserva.</p>}
        {pub?.state === 'READY' && !discardedKnown && !history.staleResource && <p>PDF listo para revisar.</p>}
        {discardedKnown && pub?.state !== 'DISCARDED' && <p role="status">Actualizando el estado de la preparación descartada.</p>}
        {pub && (!discardedKnown || pub.state === 'DISCARDED') && props.management && <FoxyPublicationManagementPanel publication={pub} management={props.management}
          actions={actions.management} locked={confirmLocked || resource.busy || !!resource.pending || preparation.busy || !!preparation.pending} />}
        {preview && <a href={preview} target="_blank" rel="noopener noreferrer">Abrir vista previa PDF</a>}{' '}
        {download && <a href={download} target="_blank" rel="noopener noreferrer">Descargar PDF</a>}
        {draft ? <button type="button" disabled={invalidTitle || invalidText || resource.busy} onClick={()=>downloadTextDocument(draft.title,draft.markdown)}>Descargar Word</button> : null}
        {!discardedKnown && <>{confirmation.error && <p role="alert">{confirmation.error}</p>}
        {confirmation.receipt ? <div><p role="status">Publicado en la Biblioteca{receiptRoom ? ` de ${receiptRoom.name}` : confirmation.review?.classroomName ? ` de ${confirmation.review.classroomName}` : ''}.</p>
          {roomId && <a href={`/mis-aulas?aula=${roomId}`} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); void actions.requestNavigate(`/mis-aulas?aula=${roomId}`); } }}>Abrir aula</a>}</div> : <>
          <button type="button" className={button} disabled={!confirmation.canReview || confirmation.reviewing || managementLocked} onClick={() => void actions.confirmation.review()}>Revisar publicación</button>
          {confirmation.review && <div className={styles.confirmation}><h4>Confirmá la publicación</h4><p>Título en Biblioteca: {confirmation.review.publication.title}</p><p>Destino: {confirmation.review.classroomName}{confirmation.review.unitName ? ` · ${confirmation.review.unitName}` : ''}{confirmation.review.topicName ? ` · ${confirmation.review.topicName}` : ''}</p>
            <label><input type="checkbox" checked={confirmation.reviewed} disabled={confirmLocked} onChange={e => actions.confirmation.setReviewed(e.currentTarget.checked)} /> Revisé el recurso y quiero compartirlo con los estudiantes</label>
            {confirmation.pending ? <button type="button" className={button} disabled={managementLocked} onClick={() => void actions.confirmation.retry()}>Reintentar confirmación</button>
              : <button type="button" className="p5-primary" disabled={!confirmation.canConfirm || managementLocked} onClick={() => void actions.confirmation.confirm()}>Publicar en Biblioteca</button>}
          </div>}
        </>}</>}
      </section>
    </div>}
  </dialog>;
}
