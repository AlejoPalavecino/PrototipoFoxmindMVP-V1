import { WizardCurriculum, WizardPlanSource as SharedSource, type PlanSourceProps } from '../../../../../shared-ui/academic-plan';
export { WizardCurriculum } from '../../../../../shared-ui/academic-plan';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import type { CurriculumUnit } from '../../../../../../src/core/domain/index.ts';

interface Props extends PlanSourceProps {
  classroomLayout?: boolean;
  units?: CurriculumUnit[];
  onUnits?: (units: CurriculumUnit[]) => void;
  onRemoveUnits?: (units: CurriculumUnit[]) => void;
  onUndoRemove?: () => void;
  onExtractText: () => void;
}

export function WizardPlan(props: Props) {
  const { disabled } = props;
  const Curriculum = props.classroomLayout ? ClassroomCurriculum : WizardCurriculum;
  return <div className="brujula-wizard-plan">
    {props.onUnits ? <Curriculum units={props.units ?? []} onUnits={props.onUnits} onRemove={props.onRemoveUnits} onUndo={props.onUndoRemove} /> : null}
    {!props.classroomLayout ? <button className="brujula-wizard-extract" type="button" disabled={disabled} onClick={props.onExtractText}><FoxmindIcon name="edit" />Editar el plan como texto</button> : null}
  </div>;
}

export function WizardPlanSource(props: PlanSourceProps & { classroomLayout?: boolean }) {
  if (!props.classroomLayout) return <SharedSource {...props}/>;
  const { file, disabled } = props;
  return <section aria-label="Archivo del plan de estudio" aria-busy={props.uploading} className={`program-file${file?.ready ? ' ready' : ''}`}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
    onDrop={event => { event.preventDefault(); if (disabled) return; if(event.dataTransfer.files.length !== 1) { props.onError('Elegí un solo archivo por vez.'); return; } void props.onFile(event.dataTransfer.files[0]); }}>
    <FoxmindIcon name={file?.ready?'check':'file'}/><div><h4>{file?.ready?'Tu programa está listo':'Empezá por tu programa'}</h4><p>{file?.name ?? 'PDF, Word o PowerPoint · Hasta 20 MB'}</p>{file&&!file.ready?<p>El archivo debe aprobar la revisión antes de continuar.</p>:null}</div>
    <label className="program-picker">{file?'Cambiar archivo':'Elegir archivo'}<input ref={props.inputRef} type="file" aria-label="Archivo del plan de estudio" accept=".pdf,.doc,.docx,.ppt,.pptx" disabled={disabled} onChange={event=>{const target=event.target;void props.onFile(target.files?.[0]).finally(()=>{target.value='';});}}/></label>
    {file&&!file.ready?<button type="button" disabled={disabled} onClick={props.onRefresh}>Consultar estado</button>:null}
  </section>;
}
function ClassroomCurriculum({units,onUnits,onRemove=onUnits,onUndo}: {units:CurriculumUnit[];onUnits:(units:CurriculumUnit[])=>void;onRemove?:(units:CurriculumUnit[])=>void;onUndo?:()=>void}) {
  const change=(index:number,unit:CurriculumUnit)=>units.map((item,i)=>i===index?unit:item);
  const total=units.reduce((n,unit)=>n+unit.topics.length,0);
  return <div data-curriculum-editor className="class-curriculum">
    {onUndo?<button type="button" data-curriculum-undo onClick={onUndo}>Deshacer</button>:null}
    <div className="class-unit-list">{units.map((unit,index)=><section className="class-unit-editor" key={index} data-edit-unit>
      <header><span className="unit-number">{String(index+1).padStart(2,'0')}</span><label htmlFor={`class-unit-${index}`}>Unidad {index+1}</label>{units.length>1?<button type="button" aria-label={`Quitar unidad ${index+1}`} onClick={()=>onRemove(units.filter((_,i)=>i!==index))}><FoxmindIcon name="trash"/></button>:null}</header>
      <textarea id={`class-unit-${index}`} aria-label={`Nombre de la unidad ${index+1}`} data-edit-field={`unit-${index}`} rows={1} maxLength={120} placeholder="Nombre de la unidad" value={unit.name} onChange={event=>onUnits(change(index,{...unit,name:event.target.value.replace(/[\r\n]+/g,' ')}))}/>
      <div className="class-topic-list">{unit.topics.map((topic,topicIndex)=><div key={topicIndex}><span aria-hidden="true"/><label><span className="sr-only">Tema {topicIndex+1} de unidad {index+1}</span><textarea data-edit-field={`topic-${index}-${topicIndex}`} rows={1} maxLength={120} placeholder="Nombre del tema" value={topic.name} onChange={event=>onUnits(change(index,{...unit,topics:unit.topics.map((item,i)=>i===topicIndex?{...item,name:event.target.value.replace(/[\r\n]+/g,' ')}:item)}))}/></label>{unit.topics.length>1?<button type="button" aria-label={`Quitar tema ${topicIndex+1} de unidad ${index+1}`} onClick={()=>onRemove(change(index,{...unit,topics:unit.topics.filter((_,i)=>i!==topicIndex)}))}><FoxmindIcon name="close"/></button>:null}</div>)}</div>
      <button type="button" className="button" disabled={unit.topics.length>=100||total>=500} aria-label={`Agregar tema a unidad ${index+1}`} onClick={()=>onUnits(change(index,{...unit,topics:[...unit.topics,{name:''}]}))}><FoxmindIcon name="plus"/>Agregar tema</button>
    </section>)}</div><button type="button" className="button" disabled={units.length>=100||total>=500} onClick={()=>onUnits([...units,{name:'',topics:[{name:''}]}])}><FoxmindIcon name="plus"/>Agregar unidad</button>
  </div>;
}
