import { useEffect, useId, useRef, useState } from 'react';
import { classroomHomeHref } from '../../navigation/destinations';
import { downloadMarkdownText, downloadTextDocument } from '../../../../../shared-ui/text-document';
import { formatFoxyModelMarkdown } from '../../../features/foxy/index.ts';
import { FoxyMarkdown } from '../../../../../shared-ui/markdown';
import { openDialog } from '../../../../../shared-ui/dialog-focus';
import type { Classroom } from '../../../../../../src/core/contracts/classrooms.ts';
import type { createFoxyWorkspaceRuntime } from '../../../features/foxy/index.ts';
import type { createFoxyWorkspaceActions } from '../../../features/foxy/index.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { FoxyActivityHandoffPanel } from './FoxyActivityHandoffPanel';
import { FoxyPublicationManagementPanel } from '../../../features/foxy/index.ts';
import { foxySurface as styles } from '../../../features/foxy/index.ts';

type RuntimeState = ReturnType<ReturnType<typeof createFoxyWorkspaceRuntime>['getState']>;
type Actions = ReturnType<typeof createFoxyWorkspaceActions>;
type Props = { resource: NonNullable<RuntimeState['resource']>; preparation: NonNullable<RuntimeState['preparation']>;
  history: NonNullable<RuntimeState['history']>; confirmation: NonNullable<RuntimeState['confirmation']>;
  management?: RuntimeState['management'];
  creationLabel?: string;
  initialHandoffMode?: 'ACTIVITY' | 'RUBRIC'; handoffRuntime?: ReturnType<typeof createFoxyWorkspaceRuntime>; handoffState?: RuntimeState['activityHandoff'];
  classrooms: Classroom[]; ui: ReturnType<Actions['getState']>; actions: Actions;
  publicationFileUrl: (id: string, mode: 'preview' | 'download') => string };
const button = 'p5-action';
export function FoxyResourceWorkspace(props: Props) {
  const { resource, preparation, history, confirmation, classrooms, ui, actions } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const controlsId = useId();
  const [editingOpen, setEditingOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(!!props.initialHandoffMode);
  const [handoffOpen, setHandoffOpen] = useState(!!props.initialHandoffMode);
  const [discardEdit, setDiscardEdit] = useState(false);
  const cancelEdit = () => { if(resource.dirty) setDiscardEdit(true); else setEditingOpen(false); };
  const conflict = !!resource.conflict || resource.errorCode === 'CONFLICT';
  const showEditor = editingOpen || conflict || resource.dirty;
  const resourceId = resource.resource?.id;
  useEffect(() => {
    setEditingOpen(false);
    setSharingOpen(false);
    setHandoffOpen(false);
  }, [resourceId]);
  useEffect(() => { if (conflict) setEditingOpen(true); }, [resourceId, conflict]);
  useEffect(() => { if (props.initialHandoffMode) { setSharingOpen(true); setHandoffOpen(true); } }, [resourceId, props.initialHandoffMode]);
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
  const savedMarkdown = resource.resource?.markdown ?? '';
  const markdown = resource.resource?.revision === '0' ? formatFoxyModelMarkdown(savedMarkdown) : savedMarkdown;
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
  const published = confirmation.receipt || pub?.state === 'PUBLISHED';
  const hasPublishedVersions = published || history.items.some(item => item.state === 'PUBLISHED');
  const publishedClassroomId = receiptPublication?.classroomId ?? (pub?.state === 'PUBLISHED' ? pub.classroomId : undefined);
  const receiptRoom = publishedClassroomId ? classrooms.find(room => room.id.toLowerCase() === publishedClassroomId.toLowerCase()) : undefined;
  const roomId = receiptRoom?.id && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(receiptRoom.id) ? receiptRoom.id : null;
  const libraryHref = roomId ? classroomHomeHref(confirmation.receipt?.materialId
    ? {kind:'material',classroomId:roomId,materialId:confirmation.receipt.materialId}
    : {kind:'classroom',classroomId:roomId,section:'library'}) : null;
  return <dialog ref={ref} role="dialog" aria-modal="true" aria-labelledby="foxy-resource-title" className={`p5-dialog parity-foxy-dialog parity-foxy-readingDialog ${styles.editor ?? ''}`}
    onCancel={event => { event.preventDefault(); actions.resource.close(); }}>
    <header><div><h2 id="foxy-resource-title">{discardEdit?'¿Descartás tus cambios?':showEditor?'Dale tu mirada':sharingOpen?(handoffOpen?'Continuar en Actividades':'Llevar a Biblioteca'):'Tu creación'}</h2><p>{discardEdit?'La versión guardada se conserva.':showEditor?'Los cambios quedan en tu creación privada.':sharingOpen&&!handoffOpen?'Elegí el destino. Revisás antes de publicar.':props.creationLabel??'Propuesta para revisar'}</p></div>
      <button type="button" className="p5-close" aria-label="Cerrar diálogo" onClick={() => actions.resource.close()}><FoxmindIcon name="close"/></button></header>
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
    {resource.resource && draft && <div className={`brujula-dialog-body ${styles.resourceViewer}`}>
      <section aria-label="Lectura del recurso" className="parity-foxy-reader" hidden={showEditor||sharingOpen||discardEdit}>
        <div className="parity-foxy-readerTitle"><span className="parity-foxy-toolIcon sky"><FoxmindIcon name="book"/></span><div><small>{hasPublishedVersions?'Compartida desde una versión guardada':history.loading?'Consultando publicaciones…':history.error?'No pudimos consultar las publicaciones.':'Privada hasta que decidas compartirla'}</small><h3>{resource.resource.title}</h3></div></div>
        <div className="parity-foxy-readingBody"><FoxyMarkdown markdown={markdown}/></div>
        {hasPublishedVersions&&<p>Editar esta creación no modifica lo que ya compartiste.</p>}
        <p className="parity-foxy-readingNote">Revisá los conceptos y fuentes antes de usarlo.</p>
      </section>
      {discardEdit&&<section><p>Podés volver al editor y seguir con tu idea.</p></section>}
      <section className="parity-foxy-editor" hidden={!showEditor||discardEdit}>
        <section id={`${controlsId}-edit`} className={styles.resourceFields} aria-label="Editar material" hidden={!showEditor}>

        <label htmlFor="foxy-resource-name">Título</label>
        <input id="foxy-resource-name" value={draft.title} disabled={confirmLocked} aria-invalid={invalidTitle} aria-describedby={invalidTitle ? 'foxy-title-help' : undefined}
          onChange={e => actions.resource.updateDraft({ ...draft, title: e.currentTarget.value })} />
        {invalidTitle&&<small id="foxy-title-help">Escribí un título válido de hasta 200 caracteres.</small>}
        <label htmlFor="foxy-resource-text">Contenido</label>
        <textarea id="foxy-resource-text" rows={14} value={draft.markdown} disabled={confirmLocked} aria-invalid={invalidText} aria-describedby={invalidText ? 'foxy-text-help' : undefined}
          onChange={e => actions.resource.updateDraft({ ...draft, markdown: e.currentTarget.value })} />
        {invalidText&&<small id="foxy-text-help">Escribí contenido válido de hasta 50000 caracteres.</small>}
        {resource.error && <p role="alert">{resource.error}</p>}
        {resource.conflict && <section aria-label="Conflicto de edición"><p>El recurso cambió en otra sesión. Versión guardada: {resource.conflict.title}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{resource.conflict.markdown}</pre>
          <button type="button" className={button} onClick={() => actions.resource.resolveConflict('keep-local')}>Conservar mis cambios</button>
          <button type="button" className={button} onClick={() => actions.resource.resolveConflict('use-server')}>Usar versión guardada</button></section>}
        {resource.errorCode === 'CONFLICT' && !resource.conflict && <button type="button" className={button} onClick={() => void actions.resource.refreshConflict()}>Consultar versión guardada</button>}
        </section>
      </section>
      <section className="parity-foxy-sharing" hidden={!sharingOpen||showEditor||discardEdit}>
        {sharingOpen && handoffOpen && props.handoffRuntime && props.handoffState && <FoxyActivityHandoffPanel key={resource.resource.id}
          initialMode={props.initialHandoffMode ?? (props.creationLabel === 'Pensar una rúbrica' ? 'RUBRIC' : 'ACTIVITY')} runtime={props.handoffRuntime}
          state={props.handoffState} resource={resource} classrooms={classrooms} onNavigate={href=>{void actions.requestNavigate(href);}}
          locked={mutationLocked||preparation.busy||!!preparation.pending}/>}
        <section id={`${controlsId}-share`} className={styles.resourceFields} aria-labelledby="foxy-publish-title" hidden={!sharingOpen||handoffOpen}>
        <h3 id="foxy-publish-title" className="parity-ai-srOnly">Preparar para Biblioteca</h3>
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

        {history.error && <p role="alert">{history.error} <button type="button" className={button} onClick={() => void actions.history.refreshList()}>Reintentar historial</button></p>}
        {history.items.length>1&&<details><summary>Versiones preparadas</summary><ul>{history.items.map(item => <li key={item.id}><button type="button" className={button} disabled={mutationLocked}
          onClick={() => void actions.history.select(item.id)}>{item.title} · {classrooms.find(room => room.id === item.classroomId)?.name ?? 'Aula'}</button></li>)}</ul></details>}
        {history.nextAfterId && <button type="button" className={button} onClick={() => void actions.history.loadMore()}>Ver más preparaciones</button>}
        {history.inspectionError && <p role="alert">{history.inspectionError} <button type="button" className={button} onClick={() => void actions.history.refreshSelected()}>Actualizar</button></p>}
        {history.staleResource && <p>Esta preparación corresponde a una versión anterior del recurso.</p>}
        {pub?.state === 'PREPARING' && !discardedKnown && <p role="status">Preparando archivo. Todavía no es visible para estudiantes.</p>}
        {pub?.state === 'FAILED' && !discardedKnown && <p>La preparación falló. El recurso guardado se conserva.</p>}
        {pub?.state === 'READY' && !discardedKnown && !history.staleResource && <p>PDF listo para revisar.</p>}
        {discardedKnown && pub?.state !== 'DISCARDED' && <p role="status">Actualizando el estado de la preparación descartada.</p>}
        {pub && (!discardedKnown || pub.state === 'DISCARDED') && props.management && <FoxyPublicationManagementPanel publication={pub} management={props.management}
          actions={actions.management} locked={confirmLocked || resource.busy || !!resource.pending || preparation.busy || !!preparation.pending} />}
        {preview && <a href={preview} target="_blank" rel="noopener noreferrer">Abrir vista previa PDF</a>}
        {!discardedKnown && <>{confirmation.error && <p role="alert">{confirmation.error}</p>}
        {published ? <div><p role="status">Publicado en la Biblioteca{receiptRoom ? ` de ${receiptRoom.name}` : confirmation.review?.classroomName ? ` de ${confirmation.review.classroomName}` : ''}.</p>
          {libraryHref && <a href={libraryHref} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); void actions.requestNavigate(libraryHref); } }}>Abrir Biblioteca</a>}</div> : <>
          {pub?.state==='READY'&&<button type="button" className={button} disabled={!confirmation.canReview || confirmation.reviewing || managementLocked} onClick={() => void actions.confirmation.review()}>Revisar publicación</button>}
          {confirmation.review && <div className={styles.confirmation}><h4>Confirmá la publicación</h4><p>Título en Biblioteca: {confirmation.review.publication.title}</p><p>Destino: {confirmation.review.classroomName}{confirmation.review.unitName ? ` · ${confirmation.review.unitName}` : ''}{confirmation.review.topicName ? ` · ${confirmation.review.topicName}` : ''}</p>
            <label><input type="checkbox" checked={confirmation.reviewed} disabled={confirmLocked} onChange={e => actions.confirmation.setReviewed(e.currentTarget.checked)} /> Revisé el recurso y quiero compartirlo con los estudiantes</label>
            {confirmation.pending ? <button type="button" className={button} disabled={managementLocked} onClick={() => void actions.confirmation.retry()}>Reintentar confirmación</button>
              : <button type="button" className="p5-primary" disabled={!confirmation.canConfirm || managementLocked} onClick={() => void actions.confirmation.confirm()}>Publicar en Biblioteca</button>}
          </div>}
        </>}</>}
        </section>
      </section>
    </div>}
    {resource.resource&&draft&&<footer className="parity-foxy-dialogFooter">
      {discardEdit?<><button type="button" onClick={()=>setDiscardEdit(false)}>Seguir editando</button><button type="button" className="parity-foxy-danger" onClick={()=>{actions.resource.updateDraft({title:resource.resource!.title,markdown:resource.resource!.markdown});setDiscardEdit(false);setEditingOpen(false);}}>Descartar</button></>:showEditor?<><button type="button" disabled={mutationLocked||resource.busy} onClick={cancelEdit}>Cancelar</button>{resource.pending?<button type="button" disabled={mutationLocked} onClick={()=>void actions.resource.retry()}>Reintentar guardado</button>:<button type="button" className="p5-primary" disabled={!resource.dirty||resource.busy||mutationLocked||invalidTitle||invalidText} onClick={()=>{void Promise.resolve(actions.resource.save()).then(result=>{if(result==='saved')setEditingOpen(false);});}}>Guardar cambios</button>}</>:sharingOpen?<button type="button" onClick={()=>setSharingOpen(false)}><FoxmindIcon name="arrow-left"/>Volver a la creación</button>:<>
        <button type="button" onClick={()=>actions.resource.close()}>Cerrar</button>
        <button type="button" onClick={()=>{setEditingOpen(true);setSharingOpen(false);}}><FoxmindIcon name="edit"/>Editar</button>
        <button type="button" onClick={()=>downloadMarkdownText(resource.resource!.title,markdown)}><FoxmindIcon name="download"/>Descargar TXT</button>
        <button type="button" onClick={()=>downloadTextDocument(resource.resource!.title,markdown)}><FoxmindIcon name="download"/>Descargar Word</button>
        {download&&<a className="p5-action" href={download}>Descargar PDF</a>}
        {props.handoffRuntime&&props.handoffState&&<button type="button" onClick={()=>{props.handoffRuntime!.activityHandoff.reset();setHandoffOpen(true);setSharingOpen(true);}}>
          {props.creationLabel === 'Pensar una rúbrica' ? 'Usar rúbrica en una actividad' : 'Preparar en Actividades'}
        </button>}
        <button type="button" className="p5-primary" onClick={()=>{setHandoffOpen(false);setSharingOpen(true);}}><FoxmindIcon name="book"/>Llevar a Biblioteca</button>
      </>}
    </footer>}
  </dialog>;
}
