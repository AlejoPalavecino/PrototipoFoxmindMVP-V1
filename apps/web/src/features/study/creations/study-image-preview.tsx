import { useState } from 'react';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { StudyCreation } from '../model/study-contracts.ts';

export function StudyImagePreview({ folderId, creation, onClose }: {
  folderId: string;
  creation: StudyCreation;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = `/api/v1/study-folders/${encodeURIComponent(folderId)}/images/${encodeURIComponent(creation.id)}`;

  return (
    <Dialog title="Tu imagen" className="study-exact-reading-dialog study-exact-image-dialog" onClose={onClose}>
      <article className="study-exact-reader-content">
        <div className="study-exact-reader-title">
          <span className="study-exact-tool-icon sky"><FoxmindIcon name="spark" /></span>
          <div>
            <small>Imagen privada</small>
            <h3>{creation.title}</h3>
          </div>
        </div>
        {failed ? <Notice error>No pudimos cargar la imagen. Volvé a abrirla para intentar de nuevo.</Notice> : (
          <img className="study-exact-image-preview" src={src} alt={creation.title} onError={() => setFailed(true)} />
        )}
      </article>
      <footer className="study-exact-dialog-footer">
        <button type="button" onClick={onClose}>Cerrar</button>
        <a href={`${src}?mode=download`} download><FoxmindIcon name="download" />Descargar imagen</a>
      </footer>
    </Dialog>
  );
}
