import styles from './academic-creation.module.css';
import { learningCover } from './parity-assets.ts';
import { FoxmindIcon } from './FoxmindIcon';
export function CreationSteps({steps,step,label,cover,title,subtitle}:{steps:readonly string[];step:number;label:string;cover?:string;title?:string;subtitle?:string}){
 return <aside className={styles.rail}><ol className={styles.steps} aria-label={label}>{steps.map((name,index)=><li key={name} aria-current={index===step?'step':undefined} data-completed={index<step}><b aria-hidden="true">{index<step?<FoxmindIcon name="check"/>:index+1}</b><span>{name}{index<step?<small>Completado</small>:index===step?<small>Estás acá</small>:<small>Un paso a la vez</small>}</span></li>)}</ol><div className={styles.preview}><img src={learningCover(cover)} alt=""/><div><small>Así se va a ver</small><strong>{title||'Tu próximo espacio'}</strong><p>{subtitle||'Un lugar para aprender'}</p></div></div><p className={styles.private}><FoxmindIcon name="lock"/>Tu borrador es sólo tuyo.</p><p className={styles.mobileStep}>Paso {step+1} de {steps.length} · {steps[step]}</p></aside>;
}
