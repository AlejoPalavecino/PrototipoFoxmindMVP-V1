import type { FoxyAspectRatio, FoxySelection, FoxyVisualKind } from '../../../../../../src/core/domain/index.ts';
import type { FoxyVisualJob } from '../api/foxy-client';
import styles from './foxy-workspace.module.css';
type Props = { capabilities: Record<FoxyVisualKind, boolean>; conversationId: string; revision: string; selection: FoxySelection;
  kind: FoxyVisualKind; prompt: string; aspectRatio: FoxyAspectRatio; jobs: FoxyVisualJob[]; selectedId: string | null; busy: boolean; error: string | null; pending?: unknown;
  actions: { setKind(value: FoxyVisualKind): void; setPrompt(value: string): void; setAspectRatio(value: FoxyAspectRatio): void; start(): void; retry?(): void; refresh(): void; select(id: string): void };
  assetFileUrl(id: string,mode: 'preview' | 'download'): string };
export function FoxyVisualWorkspace(props: Props) {
  const selected = props.jobs.find(job => job.id === props.selectedId), valid = !!props.prompt.trim() && [...props.prompt].length <= 5000
    && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(props.prompt);
  const preview = selected?.state === 'READY' ? props.assetFileUrl(selected.assetId,'preview') : '';
  const safePreview = selected && preview === `/api/v1/foxy-ai/assets/${selected.assetId}/file?mode=preview` ? preview : '';
  return <section className={styles.tool} aria-label="Imágenes y esquemas">
    <h3>Imágenes y esquemas</h3><p>Creá un recurso visual usando el contexto y las fuentes seleccionadas. Revisalo antes de compartirlo.</p>
    <form onSubmit={event => { event.preventDefault(); if (!props.busy && !props.pending && props.capabilities[props.kind] && valid) props.actions.start(); }}>
      <label>Tipo de recurso <select value={props.kind} onChange={event => props.actions.setKind(event.target.value as FoxyVisualKind)}>
        <option value="IMAGE">Imagen{props.capabilities.IMAGE ? '' : ' · No disponible'}</option>
        <option value="DIAGRAM">Esquema{props.capabilities.DIAGRAM ? '' : ' · No disponible'}</option>
      </select></label>
      <label>Proporción <select value={props.aspectRatio} onChange={event => props.actions.setAspectRatio(event.target.value as FoxyAspectRatio)}>
        <option value="1:1">1:1</option><option value="4:3">4:3</option><option value="3:4">3:4</option><option value="16:9">16:9</option>
      </select></label>
      <label>¿Qué querés crear? <textarea value={props.prompt} onChange={event => props.actions.setPrompt(event.target.value)} /></label>
      <button type="submit" className="p5-primary" disabled={props.busy || !!props.pending || !props.capabilities[props.kind] || !valid}>Generar</button>
    </form>
    {props.error ? <div role="alert"><p>{props.error}</p>{props.pending && props.actions.retry ? <button type="button" disabled={props.busy} onClick={() => props.actions.retry?.()}>Reintentar solicitud</button> : null}</div> : null}
    <div aria-live="polite"><h4>Recursos visuales</h4>
      <button type="button" disabled={props.busy} onClick={() => props.actions.refresh()}>Actualizar</button>
      <ul>{props.jobs.map(job => <li key={job.id}><button type="button" disabled={props.busy} aria-current={job.id === props.selectedId ? 'true' : undefined}
        onClick={() => props.actions.select(job.id)}>{job.kind === 'IMAGE' ? 'Imagen' : 'Esquema'} · {job.state === 'QUEUED' ? 'En espera' : job.state === 'RUNNING' ? 'Generando' : job.state === 'READY' ? 'Listo' : 'No se pudo generar'}</button></li>)}</ul>
      {selected?.state === 'READY' && safePreview ? <img src={safePreview} alt={selected.kind === 'IMAGE' ? 'Vista previa de la imagen generada' : 'Vista previa del esquema generado'} style={{ maxWidth: '100%', height: 'auto' }} /> : null}
    </div>
  </section>;
}
