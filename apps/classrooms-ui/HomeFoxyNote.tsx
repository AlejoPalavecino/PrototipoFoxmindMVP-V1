import { FoxmindIcon, FoxmindIllustration } from '../shared-ui/index.ts';
import type { HomeModules, HomeRole } from '../../src/core/domain/index.ts';
import { homeFoxySuggestion } from './home-presentation.ts';

export function HomeFoxyNote({ role, modules }: { role: HomeRole; modules: HomeModules }) {
  const { title, detail } = homeFoxySuggestion(role, modules);
  return <section className="fm-home-foxy-note" aria-label="Un mensaje de Foxy">
    <div><span className="fm-home-foxy-eyebrow"><FoxmindIcon name="spark" />Un mensaje de Foxy</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
    <FoxmindIllustration name="hero/foxy-warm" sizes="160px" />
  </section>;
}
