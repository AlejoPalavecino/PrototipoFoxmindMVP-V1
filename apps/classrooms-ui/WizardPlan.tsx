import type { RefObject, DragEvent } from 'react';
import type { FileState } from './api.ts';
import { FoxmindIcon } from '../shared-ui/index.ts';

interface Props {
  planText: string;
  onPlanText: (value: string) => void;
  onExtractText: () => void;
  onRemoveFile: () => void;
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
  return <div className="brujula-wizard-plan">
    <label>Unidades y temas<textarea autoFocus aria-label="Unidades y temas" rows={7} value={props.planText} disabled={disabled} placeholder={'Unidad 1 · Ecosistemas\nFlujo de energía\nRedes tróficas'} onChange={event => props.onPlanText(event.target.value)} /></label>
    <small>Escribí “Unidad: nombre” y agregá cada tema con “- tema”, uno por línea. El aula necesita al menos una unidad con un tema.</small>
    <button className="brujula-wizard-extract" type="button" disabled={disabled} onClick={props.onExtractText}><FoxmindIcon name="spark" />Extraer unidades de un texto</button>
    <details className="brujula-wizard-file"><summary>Analizar un archivo con IA</summary><p>Si preferís partir de un documento, subí un PDF o DOCX. Revisá la propuesta antes de aplicarla al plan escrito.</p>
    <div className="wizard-plan-layout">
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
    </div>
    {file ? <button type="button" disabled={disabled} onClick={props.onRemoveFile}>Retirar archivo del borrador</button> : null}
    </details>
  </div>;
}
