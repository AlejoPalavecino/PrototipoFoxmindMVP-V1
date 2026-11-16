import type { Classroom } from '../model/classroom-port.ts';
import type { FoxyVisualPublicationState, FoxyVisualPublicationActions } from '../model/foxy-visual-publication-controller';
import styles from './foxy-workspace.module.css';

type Props = { state: FoxyVisualPublicationState; actions: FoxyVisualPublicationActions; classrooms: Classroom[];
  publicationFileUrl(id: string, mode: 'preview' | 'download'): string };

export function FoxyVisualPublicationPanel({ state, actions, classrooms, publicationFileUrl }: Props) {
  const pub = state.publication, inspection = state.inspection;
  const ready = pub?.state === 'READY' && inspection?.publication.id === pub.id;
  const snapshot=ready?inspection?.editorialSnapshot:undefined;
  const expected = pub ? `/api/v1/foxy-ai/publications/${pub.id}/file?mode=preview` : '';
  const preview = pub ? publicationFileUrl(pub.id, 'preview') : '';
  const locked = state.busy || !!state.pending;
  return <section className={styles.tool} aria-label="Publicar recurso visual">
    <h3>Preparar para Biblioteca</h3><p>La preparación es privada hasta que confirmes su publicación.</p>
    {state.notice&&<p role="status">{state.notice}</p>}
    {!!state.preparations?.length&&<details><summary>Versiones preparadas</summary><ul>{state.preparations.filter(item=>item.state!=='DISCARDED').map(item=><li key={item.id}><button type="button" disabled={locked} onClick={()=>void actions.selectPreparation(item.id)}>{item.title} · {classrooms.find(room=>room.id===item.classroomId)?.name??'Aula'}{(item.editorialRevision??'0')!==state.editorialRevision?' · Versión anterior':''}{item.state==='PUBLISHED'?' · Publicada':''}</button></li>)}</ul></details>}
    {state.nextAfterId&&<button type="button" disabled={locked||state.loadingHistory} onClick={()=>void actions.loadMore()}>Ver más preparaciones</button>}
    <label>Aula de destino <select value={state.classroomId} disabled={locked} onChange={event => actions.setClassroomId(event.currentTarget.value)}>
      <option value="">Elegí un aula</option>{classrooms.filter(room => room.role === 'teacher' && !room.archived).map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
    </select></label>
    <label>Unidad <select value={state.unitId ?? ''} disabled={locked || !state.destination} onChange={event => actions.selectUnit(event.currentTarget.value || null)}><option value="">Material adicional</option>{state.destination?.units.filter(unit => unit.id).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
    <label>Tema <select value={state.topicId ?? ''} disabled={locked || !state.destination || !state.unitId} onChange={event => actions.selectTopic(event.currentTarget.value || null)}><option value="">Sin tema</option>{state.destination?.units.find(unit => unit.id === state.unitId)?.topics.filter(topic => topic.id).map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
    <label>Título en Biblioteca <input value={state.title} disabled={locked} onChange={event => actions.setTitle(event.currentTarget.value)} /></label>
    {state.pending ? <button type="button" disabled={state.busy} onClick={() => actions.retry()}>Reintentar solicitud</button>
      : <button type="button" disabled={state.busy || !state.destination || !state.classroomId || !state.title.trim() || !state.assetRevision} onClick={() => actions.prepare()}>{pub&&(pub.editorialRevision??'0')!==state.editorialRevision?'Preparar edición actual':'Preparar recurso'}</button>}
    {state.error && <p role="alert">{state.error}</p>}
    {pub?.state === 'PREPARING' && <p role="status">Preparando recurso…</p>}
    {pub?.state === 'FAILED' && <p>No pudimos preparar el recurso.</p>}
    {pub && !state.receipt && <button type="button" disabled={locked} onClick={() => actions.refresh()}>Actualizar preparación</button>}
    {ready && preview === expected && <a href={preview} target="_blank" rel="noopener noreferrer">Abrir vista previa</a>}
    {ready && !state.receipt && <div className={styles.confirmation}>
      <h4>Revisión y publicación</h4>
      {snapshot?<section aria-label="Copia que se publicará"><h5>Título en Biblioteca: {snapshot.title}</h5>{snapshot.description===null?<p>Esta preparación anterior no incluye texto editorial. Se publicarán el archivo visual y su título.</p>:<p className="parity-foxy-visualText">{snapshot.description||'Esta versión no tiene texto adicional.'}</p>}</section>:<p role="alert">No pudimos consultar el contenido de esta copia. Actualizá la preparación antes de confirmar.</p>}
      {state.reviewReady && <p>{state.destination?.name} / {state.destination?.units.find(unit => unit.id === state.unitId)?.name ?? "Material adicional"}{state.topicId ? ` / ${state.destination?.units.find(unit => unit.id === state.unitId)?.topics.find(topic => topic.id === state.topicId)?.name ?? ""}` : ""}</p>}
      <button type="button" disabled={locked} onClick={() => actions.review()}>Revisar publicación</button>
      <label><input type="checkbox" checked={state.reviewed} disabled={locked || !state.reviewReady || !snapshot} onChange={event => actions.setReviewed(event.currentTarget.checked)} /> Revisé el recurso y quiero compartirlo con los estudiantes</label>
      <button type="button" className="p5-primary" disabled={locked || !state.reviewReady || !state.reviewed || !snapshot} onClick={() => actions.confirm()}>Publicar en Biblioteca</button>
    </div>}
    {(state.receipt||pub?.state==='PUBLISHED') && <p role="status">Publicado en la Biblioteca.</p>}
  </section>;
}
