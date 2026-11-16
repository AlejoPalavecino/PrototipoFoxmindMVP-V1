import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { coverOptions } from '../../../../../shared-ui/academic-cover.tsx';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
const primary=[{key:'literature',label:'Creatividad'},{key:'biology',label:'Naturaleza'},{key:'math',label:'Ideas y números'}];
export function ClassroomWizardCover({payload,onUpdate,expanded=false,onToggle}:{payload:Payload;onUpdate:(key:keyof Payload,value:unknown)=>void;expanded?:boolean;onToggle?:()=>void}) {
 const all=coverOptions(payload.coverKey),current=all.find(item=>item.key===payload.coverKey);
 const visible=[...primary,...(current&&!primary.some(item=>item.key===current.key)?[current]:[])];
 return <fieldset className="class-cover-picker"><legend>Una portada para reconocerla</legend><div>{visible.map(cover=><label className="class-cover-option" key={cover.key}><img src={learningCover(cover.key)} alt=""/><span><input type="radio" name="coverKey" value={cover.key} checked={payload.coverKey===cover.key} onChange={()=>onUpdate('coverKey',cover.key)}/>{cover.label}<FoxmindIcon name="check"/></span></label>)}</div></fieldset>;
}
