import { EntryIcon } from './EntryIcon';
import { FoxmindIllustration } from './FoxmindIllustration';
import { FoxmindIcon } from './FoxmindIcon';

/** Decorative brand artwork; account state stays with the account screen. */
export function AccountStory({ register = false, security = false, polished = false }: { register?: boolean; security?: boolean; polished?: boolean }) {
  if (polished) return <aside className="entry-story auth-story" aria-hidden="true">
    <picture className="auth-reference-art"><img
      src={`/foxmind-3d/auth-reference/${register ? 'register' : 'login'}-960.webp`}
      srcSet={`/foxmind-3d/auth-reference/${register ? 'register' : 'login'}-480.webp 480w, /foxmind-3d/auth-reference/${register ? 'register' : 'login'}-960.webp 960w`}
      sizes="(max-width: 760px) 1px, (max-width: 1080px) 53vw, 550px"
      width="960" height="1536" alt="" loading="eager" fetchPriority="high" /></picture>
    <div className="auth-story-copy">
      <h2>{register ? <>Un lugar<br />para todas<br /><span>tus ideas.</span></> : <>Tu próximo<br />descubrimiento<br />empieza <span>acá.</span></>}</h2>
      <p>{register ? 'Creá tu cuenta y empezá a explorar todo lo que FoxMind tiene para vos.' : 'Un espacio donde aprender, enseñar y crecer se hace más simple, más humano y más divertido.'}</p>
      <ul className="auth-reference-benefits">
        <li><FoxmindIcon name="book" /><span>Aprendé a tu ritmo</span></li>
        <li><FoxmindIcon name="users" /><span>Enseñá con más herramientas</span></li>
        <li><FoxmindIcon name="spark" /><span>Herramientas de IA para crear</span></li>
        {register ? <li><FoxmindIcon name="folder" /><span>Organizá tus aulas y actividades</span></li> : null}
      </ul>
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
