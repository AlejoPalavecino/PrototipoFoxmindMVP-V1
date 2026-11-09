import type { RefObject } from 'react';
import s from './interaction-feedback.module.css';

export function CollectionStateFilter<T extends string>({ label, items, value, onChange, selectedRef }: {
  label: string; items: {value:T;label:string;count:number}[]; value:T; onChange:(value:T)=>void; selectedRef?:RefObject<HTMLButtonElement|null>;
}) {
  return <nav className={s.buckets} aria-label={label}>{items.map(item => <button type="button" key={item.value}
    aria-pressed={value===item.value} ref={value===item.value?selectedRef:undefined} onClick={()=>onChange(item.value)}>
    {item.label}<span>{item.count}</span></button>)}</nav>;
}
