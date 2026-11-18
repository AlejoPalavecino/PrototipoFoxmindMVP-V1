'use client';
import { useEffect, useState } from 'react';
import type { StudentSummaryOperations, StudentSummary, StudentSummaryFinding } from '../model/grading-operations.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { isAiBudgetRejectionCode, type AiBudgetRejectionCode } from '../../../../../../src/core/contracts/ai-quota.ts';

type Finding = StudentSummaryFinding;
type Summary = StudentSummary;
const messages: Record<Summary['state'], string> = {
  PENDING: 'El análisis está pendiente de generación.',
  RUNNING: 'El análisis se está generando.',
  READY: 'Análisis disponible.',
  INSUFFICIENT_EVIDENCE: 'Todavía no hay evidencia suficiente para generar un análisis.',
  STALE: 'La evidencia cambió desde el último análisis. El informe puede estar desactualizado.',
  FAILED: 'No se pudo generar el análisis. Intentalo nuevamente más tarde.',
  DISABLED: 'El análisis con IA no está habilitado.',
};
const budgetMessages: Record<AiBudgetRejectionCode, string> = {
  AI_MONTHLY_BUDGET_EXCEEDED: 'El saldo mensual de IA disponible no alcanza para este análisis. Revisá tu cuota en la cabecera.',
  AI_GLOBAL_DAILY_BUDGET_EXCEEDED: 'FoxMind alcanzó su límite diario general de IA. Volvé a consultar más tarde.',
  AI_BUDGET_EXCEEDED: 'Alcanzaste tu límite diario de IA. Volvé a consultar más tarde.',
};

function Findings({ title, items, references }: { title: string; items: Finding[]; references: Map<string, string> }) {
  return <section><h4>{title}</h4>{items.length ? <ul>{items.map((item, index) =>
    <li key={index}><p>{item.text}</p>{item.evidenceRefs.length ?
      <small>Referencias de evidencia: {item.evidenceRefs.map(ref => references.has(ref) ? `${ref}: ${references.get(ref)}` : ref).join(', ')}</small> : null}</li>,
  )}</ul> : <p>Sin hallazgos registrados.</p>}</section>;
}

function Analysis({ data }: { data: Summary }) {
  const references = new Map((data.state === 'READY' ? data.evidenceReferences ?? [] : []).map(item => [item.ref, item.title]));
  return <>
    <Notice>{data.state === 'FAILED' && isAiBudgetRejectionCode(data.error) ? budgetMessages[data.error] : messages[data.state]}</Notice>
    {data.generatedAt ? <p>Actualizado: {new Date(data.generatedAt).toLocaleString('es-AR')}</p> : null}
    {data.report && (data.state === 'READY' || data.state === 'STALE') ? <>
      <p>{data.report.overview}</p>
      <Findings title="Fortalezas" items={data.report.strengths} references={references} />
      <Findings title="Necesidades de apoyo" items={data.report.supportNeeds} references={references} />
      <Findings title="Próximos pasos para acompañar" items={data.report.recommendations} references={references} />
      <section><h4>Límites del análisis</h4>{data.report.limitations.length ?
        <ul>{data.report.limitations.map((limit, index) => <li key={index}>{limit}</li>)}</ul> :
        <p>Sin límites adicionales registrados.</p>}</section>
    </> : null}
    <p><small>El análisis orienta con datos de entregas, puntualidad y notas publicadas. Revisá el trabajo del estudiante antes de decidir cómo acompañarlo.</small></p>
  </>;
}

export function StudentAiSummary({ operations, classroomId, studentId }: {
  operations: StudentSummaryOperations; classroomId: string; studentId: string;
}) {
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Summary | null>(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError('');
    void operations.load(controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [operations, classroomId, studentId, refresh]);
  return <section aria-label="Análisis individual con IA" aria-busy={loading}>
    <h3>Análisis individual con IA</h3>
    {loading ? <Notice>Cargando análisis…</Notice> : null}
    {error ? <Notice error>No se pudo cargar el análisis. <button type="button" onClick={() => setRefresh(value => value + 1)}>Reintentar</button></Notice> : null}
    {data ? <Analysis data={data} /> : null}
    <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Volver a consultar</button>
  </section>;
}
