import type { Classroom } from '../../../classrooms-ui/api';
import type { FoxyVisualPublicationState, FoxyVisualPublicationActions } from '../lib/foxy-visual-publication-controller';

type Props = { state: FoxyVisualPublicationState; actions: FoxyVisualPublicationActions; classrooms: Classroom[];
  publicationFileUrl(id: string, mode: 'preview' | 'download'): string };

export function FoxyVisualPublicationPanel({ state, actions, classrooms, publicationFileUrl }: Props) {
  const pub = state.publication, inspection = state.inspection;
  const ready = pub?.state === 'READY' && inspection?.publication.id === pub.id;
  const expected = pub ? `/api/v1/foxy-ai/publications/${pub.id}/file?mode=preview` : '';
  const preview = pub ? publicationFileUrl(pub.id, 'preview') : '';
  const locked = state.busy || !!state.pending;
  return <section aria-label="Publicar recurso visual">
    <h4>Preparar para Biblioteca</h4><p>La preparación es privada hasta que confirmes su publicación.</p>
    <label>Aula de destino <select value={state.classroomId} disabled={locked} onChange={event => actions.setClassroomId(event.currentTarget.value)}>
      <option value="">Elegí un aula</option>{classrooms.filter(room => room.role === 'teacher' && !room.archived).map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
    </select></label>
    <label>Unidad <select value={state.unitId ?? ''} disabled={locked || !state.destination} onChange={event => actions.selectUnit(event.currentTarget.value || null)}><option value="">Material adicional</option>{state.destination?.units.filter(unit => unit.id).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
    <label>Tema <select value={state.topicId ?? ''} disabled={locked || !state.destination || !state.unitId} onChange={event => actions.selectTopic(event.currentTarget.value || null)}><option value="">Sin tema</option>{state.destination?.units.find(unit => unit.id === state.unitId)?.topics.filter(topic => topic.id).map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
    <label>Título en Biblioteca <input value={state.title} disabled={locked} onChange={event => actions.setTitle(event.currentTarget.value)} /></label>
    {state.pending ? <button type="button" disabled={state.busy} onClick={() => actions.retry()}>Reintentar solicitud</button>
      : <button type="button" disabled={state.busy || !state.destination || !state.classroomId || !state.title.trim() || !state.assetRevision} onClick={() => actions.prepare()}>Preparar recurso</button>}
    {state.error && <p role="alert">{state.error}</p>}
    {pub?.state === 'PREPARING' && <p role="status">Preparando recurso…</p>}
    {pub?.state === 'FAILED' && <p>No pudimos preparar el recurso.</p>}
    {pub && !state.receipt && <button type="button" disabled={locked} onClick={() => actions.refresh()}>Actualizar preparación</button>}
    {ready && preview === expected && <a href={preview} target="_blank" rel="noopener noreferrer">Abrir vista previa</a>}
    {ready && !state.receipt && <div>
      {state.reviewReady && <p>{state.destination?.name} / {state.destination?.units.find(unit => unit.id === state.unitId)?.name ?? "Material adicional"}{state.topicId ? ` / ${state.destination?.units.find(unit => unit.id === state.unitId)?.topics.find(topic => topic.id === state.topicId)?.name ?? ""}` : ""}</p>}
      <button type="button" disabled={locked} onClick={() => actions.review()}>Revisar publicación</button>
      <label><input type="checkbox" checked={state.reviewed} disabled={locked || !state.reviewReady} onChange={event => actions.setReviewed(event.currentTarget.checked)} /> Revisé el recurso y quiero compartirlo con los estudiantes</label>
      <button type="button" disabled={locked || !state.reviewReady || !state.reviewed} onClick={() => actions.confirm()}>Publicar en Biblioteca</button>
    </div>}
    {state.receipt && <p role="status">Publicado en la Biblioteca.</p>}
  </section>;
}
