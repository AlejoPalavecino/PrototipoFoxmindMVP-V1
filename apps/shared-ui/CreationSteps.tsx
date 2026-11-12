import styles from './academic-creation.module.css';

export function CreationSteps({steps,step,label}:{steps:readonly string[];step:number;label:string}) {
  return <>
    <ol className={styles.steps} aria-label={label}>
      {steps.map((title,index)=><li key={title} aria-current={index===step?'step':undefined} data-completed={index<step}>
        <b aria-hidden="true">{index<step?'✓':index+1}</b><span>{title}</span>
        {index<step?<span className="sr-only">, completado</span>:null}
      </li>)}
    </ol>
    <p className={styles.mobileStep}>Paso {step+1} de {steps.length} · {steps[step]}</p>
  </>;
}
