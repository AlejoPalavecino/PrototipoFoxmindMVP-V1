import { useId, useState } from 'react';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { DocumentEditor } from '../../../../../shared-ui/document-editor';
import { DocumentReader } from '../../../../../shared-ui/document-reader';
import { DocumentDownloads } from '../../../../../shared-ui/document-downloads';
import type { DocumentIllustration } from '../../../../../shared-ui/document-pdf';
import type { StudyCreation, StudySource } from '../model/study-contracts.ts';
import { StudyDiagramReader } from './study-diagram-reader';

type Props = {
  creation: StudyCreation;
  onClose: () => void;
  onSave: (title: string, body: string) => Promise<boolean>;
  disabled: boolean;
  illustrations?: readonly DocumentIllustration[];
  availableIllustrations?: readonly DocumentIllustration[];
  diagramSources?: { folderId: string; items: StudySource[] };
  onRepeatDiagram?(): void;
  inlineDiagram?: boolean;
};
export function StudyCreationEditor(props: Props) {
  const { creation, onClose } = props;
  if (creation.kind === 'OUTLINE' && creation.diagram) {
    return <StudyDiagramReader key={creation.id} diagram={creation.diagram} title={creation.title}
      sourceUnavailable={creation.sourceUnavailable} sources={props.diagramSources} onClose={onClose} onRepeat={props.onRepeatDiagram}
      inline={props.inlineDiagram} />;
  }
  return <StudyDocumentEditor {...props}/>;
}

export function StudyDocumentEditor({ creation, onClose, onSave, disabled, illustrations, availableIllustrations }: Props) {
  const savedBody = creation.markdown ?? creation.body ?? '';
  const [editing, setEditing] = useState(false),
    [title, setTitle] = useState(creation.title),
    [body, setBody] = useState(savedBody),
    [discard, setDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editorId = useId();
  const explanation = creation.kind === 'EXPLANATION';
  const outline = creation.kind === 'OUTLINE';
  const label = explanation ? 'Explicación' : outline ? 'Esquema' : 'Apunte';
  const dirty = title !== creation.title || body !== savedBody;
  function cancel() {
    if (saving) return;
    if (dirty) setDiscard(true);
    else setEditing(false);
  }
  async function save() {
    if (!dirty || saving || disabled) return;
    if (!title.trim() || !body.trim() || [...body].length > 80000) {
      setError('Escribí un título y contenido válido de hasta 80000 caracteres.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (await onSave(title, body)) setEditing(false);
      else setError('No pudimos guardar los cambios. Volvé a intentarlo.');
    } catch {
      setError('No pudimos guardar los cambios. Volvé a intentarlo.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      title={editing ? 'Editar creación' : 'Tu creación'}
      className="study-exact-reading-dialog study-document-reader"
      onClose={() => (editing ? cancel() : onClose())}
    >
      <p className="study-exact-subtitle">
        {editing
          ? 'Los cambios quedan en tu creación privada.'
          : label}
      </p>
      {creation.sourceUnavailable && (
        <Notice>Una fuente ya no está disponible. Esta creación se conserva como historial.</Notice>
      )}
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            Título
            <input
              autoFocus
              required
              maxLength={120}
              value={title}
              disabled={saving}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <strong>Contenido</strong>
          <DocumentEditor id={editorId} value={body} onChange={setBody} disabled={saving || disabled}/>
          {error && <Notice error>{error}</Notice>}
          <footer className="study-exact-dialog-footer">
            <button type="button" disabled={saving} onClick={cancel}>
              Cancelar
            </button>
            <button className="primary" disabled={disabled || saving || !dirty}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      ) : (
        <>
          <article className="study-exact-reader-content">
            <div className="study-exact-reader-title">
              <span className="study-exact-tool-icon sky">
                <FoxmindIcon name={outline ? 'layers' : explanation ? 'book' : 'file'} />
              </span>
              <div>
                <small>Creación privada</small>
                <h3>{creation.title}</h3>
              </div>
            </div>
            <DocumentReader title={creation.title} markdown={savedBody} explanation={explanation} illustrations={illustrations}/>
          </article>
          <footer className="study-exact-dialog-footer">
            <button onClick={onClose}>Cerrar</button>
            <button disabled={disabled} onClick={() => {
              setTitle(creation.title);
              setBody(savedBody);
              setError('');
              setEditing(true);
            }}>
              <FoxmindIcon name="edit" />
              Editar
            </button>
            <DocumentDownloads title={creation.title} markdown={savedBody} kind={label} illustrations={illustrations}
              availableIllustrations={availableIllustrations}/>
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
