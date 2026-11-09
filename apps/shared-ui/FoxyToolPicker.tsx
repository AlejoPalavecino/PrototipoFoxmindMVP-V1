import { FoxmindIcon } from './FoxmindIcon';
import type { IconKey } from './foxmind-assets';
import s from './interaction-feedback.module.css';

export function FoxyToolPicker<T extends string>({ items, value, disabled, onChange }: {
  items: {value:T;label:string;hint:string;icon:IconKey}[]; value:T|null; disabled?:boolean; onChange:(value:T)=>void;
}) {
  return <div className={s.tools} role="group" aria-label="Tipo de ayuda">{items.map(item=><button type="button" key={item.value}
    disabled={disabled} aria-pressed={value===item.value} onClick={()=>onChange(item.value)}>
    <span className={s.toolIcon}><FoxmindIcon name={item.icon}/></span><span><strong>{item.label}</strong><small>{item.hint}</small></span><span aria-hidden="true">›</span>
  </button>)}</div>;
}
