import Link from 'next/link';
import type { AccountUser } from '../lib/account-client';
import { FoxmindIllustration } from '../../../shared-ui';

/** Confirmed identity only; caller retains the session and profile-loading guards. */
export function AccountArtwork({ user, settings }: { user: AccountUser; settings: boolean }) {
  const initials = `${Array.from(user.firstName)[0] ?? ''}${Array.from(user.lastName)[0] ?? ''}`.toUpperCase();
  return <aside className="fm3d-account-art" aria-label="Tu cuenta">
    <section className="fm3d-account-card fm3d-account-summary">
      <span className="initials" aria-hidden="true">{initials}</span>
      <div><h2>{user.firstName} {user.lastName}</h2>
        <p>{settings ? user.email : 'Así aparece tu nombre en tus aulas.'}</p></div>
      {settings ? <Link className="button button-outline" href="/profile">Ir a Mi perfil</Link> : <p className="profile-verified">Correo verificado</p>}
    </section>
    <FoxmindIllustration name={settings ? 'scenes/security' : 'scenes/profile'} priority
      sizes="(max-width: 900px) 160px, (max-width: 1199px) 30vw, 360px" />
  </aside>;
}
