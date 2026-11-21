import { parseFoxyDiagram } from '../../../../../../src/core/domain/foxy/visual-validation.ts';
import { type FoxyDiagram } from '../../../../../../src/core/domain/foxy/visual.ts';
import { type FoxyPrivateAssetInspection } from '../../../../../../src/core/domain/foxy/asset.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { ReactNode } from 'react';
import { InteractiveDiagram, VisualCreationCover, VisualFocusPage } from '../../../../../shared-ui/interactive-diagram';
import styles from '../../../../../shared-ui/interactive-diagram.module.css';

export type FoxyVisualReaderProps = {
  assetId: string;
  inspection: FoxyPrivateAssetInspection | null;
  loading: boolean;
  error: string | null;
  onClose(): void;
  onRetry(): void;
  onShare(): void;
  onEdit?(): void;
  onRepeat?(): void;
  assetFileUrl(id: string, mode: 'preview' | 'download'): string;
  published?: boolean;
  locked?: boolean;
  editLocked?: boolean;
  inline?: boolean;
  sourceAction?: ReactNode;
};

export function visualReaderPreview(props: Pick<FoxyVisualReaderProps, 'assetId' | 'inspection' | 'assetFileUrl' | 'loading' | 'error'>) {
  const info = props.inspection, id = props.assetId;
  if (props.loading || props.error || !info || info.asset.id !== id || info.asset.state !== 'READY' ||
    !info.canPreview || !info.payload || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(id)) return '';
  const url = props.assetFileUrl(id, 'preview');
  return url === `/api/v1/foxy-ai/assets/${id}/file?mode=preview` ? url : '';
}

function readableDiagram(info: FoxyPrivateAssetInspection | null): FoxyDiagram | null {
  if (info?.asset.kind !== 'DIAGRAM' || !info.payload?.diagram) return null;
  try {
    const diagram = parseFoxyDiagram(info.payload.diagram);
    return diagram.nodes.length ? diagram : null;
  } catch { return null; }
}

export function FoxyVisualReader(props: FoxyVisualReaderProps) {
  const preview = visualReaderPreview(props), info = preview ? props.inspection : null;
  const diagram = readableDiagram(info);
  const title = info?.editorial?.title ?? info?.payload?.title ?? '';
  const description = info?.editorial?.description ?? info?.payload?.description ?? '';
  const fileUrl = preview ? props.assetFileUrl(props.assetId, 'download') : '';
  const download = fileUrl === `/api/v1/foxy-ai/assets/${props.assetId}/file?mode=download` ? fileUrl : '';
  const body = props.loading ? <p role="status">Cargando creación…</p> : !info ? <div role="alert">
        <p>{props.error ?? 'Esta creación no está disponible.'}</p>
        <button type="button" onClick={props.onRetry}>Reintentar</button>
      </div> : <article className="parity-foxy-reader">
        <VisualCreationCover title={title} label={info.asset.kind === 'DIAGRAM' ? 'Borrador docente · Esquema de conceptos' : 'Borrador docente · Ilustración'}
          description={props.inline ? description : undefined} image={info.asset.kind === 'IMAGE'} action={props.sourceAction} />
        {diagram ? <InteractiveDiagram diagram={diagram} teacher /> :
          <figure className="parity-foxy-generatedImage"><img src={preview} alt={title} /></figure>}
        {!props.inline && description && <p className="parity-foxy-readingBody parity-foxy-visualText">{description}</p>}
        {props.published && <p>Editar esta creación no modifica lo que ya compartiste.</p>}
        <p className="parity-foxy-readingNote">Revisá los conceptos y fuentes antes de usarlo.</p>
      </article>;
  const actions = <>
      {!props.inline && <button type="button" onClick={props.onClose}>Volver al chat</button>}
      {info && <>
        {props.onRepeat && <button type="button" disabled={props.locked || props.editLocked} onClick={props.onRepeat}>
          <FoxmindIcon name="refresh" />Volver a preparar
        </button>}
        {info.canEdit && props.onEdit && <button type="button" disabled={props.locked || props.editLocked} onClick={props.onEdit}>
          <FoxmindIcon name="edit" />Editar
        </button>}
        {download && <a className="p5-action" href={download}><FoxmindIcon name="download" />Descargar archivo visual</a>}
        <button type="button" className="p5-primary" disabled={props.locked} onClick={props.onShare}>
          <FoxmindIcon name="book" />Llevar a Biblioteca
        </button>
      </>}
  </>;
  if (props.inline) return <VisualFocusPage onClose={props.onClose} disabled={props.locked}>
    {body}
    {info && <footer className={styles.focusFooter}>{actions}</footer>}
  </VisualFocusPage>;
  return <>
    <header>
      <div><h2 id="foxy-visual-reader-title" tabIndex={-1}>Tu creación</h2><p>Imágenes y esquemas</p></div>
      <button type="button" className="p5-close" aria-label="Cerrar diálogo" disabled={props.locked} onClick={props.onClose}>
        <FoxmindIcon name="close" />
      </button>
    </header>
    <div className="brujula-dialog-body">{body}</div>
    <footer className="parity-foxy-dialogFooter">{actions}</footer>
  </>;
}
