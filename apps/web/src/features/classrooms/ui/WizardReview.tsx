import type { FileState } from '../../../../../../src/core/contracts/materials.ts';
import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';

export function WizardReview({payload,file,edit}:{payload:Payload;file:FileState|null;edit:(step:number)=>void}) {
 const units=payload.units??[],total=units.reduce((sum,unit)=>sum+unit.topics.length,0);
 return <section aria-label="Resumen del aula" className="class-review">
  <div className="class-review-card"><img src={learningCover(payload.coverKey)} alt=""/><div><span>{payload.subject}</span><h4>{payload.name}</h4><p>{payload.division} · Ciclo {payload.academicYear}</p></div><button type="button" aria-label="Editar datos del aula" onClick={()=>edit(0)}><FoxmindIcon name="edit"/>Editar</button></div>
  <div className="class-review-head"><div><h4>Tu recorrido de aprendizaje</h4><p>{units.length} {units.length===1?'unidad':'unidades'} · {total} {total===1?'tema':'temas'}</p></div><button type="button" aria-label="Editar unidades y temas" onClick={()=>edit(2)}><FoxmindIcon name="edit"/>Editar plan</button></div>
  <ol className="class-plan-summary">{units.map((unit,index)=><li key={unit.id??index}><span>{index+1}</span><div><b>{unit.name}</b><p>{unit.topics.map(topic=>topic.name).join(' · ')}</p></div></li>)}</ol>
  <div className="class-ready-note"><FoxmindIcon name="users"/><p><b>Primero tu aula. Después, tu grupo.</b><br/>Al crearla, la vas a encontrar en Mis aulas. Desde ahí podés entrar e invitar a tus estudiantes.</p></div>
 </section>;
}
