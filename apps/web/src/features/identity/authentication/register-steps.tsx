import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AccountSubmit } from '../model/form-types';
import { AccountField as Field } from '../controls/account-field';
import { Button } from '../../../../../shared-ui/primitives/button';

type Role = 'teacher' | 'student';
const ROLES: Record<Role, { label: string; summary: string; avatar: string; points: string }> = {
  teacher: { label: 'Docente', summary: 'Cuenta docente', avatar: '/brujula/avatars/foxy-classic.webp', points: 'Creás aulas y actividades. Corregís y das devoluciones.' },
  student: { label: 'Estudiante', summary: 'Cuenta de estudiante', avatar: '/brujula/avatars/foxy-explorer.webp', points: 'Te unís a aulas con un código. Resolvés actividades y repasás.' },
};
const STOPS = ['Tu rol', 'Tus datos', 'Tu correo'];
export const REGISTER_ACCEPTED = 'Si los datos son válidos para crear una cuenta, vas a recibir un correo de verificación. Revisá también la carpeta de correo no deseado. Si ya tenés cuenta, podés iniciar sesión o recuperar el acceso.';

function trail(current: number) {
  return <ol className="xp-trail" aria-label="Pasos para crear tu cuenta">
    {STOPS.map((name, index) => <li key={name} className={index < current ? 'is-done' : undefined} aria-current={index === current ? 'step' : undefined}>
      <span className="xp-trail-mark" aria-hidden="true">{index < current ? '✓' : index + 1}</span>
      <span className="xp-trail-name">{name}</span>{index < current ? <span className="xp-sr"> (completado)</span> : null}
    </li>)}
  </ol>;
}

/** Registration as three stops. Every field stays mounted so going back keeps what was typed;
 *  the request is still the single existing POST /auth/register owned by the account screen. */
export function RegisterSteps({ locked, busy, submit, message, nextAccountHref }: {
  locked: boolean; busy: boolean; submit: AccountSubmit; message?: { error: boolean; text: string };
  nextAccountHref: (target: 'sign-in' | 'register' | 'verify-email') => string;
}) {
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const moved = useRef(false);
  const sent = Boolean(message && !message.error && sentTo !== null);
  useEffect(() => {
    if (!moved.current || typeof document === 'undefined') return;
    document.getElementById(sent ? 'register-sent-title' : step === 'details' ? 'firstName' : `account-role-${role ?? 'teacher'}`)?.focus();
  }, [step, sent, role]);
  const go = (next: 'role' | 'details') => { moved.current = true; setStep(next); };
  const proceed = () => { if (!role) { setRoleError(true); return; } setRoleError(false); go('details'); };
  const send = submit('/auth/register', REGISTER_ACCEPTED);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!role) { event.preventDefault(); setRoleError(true); go('role'); return; }
    const data = Object.fromEntries(new FormData(event.currentTarget) as unknown as Iterable<[string, FormDataEntryValue]>);
    moved.current = true;
    setSentTo(typeof data.email === 'string' ? data.email.trim() : '');
    send(event);
  };

  if (sent) return <div className="xp-register-sent">
    {trail(2)}
    <span className="xp-sent-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
    <h2 id="register-sent-title" tabIndex={-1}>Revisá tu correo</h2>
    <p role="status">{message?.text}</p>
    {sentTo ? <p className="xp-sent-email">{sentTo}</p> : null}
    <ol className="xp-sent-steps">
      <li>Abrí el mensaje de FoxMind. Si no aparece, mirá en correo no deseado.</li>
      <li>Tocá el enlace dentro de la próxima hora.</li>
      <li>Después iniciá sesión para entrar a tu cuenta.</li>
    </ol>
    <p className="after-form">¿Ya verificaste tu correo? <Link href={nextAccountHref('sign-in')}>Iniciar sesión</Link></p>
  </div>;

  return <>
    {trail(step === 'role' ? 0 : 1)}
    <form noValidate onSubmit={onSubmit}><fieldset disabled={locked} className="xp-form-body">
      <div className="xp-step" data-step="role" hidden={step !== 'role'}>
        <fieldset className="xp-roles" aria-describedby="account-role-help">
          <legend>¿Cómo vas a usar FoxMind?</legend>
          {(['teacher', 'student'] as Role[]).map(key => <label key={key} className={`xp-role xp-role-${key}`}>
            <input id={`account-role-${key}`} type="radio" name="accountRole" value={key} checked={role === key} aria-label={ROLES[key].label}
              aria-describedby={`account-role-${key}-points`} onChange={() => { setRole(key); setRoleError(false); }} />
            <img src={ROLES[key].avatar} alt="" width="72" height="72" />
            <span><strong>{ROLES[key].label}</strong><span className="xp-role-points" id={`account-role-${key}-points`}>{ROLES[key].points}</span></span>
            <span className="xp-role-check" aria-hidden="true" />
          </label>)}
          <p id="account-role-help" className="xp-note">No vas a poder cambiar el rol después.</p>
        </fieldset>
        {roleError ? <p className="xp-inline-error" role="alert">Elegí si tu cuenta es docente o estudiante.</p> : null}
        <Button className="full-width xp-continue" onClick={proceed}>Continuar</Button>
      </div>
      <div className="xp-step" data-step="details" hidden={step !== 'details'}>
        <div className="xp-chosen">{role ? <img src={ROLES[role].avatar} alt="" width="40" height="40" /> : null}
          <span>{role ? ROLES[role].summary : 'Sin rol elegido'}</span>
          <Button variant="ghost" className="xp-change" onClick={() => go('role')}>Cambiar</Button></div>
        <div className="field-grid"><Field appearance="polished" name="firstName" label="Nombre" autoComplete="given-name" /><Field appearance="polished" name="lastName" label="Apellido" autoComplete="family-name" /></div>
        <Field appearance="polished" name="email" label="Correo electrónico" autoComplete="email" />
        <Field appearance="polished" name="password" label="Contraseña" password autoComplete="new-password" />
        <p className="xp-note">Después te enviamos un correo para verificar tu cuenta.</p>
        <div className="xp-step-actions">
          <Button variant="ghost" className="xp-back" onClick={() => go('role')}>Volver</Button>
          <Button type="submit">{busy ? 'Creando cuenta…' : 'Crear cuenta'}</Button>
        </div>
      </div>
    </fieldset></form>
    <p className="after-form">¿Ya tenés cuenta? <Link href={nextAccountHref('sign-in')}>Iniciar sesión</Link></p>
  </>;
}
