import { FoxmindIcon, FoxmindIllustration } from '../shared-ui/index.ts';

export function HomeFoxyNote() {
  return <section className="fm-home-foxy-note" aria-label="Un mensaje de Foxy">
    <div><span className="fm-home-foxy-eyebrow"><FoxmindIcon name="spark" />Un mensaje de Foxy</span>
      <h2>Cada paso cuenta.</h2>
      <p>Los grandes aprendizajes empiezan con pequeños avances.</p>
      <small>Elige una tarea y dale tu atención.</small>
    </div>
    <FoxmindIllustration name="hero/foxy-warm" sizes="160px" />
  </section>;
}
