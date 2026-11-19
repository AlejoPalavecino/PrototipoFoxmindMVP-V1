'use client';
import { useEffect, useRef, useState } from 'react';
import type { TeacherWritingAnalysis, TeacherWritingFinding } from '../../../../../src/core/contracts/teacher-writing.ts';
import { isAiBudgetRejectionCode, type AiBudgetRejectionCode } from '../../../../../src/core/contracts/ai-quota.ts';
import { Notice } from '../../../../shared-ui/feedback.tsx';
import { supportAccessEnded, type TeacherWritingReader } from './model.ts';
import styles from './teacher-support.module.css';

const states: Record<TeacherWritingAnalysis['state'],string> = {
  DISABLED:'El análisis de escritura no está disponible por el momento.',
  INSUFFICIENT:'Todavía no hay producción escrita suficiente para analizar.',
  AVAILABLE:'Podés pedir un análisis de las entregas escritas de esta aula.',
  RUNNING:'Estamos analizando las entregas escritas…',
  READY:'Análisis disponible.',
  STALE:'Cambió la evidencia. Generá un análisis actualizado para ver los hallazgos.',
  FAILED:'No pudimos completar el análisis. Podés volver a intentarlo.',
};
const budgets: Record<AiBudgetRejectionCode,string> = {
  AI_MONTHLY_BUDGET_EXCEEDED:'No alcanza tu saldo mensual de IA. Podés consultar la cuota desde la cabecera.',
  AI_GLOBAL_DAILY_BUDGET_EXCEEDED:'Se alcanzó el límite diario de IA de FoxMind. Volvé a consultar más tarde.',
  AI_BUDGET_EXCEEDED:'Alcanzaste tu límite diario de IA. Volvé a consultar más tarde.',
};

export function TeacherWritingPanel({client,student,onEvidence,onRevoked,active=true,focusKey}: {
  client:TeacherWritingReader; student:{classroomId:string;studentId:string}; onEvidence:(attemptId:string,focusKey:string)=>void;
  onRevoked:()=>void; active?:boolean; focusKey?:string;
}) {
  const {classroomId, studentId} = student;
  const [result,setResult] = useState<TeacherWritingAnalysis|null>(null);
  const [loading,setLoading] = useState(true);
  const [failed,setFailed] = useState(false);
  const [reload,setReload] = useState(0);
  const operation = useRef<AbortController|null>(null);
  const content = useRef<HTMLElement|null>(null);
  const revoked = useRef(onRevoked);
  revoked.current = onRevoked;
  const canGenerate = result && ['AVAILABLE','STALE','FAILED'].includes(result.state);

  function readFailure(error:unknown) {
    setResult(null);
    setFailed(true);
    if (supportAccessEnded(error)) revoked.current();
  }

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    operation.current = controller;
    setLoading(true);
    setFailed(false);
    void client.writing(classroomId,studentId,controller.signal).then(response => {
      if (!controller.signal.aborted) setResult(response);
    }).catch(error => {
      if (!controller.signal.aborted) readFailure(error);
    }).finally(() => {
      if (!controller.signal.aborted) { operation.current=null; setLoading(false); }
    });
    return () => { operation.current?.abort(); operation.current=null; };
  },[client,classroomId,studentId,reload,active]);

  useEffect(() => {
    if (!active || loading || result?.state !== 'RUNNING') return;
    const timer = setTimeout(() => setReload(value => value + 1),1800);
    return () => clearTimeout(timer);
  },[active,loading,result]);

  useEffect(() => {
    if (!active || loading || !focusKey) return;
    const buttons = content.current?.querySelectorAll<HTMLButtonElement>('button[data-support-return]');
    [...(buttons ?? [])].find(button=>button.dataset.supportReturn===focusKey)?.focus();
  },[active,loading,focusKey,result]);

  async function requestWriting() {
    if (operation.current || !canGenerate) return;
    const controller = new AbortController();
    operation.current = controller;
    setResult(null);
    setFailed(false);
    setLoading(true);
    try {
      const response = await client.requestWriting(classroomId,studentId,controller.signal);
      if (!controller.signal.aborted) setResult(response);
    } catch(error) {
      if (!controller.signal.aborted) readFailure(error);
    } finally {
      if (!controller.signal.aborted) { operation.current=null; setLoading(false); }
    }
  }

  return <section ref={content} className={styles.writing} aria-busy={loading}>
    <p>Analizá la escritura de las entregas de esta aula. Generar un informe usa tu cuota de IA. Cada observación incluye entregas que podés leer.</p>
    {loading ? <p role="status">Consultando análisis…</p> : null}
    {failed ? <Notice error>No pudimos consultar el análisis. <button type="button" onClick={() => setReload(value=>value+1)}>Reintentar</button></Notice> : null}
    {!loading && result ? <Notice error={result.state==='FAILED'}>
      {isAiBudgetRejectionCode(result.error) ? budgets[result.error] : states[result.state]}
    </Notice> : null}
    {!loading && result?.state==='READY' && result.report ? <>
      <WritingFindings title="Puntos fuertes" items={result.report.strengths} onEvidence={onEvidence}/>
      <WritingFindings title="Aspectos a reforzar" items={result.report.improvements} onEvidence={onEvidence}/>
      {result.report.nextStep ? <WritingFindings title="Próximo paso" items={[result.report.nextStep]} onEvidence={onEvidence}/> : null}
    </> : null}
    {!loading && canGenerate ? <button className="button primary" type="button" onClick={() => void requestWriting()}>Generar análisis</button> : null}
  </section>;
}

function WritingFindings({title,items,onEvidence}: {title:string;items:TeacherWritingFinding[];onEvidence:(id:string,focusKey:string)=>void}) {
  if (!items.length) return null;
  return <section className={styles.writingFinding}>
    <h3>{title}</h3>
    <ul>{items.map((item,index)=><li key={index}>
      <p>{item.text}</p>
      <div>{item.sources.map(source=>{
        const focusKey = `${title}:${index}:${source.attemptId}`;
        return <button type="button" key={source.attemptId} className={`button ${styles.button}`}
          aria-label={'Leer entrega · '+source.title} data-support-return={focusKey}
          onClick={()=>onEvidence(source.attemptId,focusKey)}>Leer entrega · {source.title}</button>;
      })}</div>
    </li>)}</ul>
  </section>;
}
