import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { ACCOUNT_AVATARS, accountAvatar, type AccountAvatarKey } from '../../../../../../src/core/domain/identity/account-avatar.ts';
import { AccountAvatar } from '../../../../../shared-ui/AccountAvatar';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import { Button } from '../../../../../shared-ui/primitives/button';
import { Input } from '../../../../../shared-ui/primitives/input';
import { Label } from '../../../../../shared-ui/primitives/label';
import type { AccountUser } from '../api/account-client';
import type { AccountSubmit } from '../model/form-types';
import styles from './account-profile.module.css';

function nameError(value: string, name: 'nombre' | 'apellido') {
  if (!value.trim()) return `Completá tu ${name}.`;
  if ([...value].length > 80) return 'Usá hasta 80 caracteres.';
  if (/[\uD800-\uDFFF]/u.test(value)) return `Revisá los caracteres de tu ${name}.`;
  return '';
}

export function AccountProfile({ profile, firstName, lastName, locked, busy, signOut, onFirstName, onLastName, submit }: {
  profile: AccountUser; firstName: string; lastName: string; locked: boolean; busy: boolean;
  onFirstName: (value: string) => void; onLastName: (value: string) => void; submit: AccountSubmit; signOut?: ReactNode;
}) {
  const savedAvatar = profile.avatarKey ?? 'initials';
  const [avatarKey, setAvatarKey] = useState<AccountAvatarKey>(savedAvatar);
  const [picker, setPicker] = useState<AccountAvatarKey | null>(null);
  const [validate, setValidate] = useState(false);
  const firstField = useRef<HTMLInputElement>(null), lastField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setAvatarKey(savedAvatar); setPicker(null); setValidate(false);
  }, [profile.id, savedAvatar]);
  const dirty = firstName !== profile.firstName || lastName !== profile.lastName || avatarKey !== savedAvatar;
  const initials = [firstName, lastName].map(value => [...value.trim()][0] ?? '').join('').toLocaleUpperCase('es') || '·';
  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'Tu nombre';
  const role = profile.accountRole === 'teacher' ? 'Docente' : 'Estudiante';
  const errors = [nameError(firstName, 'nombre'), nameError(lastName, 'apellido')];
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || !dirty) return;
    if (errors.some(Boolean)) {
      setValidate(true);
      (errors[0] ? firstField : lastField).current?.focus();
      return;
    }
    submit('/account', 'Guardaste los cambios de tu perfil.', 'PATCH')(event);
  }
  function discard() {
    onFirstName(profile.firstName);
    onLastName(profile.lastName);
    setAvatarKey(savedAvatar);
    setValidate(false);
    firstField.current?.focus();
  }
  return <div className={`pf-layout ${styles.layout}`}>
    <form className={`pf-form ${styles.details}`} aria-labelledby="profile-details-heading" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={locked} className={styles.fieldsWrap}>
        <div className={`pf-identity ${styles.identity}`} aria-label="Vista previa de tu perfil">
          <AccountAvatar className={styles.portrait} avatarKey={avatarKey} initials={initials}/>
          <div><small>Vista previa</small><p className={`pf-display-name ${styles.displayName}`}>{displayName}</p>
            <Button type="button" variant="outline" onClick={() => setPicker(avatarKey)}><FoxmindIcon name="edit"/>Cambiar avatar</Button>
          </div>
        </div>
        <div className={`pf-content ${styles.content}`}>
          <h2 id="profile-details-heading">Datos de perfil</h2>
          <p id="profile-name-help">Hasta 80 caracteres por nombre y apellido.</p>
          <input type="hidden" name="avatarKey" value={avatarKey}/>
          <div className={`pf-fields ${styles.fields}`}>
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input ref={firstField} id="firstName" name="firstName" autoComplete="given-name" required value={firstName}
                aria-invalid={validate && !!errors[0] || undefined}
                aria-describedby={validate && errors[0] ? 'profile-name-help profile-first-error' : 'profile-name-help'}
                onChange={event => onFirstName(event.target.value)}/>
              {validate && errors[0] ? <p id="profile-first-error" className={styles.fieldError}>{errors[0]}</p> : null}
            </div>
            <div>
              <Label htmlFor="lastName">Apellido</Label>
              <Input ref={lastField} id="lastName" name="lastName" autoComplete="family-name" required value={lastName}
                aria-invalid={validate && !!errors[1] || undefined}
                aria-describedby={validate && errors[1] ? 'profile-name-help profile-last-error' : 'profile-name-help'}
                onChange={event => onLastName(event.target.value)}/>
              {validate && errors[1] ? <p id="profile-last-error" className={styles.fieldError}>{errors[1]}</p> : null}
            </div>
            <div><Label htmlFor="profile-email">Correo electrónico</Label><Input id="profile-email" value={profile.email} readOnly autoComplete="email"/></div>
            <div><Label htmlFor="profile-role">Rol</Label><Input id="profile-role" value={role} readOnly/></div>
          </div>
          <footer className={`pf-footer ${styles.footer}`}>
            <p role="status">{busy ? 'Guardando tu perfil…' : dirty ? 'Tenés cambios sin guardar.' : 'Tu perfil está al día.'}</p>
            <div className={`pf-actions ${styles.actions}`}>
              <Button type="button" variant="outline" disabled={!dirty} onClick={discard}>Descartar cambios</Button>
              <Button type="submit" disabled={!dirty}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button>
            </div>
          </footer>
        </div>
      </fieldset>
    </form>
    <aside className={`pf-account ${styles.account}`} aria-labelledby="profile-config-heading">
      <span className={styles.shield}><FoxmindIcon name="shield"/></span>
      <h2 id="profile-config-heading">Configuración de cuenta</h2>
      <div className={`pf-session ${styles.session}`}><strong><FoxmindIcon name="lock"/>Contraseña y sesión</strong>
        <p>Podés cambiar tu contraseña y gestionar tu sesión desde Configuración.</p>
        <Link href="/settings">Abrir Configuración</Link>
        {signOut}
      </div>
    </aside>
    {picker !== null ? <Dialog title="Elegí tu avatar" className={styles.picker} onClose={() => setPicker(null)}>
      <div className={styles.pickerPreview}>
        <AccountAvatar className={styles.portrait} avatarKey={picker} initials={initials}/>
        <div><strong>{accountAvatar(picker).label}</strong><p>El cambio se aplica cuando guardás el perfil.</p></div>
      </div>
      <fieldset className={styles.options}><legend className="sr-only">Opciones de avatar</legend>
        {ACCOUNT_AVATARS.map(avatar => <label key={avatar.key} className={styles.option}>
          <input type="radio" name="profile-preview-avatar" value={avatar.key} checked={picker === avatar.key} onChange={() => setPicker(avatar.key)}/>
          <AccountAvatar className={styles.optionAvatar} avatarKey={avatar.key} initials={initials}/>
          <span>{avatar.label}</span>
        </label>)}
      </fieldset>
      <div className={`pf-actions ${styles.actions}`}>
        <Button type="button" variant="outline" onClick={() => setPicker(null)}>Cancelar</Button>
        <Button type="button" onClick={() => { setAvatarKey(picker); setPicker(null); }}>Usar este avatar</Button>
      </div>
    </Dialog> : null}
  </div>;
}
