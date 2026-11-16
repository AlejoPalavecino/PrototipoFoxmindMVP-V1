import { FoxmindIcon } from './FoxmindIcon';
import type { IconKey } from './foxmind-assets';

export function FoxyToolPicker<T extends string>({ items, value, disabled, onChange }: {
  items: {value:T;label:string;hint:string;example?:string;icon:IconKey;opensDialog?:boolean;color?:string}[]; value:T|null; disabled?:boolean; onChange:(value:T)=>void;
}) {
  return <div className="parity-foxy-tools" role="group" aria-label="Tipo de ayuda">{items.map(item=><button type="button" key={item.value}
    disabled={disabled} aria-pressed={item.opensDialog ? undefined : value===item.value}
    aria-haspopup={item.opensDialog ? 'dialog' : undefined} onClick={()=>onChange(item.value)}>
    <span className={`parity-foxy-toolIcon ${item.color ?? ''}`}><FoxmindIcon name={item.icon}/></span>
    <span className="parity-foxy-toolCopy"><strong>{item.label}</strong><small>{item.hint}</small>
      {item.example && <small className="parity-foxy-toolExample"><span>Por ejemplo</span>{item.example}</small>}
    </span>
    <span className="parity-foxy-toolArrow" aria-hidden="true"><FoxmindIcon name="chevron-right"/></span>
  </button>)}</div>;
}
