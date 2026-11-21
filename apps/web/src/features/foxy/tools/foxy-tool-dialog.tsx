import { materialsInConversation } from '../../../../../shared-ui/creation-presentation';
import { useState } from 'react';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { foxyQuizBrief, foxyQuizQuestionCount, foxyQuizRequest } from '../../../../../../src/core/domain/foxy/foxy-quiz.ts';

const assignmentInstructions = 'Incluí un objetivo observable, consignas para estudiantes, qué deben entregar y criterios concretos para revisar su trabajo.';

export function FoxyToolDialog({ title, contextName, materialCount, topics, initialBrief = '', initialTopicIds, busy, error, onPrepare, onClose }: {
  title:string; contextName:string; materialCount:number; topics:{id:string;name:string}[]; initialBrief?: string; initialTopicIds?: string[]; busy?:boolean; error?:string|null;
  onPrepare:(brief:string,topicIds:string[])=>Promise<boolean>; onClose:()=>void;
}) {
  const activity = /^Crear (una )?actividad$/iu.test(title);
  const initialCount = activity ? foxyQuizQuestionCount(initialBrief) : null;
  const [brief,setBrief]=useState(() => initialCount ? foxyQuizBrief(initialBrief) : activity && initialBrief.endsWith(assignmentInstructions)
    ? initialBrief.slice(0, -assignmentInstructions.length).trimEnd() : initialBrief);
  const [selected,setSelected]=useState(initialTopicIds ?? topics.map(topic=>topic.id)),[localError,setLocalError]=useState(''),[submitting,setSubmitting]=useState(false);
  const [activityKind, setActivityKind] = useState(initialCount ? 'QUIZ' : 'ASSIGNMENT');
  const [questionCount, setQuestionCount] = useState(initialCount ?? 3);
  const quiz = activity && activityKind === 'QUIZ';
  async function prepare(){
    if(!brief.trim()){setLocalError('Contá qué querés preparar para que Foxy tenga un punto de partida.');return;}
    if(submitting||busy)return;
    setSubmitting(true);setLocalError('');
    const request = quiz ? foxyQuizRequest(questionCount, brief.trim())
      : activity ? `${brief.trim()}\n\n${assignmentInstructions}`
      : brief.trim();
    try{if(await onPrepare(request,selected))onClose();else setLocalError('No pudimos iniciar la propuesta. Tu idea sigue acá; volvé a intentar.');}
    catch{setLocalError('No pudimos iniciar la propuesta. Tu idea sigue acá; volvé a intentar.');}
    finally{setSubmitting(false);}
  }
  const topic = topics.find(item => selected.includes(item.id))?.name ?? topics[0]?.name ?? 'mitosis';
  const examples: Record<string, string> = {
    'Planificar una clase': `Planificá una clase de 40 minutos sobre ${topic}, con una actividad inicial, trabajo en parejas y un cierre para comprobar qué entendieron.`,
    'Pensar una rúbrica': `Prepará una rúbrica para evaluar una explicación de ${topic}, con tres niveles y criterios que pueda observar en el trabajo.`,
    'Crear una actividad': quiz ? `Prepará preguntas sobre ${topic} con distractores que permitan identificar confusiones frecuentes.` : `Prepará una actividad en parejas sobre ${topic}, con una entrega que pueda revisar al final de la clase.`,
  };
  const example = examples[title] ?? `Prepará un apunte para mi grupo sobre ${topic}, con una explicación sencilla y dos ejemplos.`;
  return <FoxyDialog title={title} description="Contale a Foxy qué necesitás. Después podés revisar y editar." className="parity-foxy-toolDialog" onClose={()=>{if(!submitting)onClose();}}
    footer={<><button type="button" disabled={submitting} onClick={onClose}>Cancelar</button><button type="button" className="p5-primary" disabled={submitting||busy} onClick={()=>void prepare()}><FoxmindIcon name="spark"/>{submitting?'Preparando…':'Preparar propuesta'}</button></>}>
    <form onSubmit={event=>{event.preventDefault();void prepare();}} className="parity-foxy-toolForm">
      <div className="parity-foxy-scopeBanner"><FoxmindIcon name="book"/><div><strong>{contextName}</strong><p>{materialsInConversation(materialCount)}</p></div></div>
      {activity && <fieldset className="parity-foxy-choiceGroup" disabled={submitting}>
        <legend>Formato</legend>
        <div>
          <label><input type="radio" name="foxy-activity-kind" checked={!quiz} onChange={() => setActivityKind('ASSIGNMENT')} />Trabajo práctico</label>
          <label><input type="radio" name="foxy-activity-kind" checked={quiz} onChange={() => setActivityKind('QUIZ')} />Quiz</label>
        </div>
        {quiz && <label>Cantidad de preguntas<select value={questionCount} onChange={(event) => setQuestionCount(Number(event.currentTarget.value))}>
          {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select></label>}
      </fieldset>}
      <label>¿Qué te gustaría preparar?<textarea autoFocus rows={5} maxLength={1500} disabled={submitting} value={brief} onChange={event=>{setBrief(event.target.value);setLocalError('');}} placeholder={example}/></label>
      <button type="button" className="parity-foxy-example" onClick={()=>setBrief(example)}><FoxmindIcon name="spark"/>Usar una idea para empezar</button>
      {topics.length>0&&<fieldset className="parity-foxy-choiceGroup"><legend>Temas que querés incluir</legend><div>{topics.map(topic=><label key={topic.id}><input type="checkbox" checked={selected.includes(topic.id)} onChange={()=>setSelected(values=>values.includes(topic.id)?values.filter(id=>id!==topic.id):[...values,topic.id])}/>{topic.name}</label>)}</div></fieldset>}
      {(localError||error)&&<p role="alert">{localError||error}</p>}
    </form>
  </FoxyDialog>;
}
