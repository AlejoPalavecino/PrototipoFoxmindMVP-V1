import type { ReactNode } from 'react';
import { Cover } from './academic-cover';
import { FoxmindIcon } from './FoxmindIcon';
import styles from './academic-creation-review.module.css';

type Unit = { id?: string; name: string; topics: { id?: string; name: string }[] };
export function CreationReview({label,title,cover,details,fileName,units,edit}:{
  label:string; title?:string; cover?:string; details:ReactNode; fileName?:string;
  units:Unit[]; edit:(step:number)=>void;
}) {
  const topics=units.reduce((total,unit)=>total+unit.topics.length,0);
  return <section className={styles.review} aria-label={label}>
    <div className={styles.card}>
      <div className={styles.cover}><Cover kind={cover}/></div>
      <div><h4>{title}</h4>{details}<button type="button" onClick={()=>edit(0)}>Editar datos y portada</button></div>
    </div>
    <div className={styles.row}>
      <div><strong><FoxmindIcon name="file"/>Archivo del plan</strong><p>{fileName}</p></div>
      <button type="button" onClick={()=>edit(1)}>Editar carga del plan</button>
    </div>
    <div className={styles.row}>
      <div><h4>Unidades y temas</h4><p>{units.length} {units.length===1?'unidad':'unidades'} · {topics} {topics===1?'tema':'temas'}</p></div>
      <button type="button" onClick={()=>edit(2)}>Editar unidades y temas</button>
    </div>
    <ol className={styles.units}>{units.map((unit,index)=><li key={unit.id??index}>
      <details><summary><strong>{unit.name}</strong><small>{unit.topics.length} {unit.topics.length===1?'tema':'temas'}</small></summary>
        <ul>{unit.topics.map((topic,position)=><li key={topic.id??position}>{topic.name}</li>)}</ul>
      </details>
    </li>)}</ol>
  </section>;
}
