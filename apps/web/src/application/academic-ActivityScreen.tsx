import type {ReactNode} from 'react';
import styles from './academic-activity.module.css';
import { FoxmindIcon } from '../../../shared-ui/FoxmindIcon';

export function ActivityScreen({title,label,onClose,children,actions,kicker,metadata,focused,subtitle,footer,overview}:{title?:string;label?:string;onClose?:()=>void;children:ReactNode;actions?:ReactNode;kicker?:ReactNode;metadata?:ReactNode;focused?:boolean;subtitle?:string;footer?:ReactNode;overview?:boolean}){
 return <section className={`brujula-activity-screen ${styles.screen}`} aria-label={label??title} data-focused={focused || undefined}>
  {focused && onClose ? <header className="parity-focus-top"><button type="button" aria-label="Volver a actividades" onClick={onClose}><FoxmindIcon name="arrow-left"/></button><div><strong>{title}</strong><small>{subtitle}</small></div></header> : onClose ? <button className="brujula-activity-back" type="button" onClick={onClose}><FoxmindIcon name="arrow-left"/>Volver a actividades</button> : null}
  {title && !overview ? <header className="p5-section-head parity-work-heading"><div>{kicker?<small className="brujula-activity-kicker">{kicker}</small>:null}{metadata ? <p className={styles.screenMeta}><FoxmindIcon name="calendar"/>{metadata}</p> : null}<h2>{title}</h2></div>{actions?<div className="brujula-activity-header-actions">{actions}</div>:null}</header> : null}{children}
  {footer ? <footer className="parity-focus-footer">{footer}</footer> : null}
 </section>;
}
