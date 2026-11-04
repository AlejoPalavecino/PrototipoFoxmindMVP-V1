import { FoxmindIcon } from '../shared-ui/index.ts';
import type { HomeModules, HomeRole, HomeTarget } from '../../src/core/domain/index.ts';
import { homeFoxySuggestion } from './home-presentation.ts';

export function HomeFoxyNote({ role, modules, onAction, onClassrooms, busy }: {
  role: HomeRole; modules: HomeModules; onAction: (target: HomeTarget) => void; onClassrooms: () => void; busy?: boolean;
}) {
  const { title, detail, target } = homeFoxySuggestion(role, modules);
  const action = target ? target.kind === 'wall' ? 'Ver consulta' : role === 'teacher' ? 'Revisar entregas' : 'Ver actividad' : 'Ir a mis aulas';
  return <section className="fm-home-foxy-note" aria-label="Un mensaje de Foxy">
    <div><span className="fm-home-foxy-eyebrow"><FoxmindIcon name="spark" />Foxy te acompaña</span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <button disabled={busy} onClick={() => target ? onAction(target) : onClassrooms()}>{action}<FoxmindIcon name="arrow-right"/></button>
    </div>
    <FoxmindIcon name="book" className="fm-home-foxy-book"/>
  </section>;
}
