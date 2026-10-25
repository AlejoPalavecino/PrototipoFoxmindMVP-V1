import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function AccountField({ name, label, password, value, autoComplete, onChange }: {
  name: string; label: string; password?: boolean; value?: string; autoComplete?: string; onChange?: (value: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const passwordHelp = password && autoComplete === 'new-password';
  return <div className="field">
    <Label htmlFor={name}>{label}</Label>
    <div className={password ? 'password-control' : undefined}>
    <Input id={name} name={name} type={password && !shown ? 'password' : 'text'} required data-password-field={password || undefined}
      autoComplete={autoComplete} inputMode={name === 'email' ? 'email' : undefined}
      autoCapitalize={name === 'email' ? 'none' : undefined} spellCheck={name === 'email' ? false : undefined}
      value={value} onChange={onChange ? event => onChange(event.target.value) : undefined}
      aria-describedby={passwordHelp ? `${name}-help` : undefined} />
    {password ? <button type="button" aria-label={`${shown ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-controls={name}
      aria-pressed={shown} className="password-toggle" onClick={() => setShown(current => !current)}>{shown ? 'Ocultar' : 'Mostrar'}</button> : null}
    </div>
    {passwordHelp ? <p className="field-help" id={`${name}-help`}>Entre 16 y 128 caracteres. Puedes usar espacios y cualquier idioma.</p> : null}
  </div>;
}
