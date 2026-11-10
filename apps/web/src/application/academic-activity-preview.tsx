import type { ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import type { ActivityDetail } from '../../../../src/core/contracts/activities.ts';
import type { Detail } from '../../../../src/core/contracts/classrooms.ts';
import { activityTypeLabels } from '../features/activity-authoring/index.ts';
import { EvaluationRubric } from '../features/activity-authoring/index.ts';
import { ActivityCurriculum } from './academic-ActivityCurriculum.tsx';


/** Read-only preview/consultation is deliberately separate from a future attempt-taking route. */
export function ActivityPreview({ api, activity, teacher, room, effectiveDeadlineAt }: { api: ClassroomClient; activity: ActivityDetail; teacher: boolean; room?: Detail;effectiveDeadlineAt?:string|null }) {
  return <section className="p7-preview brujula-activity-preview" aria-label={teacher ? 'Vista previa docente' : 'Consulta de actividad'}>
    <div className="brujula-activity-brief">
      <small className="sr-only">{activityTypeLabels[activity.type]}</small>
      {activity.objective ? <section><h3>Objetivo de aprendizaje</h3><p className="p7-multiline">{activity.objective}</p></section> : null}
      <h3>Consigna</h3><p className="p7-multiline">{activity.instructions || (!teacher&&activity.type==='ASSIGNMENT'?'Abrí la consigna para consultar las instrucciones y sus recursos.':'La consigna está en preparación.')}</p>
      {activity.teacherComment ? <section><h4>Comentario para el aula</h4><p className="p7-multiline">{activity.teacherComment}</p></section> : null}
      <ul>{activity.instructionFiles.map(f => <li key={f.id}>{f.ready ? <a href={api.fileUrl(f.id)} target="_blank" rel="noreferrer">Descargar {f.name}</a> : `${f.name} · No disponible por revisión de seguridad`}</li>)}</ul>
      {activity.questions.length ? <small>{activity.questions.length} {activity.questions.length===1?'pregunta':'preguntas'}</small>:null}
      {teacher ? activity.questions.map((q, index) => <article key={q.id ?? index}><h4>Pregunta {index + 1} · {q.points} puntos</h4><p className="p7-multiline">{q.prompt}</p>
        <ul>{q.options.map((o, n) => <li key={o.id ?? n}>{o.text}{o.correct ? ' · Correcta' : ''}</li>)}</ul>
        {q.scoringRule ? <small>{q.scoringRule === 'PARTIAL' ? 'Puntaje parcial sin opciones incorrectas' : 'Coincidencia exacta'}</small> : null}</article>) : null}
      <EvaluationRubric criteria={activity.evaluationRubric}/>
    </div>
    <ActivityContext api={api} activity={activity} room={room} effectiveDeadlineAt={effectiveDeadlineAt}/>
  </section>;
}

export function ActivityContext({api,activity,room,effectiveDeadlineAt}:{api:ClassroomClient;activity:ActivityDetail;room?:Detail;effectiveDeadlineAt?:string|null}){
 const deadlineAt=effectiveDeadlineAt===undefined?activity.deadlineAt:effectiveDeadlineAt;
 return <aside className="brujula-activity-context"><small>FICHA DE ACTIVIDAD</small><h4>Fecha límite</h4><p>{deadlineAt?new Intl.DateTimeFormat('es-AR',{timeZone:activity.zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(deadlineAt)).replaceAll('.',''):'Sin fecha límite'}</p><ActivityCurriculum room={room} activity={activity} split/><h4>Entregas tardías</h4><p>{activity.allowLate?'Se aceptan':'Plazo estricto'}</p>
      {activity.materials.length?<><h4>Material de consulta</h4><ul>{activity.materials.map(m => <li key={m.id}><a href={api.fileUrl(m.fileId)} target="_blank" rel="noreferrer">{m.title}</a></li>)}</ul></>:null}
    </aside>;
}
