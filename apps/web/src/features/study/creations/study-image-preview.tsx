import { useState } from 'react';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { VisualCreationCover } from '../../../../../shared-ui/interactive-diagram';
import type { StudyCreation } from '../model/study-contracts.ts';

export function StudyImagePreview({ folderId, creation, onClose, onRepeat }: {
  folderId: string;
  creation: StudyCreation;
  onClose: () => void;
  onRepeat?(): void;
}) {
  const [failed, setFailed] = useState(false);
  const src = `/api/v1/study-folders/${encodeURIComponent(folderId)}/images/${encodeURIComponent(creation.id)}`;

  return (
    <Dialog title="Tu imagen" className="study-exact-reading-dialog study-exact-image-dialog" onClose={onClose}>
      <article className="study-exact-reader-content">
        <VisualCreationCover title={creation.title} label="Mi Estudio · Ilustración" image />
        {failed ? <Notice error>No pudimos cargar la imagen. Volvé a abrirla para intentar de nuevo.</Notice> : (
          <img className="study-exact-image-preview" src={src} alt={creation.title} onError={() => setFailed(true)} />
        )}
      </article>
      <footer className="study-exact-dialog-footer">
        <button type="button" onClick={onClose}>Volver al chat</button>
        {onRepeat && <button type="button" onClick={onRepeat}><FoxmindIcon name="refresh" />Volver a preparar</button>}
        <a href={`${src}?mode=download`} download><FoxmindIcon name="download" />Descargar imagen</a>
      </footer>
    </Dialog>
  );
}
