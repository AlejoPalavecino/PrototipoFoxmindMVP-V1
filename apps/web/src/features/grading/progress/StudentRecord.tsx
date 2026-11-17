import { useState } from 'react';
import type { GradingProgressOperations, StudentSummaryOperations } from '../model/grading-operations.ts';
import type { Summary } from '../../../../../../src/core/contracts/grading.ts';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import { initials } from '../../../../../shared-ui/academic-cover.tsx';
import { Progress } from './Progress.tsx';
import { StudentAiSummary } from './StudentAiSummary.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';

export function StudentRecord({ progressOperations, summaryOperations, classroomId, summary, onBack, onOpenActivity, onRemove }: {
  progressOperations: GradingProgressOperations; summaryOperations: StudentSummaryOperations; classroomId: string; summary: Summary & { studentId: string; email?: string; division?: string; progress?: boolean };
  onBack: () => void; onOpenActivity?: (activityId: string, attemptId?: string) => void; onRemove?: () => void;
}) {
  const [progress, setProgress] = useState(Boolean(summary.progress)), [analysis,setAnalysis] = useState(false);
  const name=`${summary.firstName} ${summary.lastName}`;
  const submitted = new Set(summary.attempts.map(item=>item.activityId ?? item.title)).size;
  const published = summary.attempts.filter(item=>item.published && item.grade!==null).length;
  const closeProgress = () => summary.progress ? onBack() : setProgress(false);
  return <section className="brujula-student-record parity-student-record-exact">
    {!progress ? <button className="p5-link" onClick={onBack}>‹ Volver a Estudiantes</button> : null}
    {progress ? <Dialog title={`El recorrido de ${name}`} onClose={closeProgress}><Progress operations={progressOperations} classroomId={classroomId} studentId={summary.studentId} onReview={onOpenActivity} onOpenActivity={activityId=>{
      const latest=summary.attempts.filter(item=>item.activityId===activityId).sort((a,b)=>b.number-a.number)[0];
      onOpenActivity?.(activityId,latest?.id);
    }}/><footer className="p5-form-footer"><button onClick={closeProgress}>{summary.progress ? 'Volver al progreso' : 'Volver a la ficha'}</button></footer></Dialog> : <>
      <section className="brujula-member-card"><span className="p5-avatar">{initials(summary.firstName,summary.lastName)}</span>
        <small>Estudiante{summary.division ? ` · ${summary.division}` : ''}</small><h2>{name}</h2>{summary.email ? <p>{summary.email}</p> : null}
        <div className="brujula-member-stats"><div><strong>{submitted}</strong><span>Actividades entregadas</span></div><div><strong>{published}</strong><span>Resultados publicados</span></div></div>
        <div className="p5-actions"><button className="primary" onClick={()=>setProgress(true)}><FoxmindIcon name="progress"/>Ver progreso individual</button><button onClick={()=>setAnalysis(true)}><FoxmindIcon name="spark"/>Análisis con IA</button></div>
      </section>{onRemove ? <div className="brujula-member-remove"><button className="p5-link" onClick={onRemove}>Dar de baja del aula</button></div> : null}
    </>}
    {analysis ? <Dialog title="Análisis individual" onClose={()=>setAnalysis(false)}><StudentAiSummary operations={summaryOperations} classroomId={classroomId} studentId={summary.studentId}/><button onClick={()=>{setAnalysis(false);setProgress(true);}}>Ver progreso</button></Dialog> : null}
  </section>;
}
