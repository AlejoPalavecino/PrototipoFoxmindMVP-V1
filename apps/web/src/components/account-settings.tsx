import type { ReactNode } from 'react';
import type { AccountUser } from '../lib/account-client';
import type { AccountSubmit } from './account-profile';
import { AccountField } from './account-field';
import { Button } from './ui/button';

export function AccountSettings({ user, locked, busy, submit, signOut }: {
  user: AccountUser; locked: boolean; busy: boolean; submit: AccountSubmit; signOut: ReactNode;
}) {
  return <>
    <section className="password-section fm3d-account-card" aria-labelledby="password-heading">
      <h2 id="password-heading">Cambiar contraseña</h2>
      <p>Tu sesión se renovará y se cerrarán las demás sesiones de tu cuenta.</p>
      <form noValidate onSubmit={submit('/account/password', 'Contraseña actualizada. Tu sesión continúa y las demás sesiones se cerraron.')}>
        <fieldset disabled={locked}>
          <AccountField name="currentPassword" label="Contraseña actual" password autoComplete="current-password" />
          <AccountField name="newPassword" label="Nueva contraseña" password autoComplete="new-password" />
          <Button type="submit">{busy ? 'Actualizando…' : 'Cambiar contraseña'}</Button>
        </fieldset>
      </form>
    </section>
    <section className="fm3d-account-card"><h2>Sesión</h2><p>Cierra tu sesión cuando termines en un equipo compartido.</p>{signOut}</section>
  </>;
}
