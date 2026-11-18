'use client';
import { useState } from 'react';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { ActivityDetail } from '../../../../../../src/core/contracts/activities.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { activityTypeLabels, EvaluationRubric } from '../../../features/activity-authoring/index.ts';
import styles from './activity-session.module.css';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { ActivityCurriculum } from './ActivityCurriculum.tsx';


/** Read-only preview/consultation is deliberately separate from a future attempt-taking route. */
export function ActivityPreview({ api, activity, teacher, room, effectiveDeadlineAt, instructionsLocked = false }: { api: ClassroomClient; activity: ActivityDetail; teacher: boolean; room?: Detail; effectiveDeadlineAt?: string | null; instructionsLocked?: boolean }) {
  const [materialsOpen, setMaterialsOpen] = useState(false);
  return <section className={`p7-preview brujula-activity-preview ${styles.reader}`} aria-label={teacher ? 'Vista previa docente' : 'Consulta de actividad'}>
    <div className={`brujula-activity-brief ${styles.brief}`}>
      <small className="sr-only">{activityTypeLabels[activity.type]}</small>
      <section className={`${styles.instruction} parity-reading-instructions`}>
        <h3><FoxmindIcon name="book"/>Tu desafío</h3>
        <p className="p7-multiline">{activity.instructions || (instructionsLocked
          ? 'Al abrir la consigna completa se inicia tu borrador. Podés volver más tarde y confirmar la entrega cuando esté lista.'
          : 'Sin consigna adicional.')}</p>
        {activity.objective ? <div className="parity-participation-objective"><b>Para qué lo hacemos</b><p className="p7-multiline">{activity.objective}</p></div> : null}
        <ActivityCurriculum room={room} activity={activity}/>
        <div className="parity-participation-resources"><span><FoxmindIcon name="folder"/>El material de clase puede ayudarte.</span><button onClick={() => setMaterialsOpen(true)}><FoxmindIcon name="book"/>Consultar material</button></div>
      </section>
      {activity.teacherComment ? <section><h4>Comentario para el aula</h4><p className="p7-multiline">{activity.teacherComment}</p></section> : null}
      {activity.instructionFiles.length ? <ActivityMaterials api={api} activity={activity} includeLibrary={false}/> : null}
    </div>
    <aside className={`${styles.criteria} parity-reading-criteria`}>
      <h3><FoxmindIcon name="list-checks"/>Qué se va a valorar</h3>
      {activity.evaluationRubric?.length ? <EvaluationRubric criteria={activity.evaluationRubric} /> : <p>El docente compartió la consigna de la actividad.</p>}
      <ActivityDeadline activity={activity} effectiveDeadlineAt={effectiveDeadlineAt}/>
      <p className="parity-participation-reassurance"><FoxmindIcon name={!teacher && room?.archived ? "lock" : "check"}/>{!teacher && room?.archived ? "Podés consultar la consigna y tus entregas anteriores." : "Podés guardar, revisar y entregar cuando esté listo."}</p>
    </aside>
    {teacher && activity.questions.length ? <section className={styles.questionPreview} aria-label="Preguntas de la actividad">
      <h3><FoxmindIcon name="edit"/>Preguntas de la actividad</h3>
      <p className={styles.privateNote}><FoxmindIcon name="lock"/>Referencias de respuesta visibles sólo para vos.</p>
      {activity.questions.map((question, index) => <article key={question.id ?? index}>
        <span>{index + 1}</span><div><h4>{question.prompt}</h4>
          <p>{{DEVELOPMENT: 'Respuesta escrita', SINGLE_CHOICE: 'Una respuesta', MULTIPLE_CHOICE: 'Selección múltiple'}[question.type]} · {question.points} {Number(question.points) === 1 ? 'punto' : 'puntos'}</p>
          {question.options.length ? <ul>{question.options.map((option, position) => <li key={option.id ?? position} data-correct={option.correct || undefined}><FoxmindIcon name={option.correct ? 'check' : 'book'}/><span>{option.text}</span>{option.correct ? <b>Correcta</b> : null}</li>)}</ul> : null}
          {question.scoringRule ? <small>{question.scoringRule === 'PARTIAL' ? 'Puntaje parcial sin opciones incorrectas' : 'Coincidencia exacta'}</small> : null}
        </div>
      </article>)}
    </section> : null}
    {materialsOpen ? <Dialog title="Materiales de la actividad" onClose={() => setMaterialsOpen(false)}><ActivityMaterials api={api} activity={activity}/></Dialog> : null}
  </section>;
}

function ActivityDeadline({ activity, effectiveDeadlineAt }: { activity: ActivityDetail; effectiveDeadlineAt?: string | null }) {
  const deadlineAt = effectiveDeadlineAt === undefined ? activity.deadlineAt : effectiveDeadlineAt;
  const deadline = deadlineAt ? new Intl.DateTimeFormat('es-AR', {
    timeZone: activity.zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(deadlineAt)).replaceAll('.', '') : 'Sin fecha límite';
  return <div><h4>Fecha límite</h4><p>{deadline}</p><h4>Entregas tardías</h4><p>{activity.allowLate ? 'Se aceptan' : 'Plazo estricto'}</p></div>;
}

export function ActivityContext({api,activity,room,effectiveDeadlineAt}:{api:ClassroomClient;activity:ActivityDetail;room?:Detail;effectiveDeadlineAt?:string|null}){
 return <aside className={`brujula-activity-context ${styles.context}`}><ActivityDeadline activity={activity} effectiveDeadlineAt={effectiveDeadlineAt}/><ActivityCurriculum room={room} activity={activity} split/>
      {activity.materials.length?<><h4>Material de consulta</h4><ul>{activity.materials.map(m => <li key={m.id}><a href={api.fileUrl(m.fileId)} target="_blank" rel="noreferrer">{m.title}</a></li>)}</ul></>:null}
    </aside>;
}


export function ActivityMaterials({ api, activity, includeLibrary = true }: { api: ClassroomClient; activity: ActivityDetail; includeLibrary?: boolean }) {
  return activity.instructionFiles.length || (includeLibrary && activity.materials.length) ? <ul className={styles.materialList}>
    {activity.instructionFiles.map(file => <li key={file.id}><FoxmindIcon name="file"/>
      {file.ready ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a>
        : <span>{file.name} · No disponible por revisión de seguridad</span>}
      {file.ready && file.extension === 'pdf' ? <a href={api.fileUrl(file.id, true)} target="_blank" rel="noreferrer">Vista previa PDF</a> : null}
    </li>)}
    {includeLibrary ? activity.materials.map(material => <li key={material.id}><FoxmindIcon name="folder"/><a href={api.fileUrl(material.fileId)} target="_blank" rel="noreferrer">{material.title}</a></li>) : null}
  </ul> : <p>No hay materiales vinculados a esta actividad.</p>;
}
