import { EntryIcon } from './EntryIcon';
import { FoxmindIllustration } from './FoxmindIllustration';

/** Decorative brand artwork; account state stays with the account screen. */
export function AccountStory({ register = false, security = false, polished = false }: { register?: boolean; security?: boolean; polished?: boolean }) {
  if (polished) return <aside className="entry-story auth-story" aria-hidden="true">
    <FoxmindIllustration name="scenes/auth" priority sizes="(max-width: 900px) 1px, 53vw" />
    <div className="auth-story-copy">
      <h2>{register ? <>Un lugar para<br />todas tus ideas.</> : <>Tu próximo<br />descubrimiento<br />empieza acá.</>}</h2>
      <p>{register ? 'Aprendé, enseñá y descubrí con FoxMind.' : 'Un espacio para aprender y enseñar.'}</p>
    </div>
  </aside>;
  return <aside className="entry-story" aria-hidden="true">
    {register ? <h2>Un lugar para<br /><span>enseñar</span> y aprender.</h2>
      : <h2>Tu próximo<br /><span>paso</span> empieza acá.</h2>}
    <p>{register ? 'Ideas, actividades y clases en un mismo espacio.' : 'Enseñá y aprendé, en un mismo lugar.'}</p>
    <FoxmindIllustration name={security ? 'scenes/security' : 'scenes/auth'} sizes="(max-width: 700px) 160px, 40vw" />
  </aside>;
}

export function AccountSteps() {
  return <ol className="account-steps" aria-label="Pasos para empezar">
    <li aria-current="step"><span aria-hidden="true">1</span>Crear cuenta</li>
    <li><span aria-hidden="true">2</span>Verificar correo</li>
    <li><span aria-hidden="true">3</span>Entrar</li>
  </ol>;
}

export function AccountFolderIcon({ kind }: { kind: 'home' | 'book' | 'mail' | 'person' | 'lock' }) {
  const names = {
    home: 'house-door-fill',
    book: 'book',
    mail: 'envelope',
    person: 'person-fill',
    lock: 'lock',
  };
  return <EntryIcon name={names[kind]} />;
}
