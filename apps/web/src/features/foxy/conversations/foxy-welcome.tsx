import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import styles from '../workspace/foxy-workspace.module.css';

export function FoxyWelcome({ onExample, tool }: { onExample: (prompt: string) => void; tool?: { label: string; placeholder: string } }) {
  return <div className={`${styles.welcome} parity-ai-welcome`}>
    <div className={`${styles.foxyMark} parity-ai-foxyMark`}><img src="/foxmind/foxy.webp" alt="" width={108} height={108} /><span className={`${styles.orbitOne} parity-ai-orbitOne`}><FoxmindIcon name="book"/></span><span className={`${styles.orbitTwo} parity-ai-orbitTwo`}><FoxmindIcon name="spark"/></span></div>
    <h2>{tool?.label ?? '¿Qué idea trabajamos hoy?'}</h2>
    <p>{tool?.placeholder ?? 'Busquemos juntos una forma de explicarla, una actividad o un nuevo punto de partida.'}</p>
    {!tool ? <div className={`${styles.welcomePrompts} parity-ai-welcomePrompts`}><button className={`${styles.suggestion} parity-ai-suggestion`} type="button" onClick={()=>onExample('Busquemos otra forma de explicarlo')}><FoxmindIcon name="chat-square"/>Busquemos otra forma de explicarlo</button><button className={`${styles.suggestion} parity-ai-suggestion`} type="button" onClick={()=>onExample('Ayudame a pensar una clase')}><FoxmindIcon name="calendar"/>Ayudame a pensar una clase</button></div> : null}
  </div>;
}
