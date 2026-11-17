import { Dialog } from '../../../../../../shared-ui/feedback';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import type { StudyPractice } from '../../model/study-contracts.ts';
export function StudyPracticePreview({
  practice,
  onClose,
  onDownload,
  onStart,
}: {
  practice: StudyPractice;
  onClose: () => void;
  onDownload: () => void;
  onStart: () => void;
}) {
  return (
    <Dialog title="Tu creación" className="study-exact-reading-dialog" onClose={onClose}>
      <p className="study-exact-subtitle">Preguntas con orientación.</p>
      <article className="study-exact-reader-content">
        <div className="study-exact-reader-title">
          <span className="study-exact-tool-icon sky">
            <FoxmindIcon name="edit" />
          </span>
          <div>
            <small>Creación privada</small>
            <h3>{practice?.title ?? 'Práctica personal'}</h3>
          </div>
        </div>
        <p>
          Vas a responder {practice?.questions.length} preguntas, una por pantalla. Tus respuestas
          se guardan en esta carpeta.
        </p>
        <h4>A tu ritmo</h4>
        <p>Podés volver a las preguntas y revisar todo antes de finalizar.</p>
        <h4>Al terminar</h4>
        <p>
          Recibís una orientación por respuesta. No se envía a un docente ni modifica una nota
          académica.
        </p>
      </article>
      <footer className="study-exact-dialog-footer">
        <button onClick={onClose}>Cerrar</button>
        <button onClick={onDownload}>
          <FoxmindIcon name="download" />
          Descargar TXT
        </button>
        <button className="primary" onClick={onStart}>
          {practice?.status === 'FINALIZED'
            ? 'Ver orientación'
            : Object.keys(practice?.answers ?? {}).length
              ? 'Retomar práctica'
              : 'Empezar práctica'}
        </button>
      </footer>
    </Dialog>
  );
}
