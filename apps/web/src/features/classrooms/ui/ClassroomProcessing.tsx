import { Dialog } from '../../../../../shared-ui/feedback.tsx';

function ProcessIcon({ complete = false }: { complete?: boolean }) {
  return <svg className="fm3d-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {complete ? <path d="m20 6-11 11-5-5"/> : <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>}
  </svg>;
}

export type ClassroomProcessStage = 'upload' | 'validation' | 'sending' | 'queued' | 'running' | 'upload-error' | 'analysis-error';
export function ClassroomProcessing({ stage, message, consultationFailed = false, retrying = false, retryLabel = 'Volver a intentar', onBack, onRetry, onManual }: {
  stage: ClassroomProcessStage; message?: string; consultationFailed?: boolean; retrying?: boolean; retryLabel?: string;
  onBack: () => void; onRetry?: () => void; onManual?: () => void;
}) {
  const upload = ['upload', 'validation', 'upload-error'].includes(stage);
  const failed = stage === 'upload-error' || stage === 'analysis-error';
  const title = consultationFailed ? 'No pudimos consultar el análisis' : failed ? upload ? 'No pudimos preparar tu programa' : 'No pudimos preparar el recorrido'
    : upload ? 'Tu programa está llegando' : 'Foxy está preparando tu recorrido';
  const stages = upload ? ['Recibiendo tu programa', 'Dejándolo listo para trabajar']
    : ['Enviando tu solicitud', 'Esperando el análisis', 'Preparando una propuesta para vos'];
  const current = stage === 'validation' ? 1 : stage === 'queued' ? 1 : stage === 'running' ? 2 : 0;
  return <Dialog title={title} className="parity-classroom-process" onClose={onBack}>
    <div className="class-process">
      <img src={`/foxmind/${upload ? 'classroom-world' : 'foxy'}.webp`} alt="" />
      <span className="class-process-step">Paso 2 de 4</span>
      <h3>{failed ? 'Tu trabajo se conserva' : stages[current]}</h3>
      {failed ? <div className="class-process-error" role="alert"><p>{message || 'Podés volver al programa e intentarlo nuevamente.'}</p></div>
        : <><p>{upload ? 'Enseguida vas a poder elegir cómo organizarlo.' : 'Vos tenés la última palabra: todo se puede revisar y editar.'}</p>
          <div className="class-process-track" role="progressbar" aria-label={upload ? 'Preparación del programa' : 'Preparación del recorrido'} aria-valuetext={stages[current]}><span /></div>
          <ol aria-live="polite">{stages.map((label,index)=><li key={label} className={index<=current?'active':''} aria-current={index===current?'step':undefined}>
            {index<current?<ProcessIcon complete/>:index===current?<span className="class-process-spinner" aria-hidden="true"/>:<ProcessIcon/>}{label}
          </li>)}</ol></>}
      <small>{failed ? 'No se creó el aula ni se aplicó una propuesta.' : upload ? 'Esperamos la confirmación del archivo. No hace falta volver a subirlo.' : 'Podés volver al programa. El análisis puede continuar en el servidor.'}</small>
    </div>
    <footer className="class-process-footer"><button type="button" onClick={onBack}>Volver al programa</button>
      {failed && onManual ? <button type="button" disabled={retrying} onClick={onManual}>Armarlo a mano</button> : null}
      {failed && onRetry ? <button type="button" className="primary" disabled={retrying} onClick={onRetry}>{retrying?'Consultando…':retryLabel}</button> : null}
    </footer>
  </Dialog>;
}
