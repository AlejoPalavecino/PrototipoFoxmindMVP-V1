import { useEffect, useState } from 'react';
import { Dialog } from '../../../../shared-ui/feedback.tsx';
import { subscribeAiQuota, type AiQuotaState } from './ai-quota-client.ts';
import styles from './ai-quota-indicator.module.css';

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 6 });
function money(microusd: number) { return usd.format(microusd / 1_000_000); }

const renewal = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
});
const capabilities: Record<string, string> = {
  curriculum: 'Planes de aula',
  activities: 'Actividades',
  analysis: 'Análisis de entregas',
  'writing-analysis': 'Análisis de escritura',
  grading: 'Devoluciones',
  foxy: 'Foxy AI (grupo anterior)',
  foxy_chat: 'Chat de Foxy',
  foxy_study_material: 'Material de estudio de Foxy',
  foxy_review: 'Repasos de Foxy',
  foxy_summary: 'Resúmenes de Foxy',
  foxy_activity_ideas: 'Ideas de actividades de Foxy',
  foxy_lesson_plan: 'Planes de clase de Foxy',
  foxy_rubric: 'Rúbricas de Foxy',
  foxy_image: 'Imágenes de Foxy',
  foxy_diagram: 'Diagramas de Foxy',
  foxy_visual_jobs: 'Recursos visuales de Foxy',
  study: 'Mi estudio (grupo anterior)',
  study_chat: 'Chat de Mi estudio',
  study_tool: 'Herramientas de Mi estudio (grupo anterior)',
  study_feedback: 'Repaso de devoluciones',
  study_image: 'Imágenes de Mi estudio',
  study_note: 'Apuntes de Mi estudio',
  study_outline: 'Esquemas de Mi estudio',
  study_plan: 'Planes de Mi estudio',
  study_quiz: 'Cuestionarios de Mi estudio',
  study_exercise: 'Ejercicios de Mi estudio',
  study_mock_exam: 'Simulacros de Mi estudio',
  study_review_plan: 'Planes de repaso de Mi estudio',
};

function operations(count: number) { return `${count} ${count === 1 ? 'operación' : 'operaciones'}`; }

export function AiQuotaIndicator({ subjectId }: { subjectId: string }) {
  const [state, setState] = useState<AiQuotaState>({ snapshot: null, connected: false });
  const [open, setOpen] = useState(false);
  useEffect(() => subscribeAiQuota(subjectId, setState), [subjectId]);
  const snapshot = state.snapshot;
  const pct = snapshot?.limitMicrousd ? Math.min(100, Math.floor(snapshot.remainingMicrousd / snapshot.limitMicrousd * 100)) : 0;
  const status = state.unavailable ? 'Saldo no disponible' : !state.connected ? 'Actualizando saldo' : null;
  const label = snapshot ? `IA · ${pct} % disponible` : 'IA · saldo';
  return <div className="fm-ai-quota-slot">
    <button className={styles.trigger} type="button" aria-haspopup="dialog" aria-label={status ? `${label}. ${status}` : label}
      aria-expanded={open} onClick={() => setOpen(true)}>
      <span className={styles.prefix}>IA</span>
      {snapshot && <><span className={styles.separator}> · </span><span>{pct} %</span><span className={styles.available}> disponible</span></>}
      {!snapshot && <span className={styles.available}> · saldo</span>}
    </button>
    {open && <Dialog title="Tu cuota mensual de IA" onClose={() => setOpen(false)} className={styles.dialog} labeledClose>
      <div className={styles.detail}>
        <div role="status">{status}</div>
        {snapshot && <>
          <dl className={styles.summary}>
            <div><dt>Disponible</dt><dd><strong>{money(snapshot.remainingMicrousd)}</strong></dd></div>
            <div><dt>Límite mensual</dt><dd>{money(snapshot.limitMicrousd)}</dd></div>
            <div><dt>Consumido</dt><dd>{money(snapshot.consumedMicrousd)}</dd></div>
            <div><dt>Reservado</dt><dd>{money(snapshot.reservedMicrousd)}</dd></div>
          </dl>
          <p className={styles.renewal}>Se renueva el <time dateTime={snapshot.renewsAt}>{renewal.format(new Date(snapshot.renewsAt))}</time>, hora de Buenos Aires.</p>
          <h3>Uso por herramienta</h3>
          {snapshot.tools.length === 0 ? <p>Todavía no hay consumos ni reservas este mes.</p> : <>
            <table className={styles.tools}>
              <thead><tr><th scope="col">Herramienta</th><th scope="col">Consumido</th><th scope="col">Reservado</th></tr></thead>
              <tbody>{snapshot.tools.map(tool => <tr key={tool.capability}>
                <th scope="row">{Object.hasOwn(capabilities, tool.capability) ? capabilities[tool.capability] : tool.capability}</th>
                <td>{money(tool.consumedMicrousd)}{tool.chargedOperations > 0 && <span className={styles.operations}>{operations(tool.chargedOperations)}</span>}</td>
                <td>{money(tool.reservedMicrousd)}{tool.reservedOperations > 0 && <span className={styles.operations}>{operations(tool.reservedOperations)}</span>}</td>
              </tr>)}</tbody>
            </table>
            <p className={styles.usageNote}>Los recuentos incluyen operaciones de IA aunque no se haya guardado un recurso.</p>
          </>}
        </>}
      </div>
    </Dialog>}
  </div>;
}
