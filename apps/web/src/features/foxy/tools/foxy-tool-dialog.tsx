import { materialsInConversation } from '../../../../../shared-ui/creation-presentation';
import { useId, useState } from 'react';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { foxyQuizBrief, foxyQuizFormat, foxyQuizQuestionCount, foxyQuizRequest, type FoxyQuizFormat } from '../../../../../../src/core/domain/foxy/foxy-quiz.ts';

const quizFormats: { value: FoxyQuizFormat; label: string }[] = [
  { value: 'CHOICE', label: 'Opción múltiple' },
  { value: 'TRUE_FALSE', label: 'Verdadero o falso' },
  { value: 'MIXED', label: 'Mixto' },
];

const assignmentInstructions = 'Incluí un objetivo observable, consignas para estudiantes, qué deben entregar y criterios concretos para revisar su trabajo.';
const kickers: Record<string, string> = {
  'Preparar un apunte': 'Nuevo apunte', 'Crear una actividad': 'Nueva actividad', 'Planificar una clase': 'Nuevo plan de clase', 'Pensar una rúbrica': 'Nueva rúbrica',
};

export function FoxyToolDialog({ title, contextName, materialCount, topics, initialBrief = '', initialTopicIds, initialQuiz = false, inline = false, busy, error, onPrepare, onClose }: {
  title:string; contextName:string; materialCount:number; topics:{id:string;name:string}[]; initialBrief?: string; initialTopicIds?: string[];
  /** Opens the activity form already set to the Quiz format. */
  initialQuiz?: boolean;
  /** Card above the composer instead of a modal dialog. */
  inline?: boolean; busy?:boolean; error?:string|null;
  onPrepare:(brief:string,topicIds:string[])=>Promise<boolean>; onClose:()=>void;
}) {
  const activity = /^Crear (una )?actividad$/iu.test(title);
  const initialCount = activity ? foxyQuizQuestionCount(initialBrief) : null;
  const uid = useId();
  const [brief,setBrief]=useState(() => initialCount ? foxyQuizBrief(initialBrief) : activity && initialBrief.endsWith(assignmentInstructions)
    ? initialBrief.slice(0, -assignmentInstructions.length).trimEnd() : initialBrief);
  const [selected,setSelected]=useState(initialTopicIds ?? topics.map(topic=>topic.id)),[localError,setLocalError]=useState(''),[submitting,setSubmitting]=useState(false);
  // Quiz and assignment are separate tools: the entry decides the kind, so the form never asks «Trabajo práctico | Quiz».
  const quiz = activity && (initialCount !== null || initialQuiz);
  const [questionCount, setQuestionCount] = useState(initialCount ?? 3);
  const [format, setFormat] = useState<FoxyQuizFormat>(() => initialCount ? foxyQuizFormat(initialBrief) : 'CHOICE');
  async function prepare(){
    if(!brief.trim()){setLocalError('Contá qué querés preparar para que Foxy tenga un punto de partida.');return;}
    if(submitting||busy)return;
    setSubmitting(true);setLocalError('');
    const request = quiz ? foxyQuizRequest(questionCount, brief.trim(), format)
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
  const kicker = quiz ? 'Nuevo quiz' : kickers[title] ?? title;
  const close = () => { if (!submitting) onClose(); };
  const form = <form onSubmit={event=>{event.preventDefault();void prepare();}} className="parity-foxy-toolForm">
    {!inline && <div className="parity-foxy-scopeBanner"><FoxmindIcon name="book"/><div><strong>{contextName}</strong><p>{materialsInConversation(materialCount)}</p></div></div>}
    {quiz && <>
      <fieldset className="parity-foxy-choiceGroup parity-foxy-formatGroup" disabled={submitting}>
        <legend>Formato de preguntas</legend>
        <div className="parity-foxy-seg">
          {quizFormats.map(item => <span key={item.value}><input type="radio" id={`${uid}-${item.value}`} name={`${uid}-format`} value={item.value} checked={format === item.value} onChange={() => setFormat(item.value)} /><label htmlFor={`${uid}-${item.value}`}>{item.label}</label></span>)}
        </div>
      </fieldset>
      <div className="parity-foxy-countGroup" role="group" aria-labelledby={`${uid}-count`}>
        <span id={`${uid}-count`} className="parity-foxy-fieldLabel">Cantidad de preguntas</span>
        <div className="parity-foxy-stepper">
          <button type="button" aria-label="Una pregunta menos" disabled={submitting || questionCount <= 1} onClick={() => setQuestionCount(count => Math.max(1, count - 1))}>−</button>
          <output aria-live="polite">{questionCount}</output>
          <button type="button" aria-label="Una pregunta más" disabled={submitting || questionCount >= 10} onClick={() => setQuestionCount(count => Math.min(10, count + 1))}>+</button>
        </div>
      </div>
    </>}
    <label>¿Qué te gustaría preparar?<textarea autoFocus rows={inline ? 3 : 5} maxLength={1500} disabled={submitting} value={brief} onChange={event=>{setBrief(event.target.value);setLocalError('');}} placeholder={example}/></label>
    <button type="button" className="parity-foxy-example" onClick={()=>setBrief(example)}><FoxmindIcon name="spark"/>Usar una idea para empezar</button>
    {topics.length>0&&<fieldset className="parity-foxy-choiceGroup"><legend>Temas que querés incluir</legend><div>{topics.map(topic=><label key={topic.id}><input type="checkbox" checked={selected.includes(topic.id)} onChange={()=>setSelected(values=>values.includes(topic.id)?values.filter(id=>id!==topic.id):[...values,topic.id])}/>{topic.name}</label>)}</div></fieldset>}
    {(localError||error)&&<p role="alert">{localError||error}</p>}
    {inline && <div className="parity-foxy-inlineActions">
      <button type="submit" className="p5-primary" disabled={submitting||busy}><FoxmindIcon name="spark"/>{submitting?'Preparando…':quiz?'Crear quiz':'Preparar propuesta'}</button>
    </div>}
  </form>;
  if (inline) return <section className="parity-foxy-inlineTool" aria-label={kicker} onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(); } }}>
    <header>
      <strong>{kicker}</strong>
      <span>usa el contexto {contextName} · {materialsInConversation(materialCount)}</span>
      <button type="button" aria-label="Cerrar herramienta" disabled={submitting} onClick={close}>Cerrar</button>
    </header>
    {form}
  </section>;
  return <FoxyDialog title={quiz ? 'Crear un quiz' : title} description="Contale a Foxy qué necesitás. Después podés revisar y editar." className="parity-foxy-toolDialog" onClose={close}
    footer={<><button type="button" disabled={submitting} onClick={onClose}>Cancelar</button><button type="button" className="p5-primary" disabled={submitting||busy} onClick={()=>void prepare()}><FoxmindIcon name="spark"/>{submitting?'Preparando…':'Preparar propuesta'}</button></>}>
    {form}
  </FoxyDialog>;
}
