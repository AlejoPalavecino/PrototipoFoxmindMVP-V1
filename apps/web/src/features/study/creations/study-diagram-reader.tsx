import { useState } from 'react';
import type { FoxyDiagram } from '../../../../../../src/core/domain/foxy/visual.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { InteractiveDiagram, VisualCreationCover, VisualFocusPage } from '../../../../../shared-ui/interactive-diagram';
import styles from '../../../../../shared-ui/interactive-diagram.module.css';
import type { StudySource } from '../model/study-contracts.ts';
import { StudyReferencedMaterialsDialog } from '../ui/study-referenced-materials-dialog';

export function StudyDiagramReader({ diagram, title, sourceUnavailable, sources, onClose, onRepeat, inline = false }: {
  diagram: FoxyDiagram;
  title: string;
  sourceUnavailable?: boolean;
  sources?: { folderId: string; items: StudySource[] };
  inline?: boolean;
  onClose(): void;
  onRepeat?(): void;
}) {
  const [showSources, setShowSources] = useState(false);
  const materials = sources?.items ?? [];
  const body = <>
    <VisualCreationCover title={title} label="Mi Estudio · Esquema interactivo" description={diagram.description}
      action={materials.length ? <button className={styles.secondary} type="button" onClick={() => setShowSources(true)}>
        <FoxmindIcon name="book" />{materials.length === 1 ? 'Ver material' : 'Ver fuentes'}
      </button> : undefined} />
    {sourceUnavailable && <Notice>Una fuente ya no está disponible. Esta creación se conserva como historial.</Notice>}
    <InteractiveDiagram diagram={diagram} />
    <footer className={inline ? styles.focusFooter : 'study-exact-dialog-footer'}>
      {!inline && <button type="button" onClick={onClose}>Volver al chat</button>}
      {onRepeat && <button type="button" onClick={onRepeat}><FoxmindIcon name="refresh" />Volver a preparar</button>}
    </footer>
    {showSources && sources && <StudyReferencedMaterialsDialog {...sources} onClose={() => setShowSources(false)} />}
  </>;
  return inline ? <VisualFocusPage onClose={onClose}>{body}</VisualFocusPage> :
    <Dialog title="Tu creación" className={`study-exact-reading-dialog ${styles.readerDialog}`} onClose={onClose}>{body}</Dialog>;
}
