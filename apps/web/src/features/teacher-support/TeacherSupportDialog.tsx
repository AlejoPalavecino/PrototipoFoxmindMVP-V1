'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { TeacherSupportEvidence, TeacherSupportRecord } from '../../../../../src/core/contracts/teacher-support.ts';
import { initials } from '../../../../shared-ui/academic-cover.tsx';
import { Dialog, Notice } from '../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../shared-ui/FoxmindIcon.tsx';
import { supportAccessEnded, type SupportStudent, type TeacherSupportReader, type TeacherWritingReader } from './model.ts';
import { formatSupportDate, priorityTone, supportReason, SupportPriority } from './SupportPriority.tsx';
import styles from './teacher-support.module.css';
import { TeacherWritingPanel } from './TeacherWritingPanel.tsx';

export function TeacherSupportDialog({ client,student,onClose,onRevoked,onRemove,progress,analysis }: {
  client: TeacherSupportReader; student: SupportStudent; onClose: () => void; onRevoked: () => void;
  onRemove?: () => void; progress?: ReactNode; analysis?: ReactNode;
}) {
  const {classroomId,studentId,firstName,lastName} = student;
  const name = `${firstName} ${lastName}`;
  const [record,setRecord] = useState<TeacherSupportRecord|null>(null);
  const [source,setSource] = useState<string|null>(null);
  const [reading,setReading] = useState<TeacherSupportEvidence|null>(null);
  const [panel,setPanel] = useState<'progress'|'analysis'|'writing'|null>(null);
  const [failure,setFailure] = useState<'load'|'access'|null>(null);
  const [recordRetry,setRecordRetry] = useState(0);
  const [evidenceRetry,setEvidenceRetry] = useState(0);
  const writingClient = client.writing && client.requestWriting && client.writingEvidence ? client as TeacherSupportReader & TeacherWritingReader : null;
  const onRevokedRef = useRef(onRevoked);
  onRevokedRef.current = onRevoked;
  const returnTo = useRef<string|null>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let request: AbortController;
    let mounted = true;
    let refreshQueued = false;
    let loaded = false;
    function read(refresh = false) {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const keepRecord = refresh && loaded;
      if (keepRecord) setRecord(previous => previous && {...previous, sharedStrategies:[]});
      else { setRecord(null); setFailure(null); }
      void client.record(classroomId,studentId,controller.signal).then(value => {
        if (!controller.signal.aborted) {
          loaded = true;
          setRecord(value);
        }
      }).catch(error => {
        if (controller.signal.aborted) return;
        if (supportAccessEnded(error)) {
          loaded = false;
          setRecord(null);
          setReading(null);
          setFailure('access');
          onRevokedRef.current();
        } else if (!keepRecord) setFailure('load');
      });
    }
    function resume() {
      if (refreshQueued || (typeof document!=='undefined' && document.visibilityState==='hidden')) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        if (mounted) read(true);
      });
    }
    read();
    if (typeof window!=='undefined') window.addEventListener('focus',resume);
    if (typeof document!=='undefined') document.addEventListener('visibilitychange',resume);
    return () => {
      mounted = false;
      request?.abort();
      if (typeof window!=='undefined') window.removeEventListener('focus',resume);
      if (typeof document!=='undefined') document.removeEventListener('visibilitychange',resume);
    };
  }, [client,classroomId,studentId,recordRetry]);

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    setFailure(null);
    setReading(null);
    const read = panel === 'writing' && client.writingEvidence ? client.writingEvidence : client.evidence;
    void read(classroomId,studentId,source,controller.signal).then(value => {
      if (!controller.signal.aborted) setReading(value);
    }).catch(error => {
      if (controller.signal.aborted) return;
      const denied = supportAccessEnded(error);
      setFailure(denied ? 'access' : 'load');
      if (denied) {
        setRecord(null);
        onRevokedRef.current();
      }
    });
    return () => controller.abort();
  }, [client,classroomId,studentId,source,panel,evidenceRetry]);

  useEffect(() => {
    if (source || panel || returnTo.current) {
      const dialog = content.current?.closest('dialog');
      const title = dialog?.querySelector<HTMLHeadingElement>('h2');
      if (title) { title.tabIndex = -1; title.focus(); }
    }
  }, [source,panel]);

  useEffect(() => {
    if (!source && !panel && record && returnTo.current) {
      const target = [...(content.current?.querySelectorAll<HTMLButtonElement>('button[data-support-return]') ?? [])]
        .find(button => button.dataset.supportReturn === returnTo.current);
      if (target) { target.focus(); returnTo.current = null; }
    }
  }, [source,panel,record]);

  function openEvidence(attemptId: string, focusKey = attemptId) {
    setReading(null);
    setFailure(null);
    setSource(attemptId);
    returnTo.current = focusKey;
  }
  function back() {
    setSource(null);
    setReading(null);
    setFailure(null);
    if (source && panel === 'writing') return;
    if (panel === 'writing') returnTo.current = 'writing';
    setPanel(null);
    setRecord(null);
    setRecordRetry(value => value + 1);
  }

  const detached = !!source || !!panel;
  const title = failure === 'access' ? 'Ficha no disponible' : source ? reading?.title ?? 'Leer entrega'
    : panel === 'progress' ? `El recorrido de ${name}` : panel === 'analysis' ? 'Análisis individual' : panel === 'writing' ? 'Análisis de escritura' : name;
  return <Dialog title={title} onClose={onClose} className={styles.dialog}>
    <div ref={content} className={styles.detail}>
      {failure === 'access' ? <Notice error>La ficha o la entrega ya no está disponible para tu cuenta.</Notice>
        : failure === 'load' ? <Notice error>No pudimos cargar {source ? 'la entrega' : 'la ficha'}. <button type="button" onClick={() => (source ? setEvidenceRetry : setRecordRetry)(value => value + 1)}>Reintentar</button></Notice>
        : source ? reading ? <SupportEvidence evidence={reading} name={name} initialsLabel={initials(firstName,lastName)} classroom={record?.classroomName} /> : <p role="status">Cargando la entrega…</p>
        : panel ? panel === 'progress' ? progress : panel === 'analysis' ? analysis : null
        : record ? <SupportRecordContent record={record} onEvidence={openEvidence} division={student.division} email={student.email}/> : <p role="status">Cargando la ficha…</p>}
      {record && panel==='writing' && writingClient && failure!=='access' ? <div hidden={!!source}>
        <TeacherWritingPanel client={writingClient} student={student} onEvidence={openEvidence} focusKey={source?undefined:returnTo.current??undefined} active={!source} onRevoked={() => {
          setRecord(null);
          setFailure('access');
          onRevokedRef.current();
        }}/>
      </div> : null}
      <footer className={styles.dialogActions}>
        {detached && failure !== 'access' ? <button type="button" className="button primary" onClick={back}>{source && panel==='writing' ? 'Volver al análisis' : 'Volver a la ficha'}</button> : null}
        {!detached && record && writingClient ? <button type="button" className="button" data-support-return="writing" onClick={() => setPanel('writing')}>Análisis de escritura</button> : null}
        {!detached && record && progress ? <button type="button" className="button" data-support-return="progress" onClick={() => { returnTo.current='progress'; setPanel('progress'); }}>Ver progreso individual</button> : null}
        {!detached && record && analysis ? <button type="button" className="button" data-support-return="analysis" onClick={() => { returnTo.current='analysis'; setPanel('analysis'); }}>Análisis con IA</button> : null}
        {!detached && record && onRemove ? <button type="button" className={`button ${styles.remove}`} onClick={onRemove}>Dar de baja del aula</button> : null}
        <button type="button" className="button" onClick={onClose}>Cerrar ficha</button>
      </footer>
    </div>
  </Dialog>;
}

const formatGrade = (grade: string) => Number(grade).toLocaleString('es-AR', {maximumFractionDigits: 2});
function SupportRecordContent({ record,onEvidence,division,email }: { record:TeacherSupportRecord; onEvidence:(id:string)=>void; division?:string; email?:string }) {
  const {completion,performance,grades,observations,pending,priority} = record;
  const accentText = performance.average === null ? 'Sin notas' : formatGrade(performance.average);
  const next = observations.find(observation => observation.nextStep)?.nextStep;
  return <>
    <div className={styles.roomName}>{record.classroomName}{division ? ` · ${division}` : null}{email ? <small>{email}</small> : null}</div>
    <section className={`${styles.signal} ${priorityTone(priority)}`}>
      <SupportPriority value={priority}/>
      <p>{supportReason(record)}</p>
      {pending.length > 1 ? <ul>{pending.slice(1).map(item => <li key={item.activityId}>{item.title}</li>)}</ul> : null}
    </section>
    <div className={styles.metrics}>
      <section><small>Promedio publicado</small><strong>{accentText}</strong>
        <span>{performance.graded === 1 ? '1 actividad con nota' : `${performance.graded} actividades con nota`}</span>
        {grades.length === 1 ? <span>{grades[0].title}</span> : null}
      </section>
      <section><small>Entregas al cierre</small><strong>{completion.expected ? `${completion.delivered} de ${completion.expected}` : 'Sin plazos'}</strong>
        {completion.expected ? <meter min="0" max={completion.expected} value={completion.delivered} aria-label="Entregas obligatorias con plazo cumplido"/> : null}
        <span>Al {formatSupportDate(record.evaluatedAt,record.timeZone)}</span>
      </section>
    </div>
    {grades.length > 1 ? <section className={styles.chart} aria-label="Notas por actividad">
      <header><h3>Notas por actividad</h3><small>Escala de 0 a 10</small></header>
      <ul>{grades.map(grade => <li key={grade.activityId}>
        <span>{grade.title}</span><meter min="0" max="10" value={Number(grade.grade)} aria-label={grade.title}/><b>{formatGrade(grade.grade)}</b>
      </li>)}</ul>
    </section> : null}
    {!observations.length ? <section className={styles.observations}>
      <div className={styles.observationPoints}><PointList title="Puntos fuertes" items={[]}/><PointList title="Aspectos a reforzar" items={[]}/></div>
    </section> : null}
    {observations.map(observation => <section key={observation.attemptId} className={styles.observations}>
      <header className={styles.source}>
        <div><small>Observaciones sobre la entrega</small><h3>{observation.title}</h3></div>
        <button type="button" className={`button ${styles.button}`} data-support-return={observation.attemptId} onClick={() => onEvidence(observation.attemptId)}>Leer entrega <FoxmindIcon name="chevron-right"/></button>
      </header>
      <div className={styles.observationPoints}><PointList title="Puntos fuertes" items={observation.strengths}/><PointList title="Aspectos a reforzar" items={observation.improvements}/></div>
      {observation.feedback ? <p className={styles.feedback}><strong>Devolución publicada</strong>{observation.feedback}</p> : null}
    </section>)}
    {record.sharedStrategies?.length ? <section className={styles.sharedStrategies}>
      <h3>Estrategia compartida por el estudiante</h3>
      {record.sharedStrategies.map(strategy => <blockquote key={strategy.id}>{strategy.text}</blockquote>)}
    </section> : null}
    {next || pending.length ? <aside className={styles.next}><h3><FoxmindIcon name="chat"/> Qué podés probar</h3>
      <p>{next ?? `Preguntale cómo viene con «${pending[0].title}» y acuerden un primer paso para completarla.`}</p>
    </aside> : null}
  </>;
}

function PointList({ title,items }: {title:string; items:string[]}) {
  return <section><h3>{title}</h3>{items.length
    ? <ul>{items.map((item,index)=><li key={index}>{item}</li>)}</ul> : <p>Todavía falta evidencia.</p>}</section>;
}

function SupportEvidence({ evidence,name,initialsLabel,classroom }: {evidence:TeacherSupportEvidence; name:string; initialsLabel:string; classroom?:string}) {
  return <article className={styles.reader}>
    <header><span className={styles.avatar} aria-hidden="true">{initialsLabel}</span>
      <div><strong>{name}</strong><small>{classroom ? `${classroom} · ` : ''}Entrega del {formatSupportDate(evidence.submittedAt,evidence.timeZone)}</small></div>
      {evidence.grade !== null ? <p className={styles.result}>Nota publicada <b>{formatGrade(evidence.grade)} / 10</b></p> : null}
    </header>
    {evidence.instructions ? <section><h3>Consigna</h3><p>{evidence.instructions}</p></section> : null}
    <section className={styles.answer}><h3>Texto entregado</h3>
      {evidence.texts.length ? evidence.texts.map(({prompt,text},index) => <div key={index}>
        {prompt ? <h4>{prompt}</h4> : null}<blockquote>{text}</blockquote>
      </div>) : <p>Esta entrega no tiene respuestas escritas para mostrar acá.</p>}
    </section>
    {evidence.feedback ? <section><h3>Devolución publicada</h3><p>{evidence.feedback}</p></section> : null}
  </article>;
}
