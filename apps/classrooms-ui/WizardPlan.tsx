import type { RefObject, DragEvent } from 'react';
import type { FileState } from './api.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';

interface Props {
  file: FileState | null;
  uploading: boolean;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  fileUrl: (id: string) => string;
  onFile: (file: File | undefined) => Promise<void>;
  onError: (message: string) => void;
  onRefresh: () => void;
}

function handleDrop(event: DragEvent, props: Props) {
  if (!event.dataTransfer.files.length) return;
  event.preventDefault();
  event.stopPropagation();
  if (props.disabled) return;
  if (event.dataTransfer.files.length !== 1) { props.onError('Elegí un solo archivo por vez.'); return; }
  void props.onFile(event.dataTransfer.files[0]);
}

export function WizardPlan(props: Props) {
  const { file, uploading, disabled, inputRef, fileUrl, onFile, onRefresh } = props;
  return <div className="wizard-plan-layout">
    <div className="wizard-plan-upload">
      <h3>Subí tu archivo</h3>
      <div className="p5-drop" onDrop={event => handleDrop(event, props)}
        onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}>
        <FoxmindIcon name="upload" />
        <strong>{uploading ? 'Subiendo y revisando el archivo…' : 'Arrastrá tu archivo acá'}</strong>
        <label className="wizard-file-picker">o <span>elegí un archivo</span>
          <input ref={inputRef} type="file" accept=".pdf,.docx" disabled={disabled}
            onChange={event => { const target = event.target; void onFile(target.files?.[0]).finally(() => { target.value = ''; }); }} />
        </label>
        <small>PDF o DOCX · Hasta 20 MB</small>
      </div>
      {file ? <div className="p5-file"><FoxmindIcon name="file" /><div>
        <strong>{file.name}</strong><span>{file.ready ? 'Aprobado para usar'
          : `Carga: ${file.upload} · Validación: ${file.validation} · Análisis: ${file.scan}`}</span>
        {file.ready ? <a href={fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar plan</a>
          : <button type="button" disabled={disabled} onClick={onRefresh}>Consultar estado</button>}
      </div><button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <FoxmindIcon name="refresh" />Reemplazar archivo</button></div>
        : <p className="wizard-plan-security"><FoxmindIcon name="shield" />El plan estará disponible cuando supere la validación y el análisis de seguridad.</p>}
    </div>
    <aside className="wizard-plan-tips"><h3><FoxmindIcon name="spark" />Consejos para un mejor resultado</h3>
      <section><FoxmindIcon name="check" /><div><h4>Incluí objetivos, unidades o ejes temáticos</h4><p>Una estructura clara ayuda a interpretar tu plan.</p></div></section>
      <section><FoxmindIcon name="file" /><div><h4>Usá una currícula oficial o una planificación propia</h4><p>Podés subir tu documento en PDF o DOCX.</p></div></section>
      <section><FoxmindIcon name="edit" /><div><h4>Vos decidís qué sugerencias usar</h4><p>Revisá y editá las unidades y temas antes de aplicarlos al aula.</p></div></section>
    </aside>
  </div>;
}
