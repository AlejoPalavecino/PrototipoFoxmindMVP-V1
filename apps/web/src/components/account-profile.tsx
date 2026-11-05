import type { FormEvent } from 'react';
import type { AccountUser } from '../lib/account-client';
import { AccountField } from './account-field';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export type AccountSubmit = (path: string, success: string, method?: string) => (event: FormEvent<HTMLFormElement>) => void;
export function AccountProfile({ profile, firstName, lastName, locked, busy, onFirstName, onLastName, onCancel, submit }: {
  profile: AccountUser; firstName: string; lastName: string; locked: boolean; busy: boolean;
  onFirstName: (value: string) => void; onLastName: (value: string) => void; onCancel: () => void; submit: AccountSubmit;
}) {
  const initials = `${Array.from(profile.firstName)[0] ?? ''}${Array.from(profile.lastName)[0] ?? ''}`.toUpperCase();
  return <>
    <section className="profile-details fm3d-account-card" aria-labelledby="profile-details-heading">
      <div className="br-account-summary"><span className="br-account-avatar" aria-hidden="true">{initials}</span>
        <div><h2 id="profile-details-heading">{profile.firstName} {profile.lastName}</h2><p>{profile.accountRole === 'teacher' ? 'Cuenta docente' : 'Cuenta de alumno'}</p></div></div>
      <form noValidate onSubmit={submit('/account', 'Guardaste los cambios de tu perfil.', 'PATCH')}><fieldset disabled={locked}>
        <div className="field-grid"><AccountField name="firstName" label="Nombre" autoComplete="given-name" value={firstName} onChange={onFirstName} />
          <AccountField name="lastName" label="Apellido" autoComplete="family-name" value={lastName} onChange={onLastName} /></div>
        <div className="field"><Label htmlFor="profile-email">Correo electrónico</Label><Input id="profile-email" value={profile.email} readOnly autoComplete="email" aria-describedby="email-help" />
          <p id="email-help" className="field-help">El correo no se puede modificar desde el perfil.</p></div>
        <div className="form-actions"><Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
      </fieldset></form>
    </section>
  </>;
}
