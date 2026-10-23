import { EntryIcon } from './EntryIcon';

/** Decorative brand artwork; account state stays with the account screen. */
export function AccountStory({ register = false }: { register?: boolean }) {
  return <aside className="entry-story" aria-hidden="true">
    {register ? <h2>Un lugar para<br /><span>enseñar</span> y aprender.</h2>
      : <h2>Tu próximo<br /><span>paso</span> empieza acá.</h2>}
    <p>{register ? 'Ideas, actividades y clases en un mismo espacio.' : 'Enseñá y aprendé, en un mismo lugar.'}</p>
    <img src={register ? '/folders/foxy-reading.png' : '/folders/foxy-welcome.png'} width="600" height="600" alt="" fetchPriority="high" />
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
