import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FoxmindIcon, EntryIcon } from '../../../shared-ui/index';

export function AccountField({ name, label, password, value, autoComplete, onChange, appearance }: {
  name: string; label: string; password?: boolean; value?: string; autoComplete?: string; onChange?: (value: string) => void;
  appearance?: 'polished';
}) {
  const [shown, setShown] = useState(false);
  const passwordHelp = password && autoComplete === 'new-password';
  return <div className="field">
    <Label htmlFor={name}>{label}</Label>
    <div className={`${password ? 'password-control' : ''}${appearance === 'polished' ? ' auth-reference-input' : ''}`}>
    {appearance === 'polished' ? <EntryIcon name={password ? 'lock' : name === 'email' ? 'envelope' : 'person-fill'} /> : null}
    <Input id={name} name={name} type={password && !shown ? 'password' : 'text'} required data-password-field={password || undefined}
      autoComplete={autoComplete} inputMode={name === 'email' ? 'email' : undefined}
      placeholder={appearance === 'polished' ? password ? autoComplete === 'new-password' ? 'Creá una contraseña' : 'Tu contraseña' : ({ email: 'tu@correo.com', firstName: 'Tu nombre', lastName: 'Tu apellido' } as Record<string, string>)[name] : undefined}
      autoCapitalize={name === 'email' ? 'none' : undefined} spellCheck={name === 'email' ? false : undefined}
      value={value} onChange={onChange ? event => onChange(event.target.value) : undefined}
      aria-describedby={passwordHelp ? `${name}-help` : undefined} />
    {password ? <button type="button" aria-label={`${shown ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-controls={name}
      aria-pressed={shown} className="password-toggle" onClick={() => setShown(current => !current)}>{appearance === 'polished' ? <FoxmindIcon name={shown ? 'eye-off' : 'eye'} /> : shown ? 'Ocultar' : 'Mostrar'}</button> : null}
    </div>
    {passwordHelp ? <p className="field-help" id={`${name}-help`}>{appearance === 'polished' ? 'Entre 16 y 128 caracteres. Podés usar espacios.' : 'Entre 16 y 128 caracteres. Puedes usar espacios y cualquier idioma.'}</p> : null}
  </div>;
}
