export function CreationSteps({steps,step,label}:{steps:string[];step:number;label:string}) {
  return <ol className="brujula-wizard-steps" aria-label={label}>{steps.map((title,index)=><li key={title}
    aria-current={index===step?'step':undefined} className={index===step?'current':''}>{index+1} · {title}</li>)}</ol>;
}
