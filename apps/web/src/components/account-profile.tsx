import { useEffect, useState, type FormEvent } from 'react';
import { ACCOUNT_AVATARS, accountAvatar, type AccountAvatarKey } from '../../../../src/core/domain/account-avatar';
import { AccountAvatar } from '../../../shared-ui/AccountAvatar';
import type { AccountUser } from '../lib/account-client';
import { AccountField } from './account-field';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export type AccountSubmit = (path: string, success: string, method?: string) => (event: FormEvent<HTMLFormElement>) => void;
export function AccountProfile({ profile, firstName, lastName, locked, busy, onFirstName, onLastName, submit }: {
  profile: AccountUser; firstName: string; lastName: string; locked: boolean; busy: boolean;
  onFirstName: (value: string) => void; onLastName: (value: string) => void; submit: AccountSubmit;
}) {
  const initials = `${Array.from(profile.firstName)[0] ?? ''}${Array.from(profile.lastName)[0] ?? ''}`.toUpperCase();
  const [avatarKey, setAvatarKey] = useState<AccountAvatarKey>(profile.avatarKey ?? 'initials');
  useEffect(() => { setAvatarKey(profile.avatarKey ?? 'initials'); }, [profile.id, profile.avatarKey]);
  const preview = accountAvatar(avatarKey);
  return <>
    <section className="profile-details fm3d-account-card" aria-labelledby="profile-details-heading">
      <div className="br-account-summary"><AccountAvatar className="br-account-avatar" avatarKey={avatarKey} initials={initials} />
        <div><h2 id="profile-details-heading">{profile.firstName} {profile.lastName}</h2><p>{profile.accountRole === 'teacher' ? 'Cuenta docente' : 'Cuenta de alumno'}</p></div></div>
      <form noValidate onSubmit={submit('/account', 'Guardaste los cambios de tu perfil.', 'PATCH')}><fieldset disabled={locked}>
        <fieldset className="br-avatar-picker" aria-describedby="avatar-help">
          <legend>Elegí tu avatar</legend>
          <p id="avatar-help">Dale tu toque al perfil con Foxy o conservá tus iniciales. Se aplica al guardar los cambios.</p>
          <div className="br-avatar-options">{ACCOUNT_AVATARS.map(avatar => <label key={avatar.key} className="br-avatar-option">
            <input type="radio" name="avatarKey" value={avatar.key} checked={avatarKey === avatar.key} onChange={() => setAvatarKey(avatar.key)} />
            <AccountAvatar avatarKey={avatar.key} initials={initials} />
            <span>{avatar.label}</span>
          </label>)}</div>
          <p className="br-avatar-preview" role="status">Vista previa: {preview.label}{avatarKey !== (profile.avatarKey ?? 'initials') ? ' · Sin guardar' : ''}</p>
        </fieldset>
        <div className="field-grid"><AccountField name="firstName" label="Nombre" autoComplete="given-name" value={firstName} onChange={onFirstName} />
          <AccountField name="lastName" label="Apellido" autoComplete="family-name" value={lastName} onChange={onLastName} /></div>
        <div className="field"><Label htmlFor="profile-email">Correo de la cuenta</Label><Input id="profile-email" value={profile.email} readOnly autoComplete="email" /></div>
        <div className="form-actions">
          <Button type="submit">{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
      </fieldset></form>
    </section>
  </>;
}
