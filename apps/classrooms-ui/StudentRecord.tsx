import { useState } from 'react';
import type { ClassroomClient } from './api.ts';
import type { Summary } from './ClassroomRoster.tsx';
import { Dialog, initials } from './components.tsx';
import { Progress } from './Progress.tsx';
import { StudentAiSummary } from './StudentAiSummary.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';

export function StudentRecord({ api, classroomId, summary, onBack, onOpenActivity, onRemove }: {
  api: ClassroomClient; classroomId: string; summary: Summary & { studentId: string; email?: string; division?: string; progress?: boolean };
  onBack: () => void; onOpenActivity?: (activityId: string, attemptId?: string) => void; onRemove?: () => void;
}) {
  const [progress, setProgress] = useState(Boolean(summary.progress)), [analysis,setAnalysis] = useState(false);
  const name=`${summary.firstName} ${summary.lastName}`;
  const submitted = new Set(summary.attempts.map(item=>item.activityId ?? item.title)).size;
  const published = summary.attempts.filter(item=>item.published && item.grade!==null).length;
  return <section className="brujula-student-record">
    <button className="p5-link" onClick={progress ? ()=>setProgress(false) : onBack}>‹ {progress ? 'Volver a la ficha' : 'Volver a Alumnos'}</button>
    {progress ? <Progress api={api} classroomId={classroomId} studentId={summary.studentId} onOpenActivity={activityId=>{
      const latest=summary.attempts.filter(item=>item.activityId===activityId).sort((a,b)=>b.number-a.number)[0];
      onOpenActivity?.(activityId,latest?.id);
    }}/> : <>
      <section className="brujula-member-card"><span className="p5-avatar">{initials(summary.firstName,summary.lastName)}</span>
        <small>Estudiante{summary.division ? ` · ${summary.division}` : ''}</small><h2>{name}</h2>{summary.email ? <p>{summary.email}</p> : null}
        <div className="brujula-member-stats"><div><strong>{submitted}</strong><span>Actividades entregadas</span></div><div><strong>{published}</strong><span>Resultados publicados</span></div></div>
        <div className="p5-actions"><button className="primary" onClick={()=>setProgress(true)}><FoxmindIcon name="progress"/>Ver progreso individual</button><button onClick={()=>setAnalysis(true)}><FoxmindIcon name="spark"/>Análisis con IA</button></div>
      </section>{onRemove ? <div className="brujula-member-remove"><button className="p5-link" onClick={onRemove}>Dar de baja del aula</button></div> : null}
    </>}
    {analysis ? <Dialog title="Análisis individual" onClose={()=>setAnalysis(false)}><StudentAiSummary api={api} classroomId={classroomId} studentId={summary.studentId}/><button onClick={()=>{setAnalysis(false);setProgress(true);}}>Ver progreso</button></Dialog> : null}
  </section>;
}
