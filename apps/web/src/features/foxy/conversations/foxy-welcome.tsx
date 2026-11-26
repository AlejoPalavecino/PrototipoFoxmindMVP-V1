import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import styles from '../workspace/foxy-workspace.module.css';
import type { FoxyToolId, FoxyToolItem } from '../tools/foxy-tool-groups.ts';
import type { FoxyCreation } from '../api/foxy-client';

const kindLabels: Record<FoxyCreation['kind'], string> = { NOTE: 'Apunte', PLAN: 'Plan de clase', ACTIVITY: 'Actividad', RUBRIC: 'Rúbrica', DIAGRAM: 'Esquema', IMAGE: 'Imagen' };
const day = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(date); };

/**
 * First screen of a teacher conversation: tools grouped by intent and «Retomá» with the latest creations,
 * so the teacher starts from what they need instead of from loose suggestions.
 */
export function FoxyWelcome({ onExample, tool, groups = [], disabled, onTool, recent = [], onRecent }: {
  onExample: (prompt: string) => void;
  tool?: { label: string; placeholder: string };
  groups?: { id: string; label: string; items: FoxyToolItem[] }[];
  disabled?: boolean;
  onTool?: (id: FoxyToolId) => void;
  recent?: FoxyCreation[];
  onRecent?: (item: FoxyCreation) => void;
}) {
  return <div className={`${styles.welcome} parity-ai-welcome parity-foxy-welcome`}>
    <div className={`${styles.foxyMark} parity-ai-foxyMark`}><img src="/foxmind/foxy.webp" alt="" width={108} height={108} /><span className={`${styles.orbitOne} parity-ai-orbitOne`}><FoxmindIcon name="book"/></span><span className={`${styles.orbitTwo} parity-ai-orbitTwo`}><FoxmindIcon name="spark"/></span></div>
    <h2>{tool?.label ?? '¿Qué preparamos hoy?'}</h2>
    <p>{tool?.placeholder ?? 'Elegí qué necesitás o escribile a Foxy. Vas a revisar todo antes de llevarlo al aula.'}</p>
    {!tool && onTool && groups.map(group => <section key={group.id} className="parity-foxy-intentGroup" aria-label={group.label}>
      <h3>{group.label}</h3>
      <div className="parity-foxy-intents">
        {group.items.map(item => <button key={item.value} type="button" disabled={disabled} onClick={() => onTool(item.value)}>
          <span className={`parity-foxy-toolIcon ${item.color}`}><FoxmindIcon name={item.icon}/></span>
          <b>{item.label}</b>
          <small>{item.hint}</small>
        </button>)}
      </div>
    </section>)}
    {!tool && !onTool && <div className={`${styles.welcomePrompts} parity-ai-welcomePrompts`}>
      <button className={`${styles.suggestion} parity-ai-suggestion`} type="button" onClick={() => onExample('Busquemos otra forma de explicarlo')}><FoxmindIcon name="chat-square"/>Busquemos otra forma de explicarlo</button>
      <button className={`${styles.suggestion} parity-ai-suggestion`} type="button" onClick={() => onExample('Ayudame a pensar una clase')}><FoxmindIcon name="calendar"/>Ayudame a pensar una clase</button>
    </div>}
    {!tool && onRecent && recent.length > 0 && <section className="parity-foxy-recent" aria-label="Retomá">
      <h3>Retomá</h3>
      {recent.map(item => <button key={item.id} type="button" disabled={disabled} onClick={() => onRecent(item)}>
        <FoxmindIcon name="foxy-folder"/>
        <span><b>{item.title}</b><small>{[kindLabels[item.kind], day(item.createdAt)].filter(Boolean).join(' · ')}</small></span>
        <FoxmindIcon name="arrow-right"/>
      </button>)}
    </section>}
  </div>;
}
