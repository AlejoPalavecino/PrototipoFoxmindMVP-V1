import { FoxmindIllustration } from './FoxmindIllustration';

/** Indeterminate progress: only server states advance, never an invented timer. */
export function AiProgress({ state, task }: { state: 'SENDING' | 'QUEUED' | 'RUNNING'; task: 'activity' | 'plan' }) {
  const title = state === 'SENDING' ? 'Enviando tu solicitud' : state === 'QUEUED' ? 'En espera para comenzar' : task === 'plan' ? 'Leyendo tu plan de estudio' : 'Preparando tu propuesta';
  return <section className="education-ai-progress" role="status" aria-live="polite" aria-atomic="true">
    <FoxmindIllustration name="states/empty" sizes="96px" />
    <div><span className="education-eyebrow">Asistente FoxMind</span><h3>{title}</h3>
      <p>{state === 'QUEUED' ? 'La solicitud está en cola. Esta pantalla se actualizará cuando comience.' : state === 'SENDING' ? 'Esperamos la confirmación del servidor. No hace falta volver a enviar.' : 'La IA está trabajando con el contenido. Cuando termine, podrás revisar y editar la propuesta.'}</p>
      <div className="education-indeterminate" aria-hidden="true"><span /></div>
      <small>{task === 'activity' ? 'Podés volver desde Generaciones recientes. Cerrar no cancela un trabajo enviado.' : 'Podés continuar con las unidades manualmente. Cerrar no cancela el análisis enviado.'}</small>
    </div>
  </section>;
}
