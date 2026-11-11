import type {ReactNode} from 'react';
import styles from './academic-activity.module.css';
import { FoxmindIcon } from '../../../shared-ui/FoxmindIcon';

/** Academic content is a page within the classroom; only confirmations use dialogs. */
export function ActivityScreen({title,label,onClose,children,actions,kicker}:{title:string;label?:string;onClose:()=>void;children:ReactNode;actions?:ReactNode;kicker?:ReactNode}){
 return <section className={`brujula-activity-screen ${styles.screen}`} aria-label={label??title}>
  <button className="brujula-activity-back" type="button" onClick={onClose}><FoxmindIcon name="arrow-left"/>Volver a actividades</button>
  <header className="p5-section-head"><div>{kicker?<small className="brujula-activity-kicker">{kicker}</small>:null}<h2>{title}</h2></div>{actions?<div className="brujula-activity-header-actions">{actions}</div>:null}</header>{children}
 </section>;
}
