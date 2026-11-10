import type { ReactNode } from 'react';
import type { AccountUser } from '../api/account-client';
import type { AccountSubmit } from '../model/form-types';
import { AccountField } from './account-field';
import { Button } from '../../../../../shared-ui/primitives/button';

export function AccountSettings({ user, locked, busy, submit, signOut }: {
  user: AccountUser; locked: boolean; busy: boolean; submit: AccountSubmit; signOut: ReactNode;
}) {
  return <>
    <section className="password-section fm3d-account-card" aria-labelledby="password-heading">
      <h2 id="password-heading">Contraseña</h2>
      <p>Tu sesión se renovará y se cerrarán las demás sesiones de tu cuenta.</p>
      <form noValidate onSubmit={submit('/account/password', 'Contraseña actualizada. Tu sesión continúa y las demás sesiones se cerraron.')}>
        <fieldset disabled={locked}>
          <AccountField name="currentPassword" label="Contraseña actual" password autoComplete="current-password" />
          <AccountField name="newPassword" label="Nueva contraseña" password autoComplete="new-password" />
          <AccountField name="confirmPassword" label="Repetir contraseña" password autoComplete="new-password" />
          <Button type="submit">{busy ? 'Actualizando…' : 'Cambiar contraseña'}</Button>
        </fieldset>
      </form>
    </section>
    <section className="fm3d-account-card br-account-session"><div><h2>Sesión actual</h2><p>{user.email}</p></div>{signOut}</section>
  </>;
}
