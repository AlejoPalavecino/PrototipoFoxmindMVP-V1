import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
export function WizardGeneral({payload,zones,onUpdate,changingZone=false,onToggleZone}:{payload:Payload;zones:{value:string;label:string}[];onUpdate:(key:keyof Payload,value:unknown)=>void;changingZone?:boolean;onToggleZone?:()=>void}) {
 const zone=zones.find(item=>item.value===payload.timezone)?.label??payload.timezone??'UTC';
 return <div className="class-form-grid">
  <label>Nombre del aula<input required autoFocus placeholder="Por ejemplo: Fotografía y luz" maxLength={120} value={payload.name??''} onChange={event=>onUpdate('name',event.target.value)}/></label>
  <label>Materia<input required placeholder="Por ejemplo: Fotografía" maxLength={120} value={payload.subject??''} onChange={event=>onUpdate('subject',event.target.value)}/></label>
  <div className="class-form-pair"><label>Grupo o división<input required placeholder="Por ejemplo: 3.º A" maxLength={60} value={payload.division??''} onChange={event=>onUpdate('division',event.target.value)}/></label>
  <label>Ciclo lectivo<input type="number" required min="1" max="9999" value={payload.academicYear??''} onChange={event=>onUpdate('academicYear',event.target.value?Number(event.target.value):undefined)}/></label></div>
  <div className="class-zone-info"><FoxmindIcon name="clock"/><div><b>{zone}</b><p>Zona horaria del aula. Se usa para las entregas y queda fija al crearla.</p>{changingZone?<label>Zona horaria<select value={payload.timezone??'UTC'} onChange={event=>onUpdate('timezone',event.target.value)}>{zones.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>:null}</div><button type="button" aria-expanded={changingZone} onClick={onToggleZone}>{changingZone?'Listo':'Cambiar'}</button></div>
 </div>;
}
