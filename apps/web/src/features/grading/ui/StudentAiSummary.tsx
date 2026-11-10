'use client';
import { useEffect, useState } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';

type Finding = { text: string; evidenceRefs: string[] };
type Report = {
  overview: string;
  strengths: Finding[];
  supportNeeds: Finding[];
  recommendations: Finding[];
  limitations: string[];
};
type Summary = {
  state: 'PENDING' | 'RUNNING' | 'READY' | 'INSUFFICIENT_EVIDENCE' | 'STALE' | 'FAILED' | 'DISABLED';
  generatedAt: string | null;
  evidenceHash: string | null;
  evidenceReferences?: { ref: string; title: string }[];
  report: Report | null;
  error: string | null;
};
const messages: Record<Summary['state'], string> = {
  PENDING: 'El análisis está pendiente de generación.',
  RUNNING: 'El análisis se está generando.',
  READY: 'Análisis disponible.',
  INSUFFICIENT_EVIDENCE: 'Todavía no hay evidencia suficiente para generar un análisis.',
  STALE: 'La evidencia cambió desde el último análisis. El informe puede estar desactualizado.',
  FAILED: 'No se pudo generar el análisis. Intentalo nuevamente más tarde.',
  DISABLED: 'El análisis con IA no está habilitado.',
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
    <Notice>{messages[data.state]}</Notice>
    {data.generatedAt ? <p>Actualizado: {new Date(data.generatedAt).toLocaleString('es-AR')}</p> : null}
    {data.report && (data.state === 'READY' || data.state === 'STALE') ? <>
      <p>{data.report.overview}</p>
      <Findings title="Fortalezas" items={data.report.strengths} references={references} />
      <Findings title="Necesidades de apoyo" items={data.report.supportNeeds} references={references} />
      <Findings title="Recomendaciones" items={data.report.recommendations} references={references} />
      <section><h4>Límites del análisis</h4>{data.report.limitations.length ?
        <ul>{data.report.limitations.map((limit, index) => <li key={index}>{limit}</li>)}</ul> :
        <p>Sin límites adicionales registrados.</p>}</section>
    </> : null}
    <p><small>Este análisis es orientativo y debe revisarse junto con la evidencia y el criterio docente.</small></p>
  </>;
}

export function StudentAiSummary({ api, classroomId, studentId }: {
  api: ClassroomClient; classroomId: string; studentId: string;
}) {
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Summary | null>(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError('');
    void api.call<Summary>(`/${classroomId}/members/${studentId}/ai-summary`, undefined, undefined, controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, classroomId, studentId, refresh]);
  return <section aria-label="Análisis individual con IA" aria-busy={loading}>
    <h3>Análisis individual con IA</h3>
    {loading ? <Notice>Cargando análisis…</Notice> : null}
    {error ? <Notice error>No se pudo cargar el análisis. <button type="button" onClick={() => setRefresh(value => value + 1)}>Reintentar</button></Notice> : null}
    {data ? <Analysis data={data} /> : null}
    <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Actualizar análisis</button>
  </section>;
}
