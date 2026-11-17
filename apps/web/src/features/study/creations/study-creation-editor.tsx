import { useState } from 'react';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { FoxyMarkdown } from '../../../../../shared-ui/markdown';
import { downloadPlainText, downloadTextDocument } from '../../../../../shared-ui/text-document';
import type { StudyCreation } from '../model/study-contracts.ts';
export function StudyCreationEditor({
  creation,
  onClose,
  onSave,
  disabled,
}: {
  creation: StudyCreation;
  onClose: () => void;
  onSave: (title: string, body: string) => Promise<unknown>;
  disabled: boolean;
}) {
  const savedBody = creation.markdown ?? creation.body ?? '';
  const [editing, setEditing] = useState(false),
    [title, setTitle] = useState(creation.title),
    [body, setBody] = useState(savedBody),
    [discard, setDiscard] = useState(false);
  const dirty = title !== creation.title || body !== savedBody;
  function cancel() {
    if (dirty) setDiscard(true);
    else setEditing(false);
  }
  return (
    <Dialog
      title={editing ? 'Dale tu mirada' : 'Tu creación'}
      className="study-exact-reading-dialog"
      onClose={() => (editing ? cancel() : onClose())}
    >
      <p className="study-exact-subtitle">
        {editing
          ? 'Los cambios quedan en tu creación privada.'
          : creation.kind === 'NOTE'
            ? 'Preparar un apunte'
            : 'Conectar ideas'}
      </p>
      {creation.sourceUnavailable && (
        <Notice>Una fuente ya no está disponible. Esta creación se conserva como historial.</Notice>
      )}
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(title, body);
          }}
        >
          <label>
            Título
            <input
              autoFocus
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Contenido
            <textarea
              required
              value={body}
              rows={12}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <footer className="study-exact-dialog-footer">
            <button type="button" onClick={cancel}>
              Cancelar
            </button>
            <button className="primary" disabled={disabled || !dirty}>
              Guardar cambios
            </button>
          </footer>
        </form>
      ) : (
        <>
          <article className="study-exact-reader-content">
            <div className="study-exact-reader-title">
              <span className="study-exact-tool-icon sky">
                <FoxmindIcon name={creation.kind === 'OUTLINE' ? 'layers' : 'file'} />
              </span>
              <div>
                <small>Creación privada</small>
                <h3>{title}</h3>
              </div>
            </div>
            <FoxyMarkdown markdown={body} />
          </article>
          <footer className="study-exact-dialog-footer">
            <button onClick={onClose}>Cerrar</button>
            <button disabled={disabled} onClick={() => setEditing(true)}>
              <FoxmindIcon name="edit" />
              Editar
            </button>
            <button onClick={() => downloadPlainText(creation.title, savedBody)}>
              <FoxmindIcon name="download" />
              Descargar TXT
            </button>
            <button onClick={() => downloadTextDocument(creation.title, savedBody)}>
              <FoxmindIcon name="download" />
              Descargar Word
            </button>
          </footer>
        </>
      )}
      {discard && (
        <Dialog title="¿Descartás tus cambios?" onClose={() => setDiscard(false)}>
          <p>Podés volver al editor y seguir con tu idea. La versión guardada se conserva.</p>
          <footer className="study-exact-dialog-footer">
            <button onClick={() => setDiscard(false)}>Seguir editando</button>
            <button
              onClick={() => {
                setTitle(creation.title);
                setBody(savedBody);
                setDiscard(false);
                setEditing(false);
              }}
            >
              Descartar
            </button>
          </footer>
        </Dialog>
      )}
    </Dialog>
  );
}
