import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AccountSession, AccountUser } from '../api/account-client';
import type { AccountView } from '../model/account-view';
import type { AccountSubmit } from '../model/form-types';
import { AccountField as Field } from './account-field';
import { Button } from '../../../../../shared-ui/primitives/button';
import { VerificationGuidance } from '../../../../../shared-ui/VerificationGuidance';
import { FoxmindIcon } from '../../../../../shared-ui/index';
import { EntryIcon } from '../../../../../shared-ui/EntryIcon';
import { BrujulaIcon } from '../../../../../shared-ui/BrujulaIcon';
import surface from './account-surface.module.css';

interface FlowProps {
  view: AccountView; session?: AccountSession; user?: AccountUser; verified: boolean; classroomNext: string | null;
  nextAccountHref: (target: 'sign-in' | 'register' | 'verify-email') => string;
  locked: boolean; busy: boolean; hasToken: boolean; submit: AccountSubmit;
  message?: { error: boolean; text: string }; signOut: ReactNode; load: () => Promise<void>;
  action: (path: string, fields: Record<string, string>, success: string, method?: string) => Promise<void>;
}
export function AccountFlowForms(props: FlowProps) {
  return <><Login {...props} /><Register {...props} /><Verification {...props} /><Forgot {...props} /><Recover {...props} /></>;
}

function Login({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'sign-in' ? <>
          {user ? <div className="notice">Ya tienes una sesión abierta. <Link href={verified ? classroomNext ?? '/inicio' : nextAccountHref('verify-email')}>Continuar con mi cuenta</Link></div> : null}
          <form noValidate onSubmit={submit('/auth/login', 'Sesión iniciada.')}><fieldset disabled={locked}>
            <Field appearance="polished" name="email" label="Correo electrónico" autoComplete="username" />
            <Field appearance="polished" name="password" label="Contraseña" password autoComplete="current-password" />
            <div className="form-link"><Link href="/forgot-password">Olvidé mi contraseña</Link></div>
            <Button type="submit" className="full-width">{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}<FoxmindIcon name="arrow-right" /></Button>
          </fieldset></form>
          <p className="after-form">¿Todavía no tenés cuenta? <Link href={nextAccountHref('register')}>Crear cuenta</Link></p>
        </> : null}
  </>;
}

function Register({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'register' ? <>
          <form noValidate onSubmit={submit('/auth/register', 'Si los datos son válidos para crear una cuenta, recibirás un correo de verificación. Revisa también la carpeta de correo no deseado. Si ya tienes cuenta, puedes iniciar sesión o recuperar el acceso.')}><fieldset disabled={locked}>
            <fieldset className={surface.roleChoice} aria-describedby="account-role-help">
              <legend>Rol de la cuenta</legend>
              <div className={surface.roleOptions}>
                <label>
                  <input type="radio" name="accountRole" value="teacher" aria-label="Docente" aria-describedby="account-role-teacher" required />
                  <BrujulaIcon name="school" />
                  <span><strong>Docente</strong><small id="account-role-teacher">Creá aulas</small></span>
                </label>
                <label>
                  <input type="radio" name="accountRole" value="student" aria-label="Estudiante" aria-describedby="account-role-student" required />
                  <BrujulaIcon name="graduation-cap" />
                  <span><strong>Alumno</strong><small id="account-role-student">Unite a aulas</small></span>
                </label>
              </div>
              <p id="account-role-help">Elegí el rol de tu cuenta. Esta elección es permanente.</p>
            </fieldset>
            <div className="field-grid"><Field appearance="polished" name="firstName" label="Nombre" autoComplete="given-name" /><Field appearance="polished" name="lastName" label="Apellido" autoComplete="family-name" /></div>
            <Field appearance="polished" name="email" label="Correo electrónico" autoComplete="email" />
            <Field appearance="polished" name="password" label="Contraseña" password autoComplete="new-password" />
            <Button type="submit" className="full-width">{busy ? 'Creando cuenta…' : 'Crear cuenta'}<FoxmindIcon name="arrow-right" /></Button>
          </fieldset></form>
          <p className="field-help registration-next"><EntryIcon name="envelope" />Después te enviaremos un correo para verificar tu cuenta.</p>
          <p className="after-form">¿Ya tenés cuenta? <Link href={nextAccountHref('sign-in')}>Iniciar sesión</Link></p>
        </> : null}
  </>;
}

function Verification({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'verify-email' ? <div className="verification-content">
          {hasToken ? <><h2>Confirma tu dirección</h2><p>Al continuar se utilizará el enlace que abriste desde tu correo. El enlace vence después de una hora.</p>
            <form noValidate onSubmit={submit('/auth/email-verification/confirm', 'Tu correo está verificado. Ya puedes continuar con tu cuenta.')}><Button disabled={locked} type="submit">{busy ? 'Verificando…' : 'Confirmar verificación'}</Button></form></> : null}
          {user && !verified ? <><h2>Revisa tu correo</h2><p>Enviamos el enlace a <strong className="email-value">{user.email}</strong>. Abre el mensaje y confirma la verificación.</p><p>Si recargas esta página después de abrir un enlace, vuelve a abrir el mensaje original para usarlo.</p>
            <div className="actions"><Button disabled={locked} onClick={() => void action('/auth/email-verification/resend', {}, 'Solicitud aceptada. Revisa tu correo; usa el enlace más reciente.')}>{busy ? 'Enviando…' : 'Reenviar correo'}</Button><Button variant="outline" disabled={locked} onClick={() => void load()}>Actualizar estado</Button>{signOut}</div></> : null}
          {verified ? <><h2>Tu correo está verificado</h2><Link className="button button-primary" href={classroomNext ?? '/inicio'}>{classroomNext === '/settings' ? 'Ir a Configuración' : classroomNext === '/agenda' ? 'Ir a Agenda' : classroomNext && classroomNext !== '/inicio' ? 'Ir a Mis Aulas' : 'Ir a Inicio'}</Link><div className="actions">{signOut}</div></> : null}
          {!user ? <><VerificationGuidance confirmed={Boolean(message && !message.error && !hasToken)} /><div className="actions"><Link className="button button-primary" href={nextAccountHref('sign-in')}>Iniciar sesión</Link><Link href={nextAccountHref('register')}>Crear cuenta</Link></div></> : null}
        </div> : null}
  </>;
}

function Forgot({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'forgot-password' ? <>
          <form noValidate onSubmit={submit('/auth/password-recovery/request', 'Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también la carpeta de correo no deseado.')}><fieldset disabled={locked}>
            <Field appearance="polished" name="email" label="Correo electrónico" autoComplete="email" />
            <Button type="submit" className="full-width">{busy ? 'Solicitando enlace…' : 'Enviar enlace de recuperación'}</Button>
          </fieldset></form><p className="after-form"><Link href="/sign-in">Volver a iniciar sesión</Link></p>
        </> : null}
  </>;
}

function Recover({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'recover-password' ? <>
          {hasToken ? <form noValidate onSubmit={submit('/auth/password-recovery/confirm', 'Contraseña actualizada. Las sesiones anteriores se cerraron. Inicia sesión con tu nueva contraseña.')}><fieldset disabled={locked}>
            <Field appearance="polished" name="newPassword" label="Nueva contraseña" password autoComplete="new-password" />
            <Field appearance="polished" name="confirmPassword" label="Repetir contraseña" password autoComplete="new-password" />
            <Button type="submit" className="full-width">{busy ? 'Actualizando contraseña…' : 'Confirmar nueva contraseña'}</Button>
          </fieldset></form> : <p>Para establecer tu contraseña, abre el enlace original del correo. Si ya lo utilizaste, inicia sesión; si venció, solicita uno nuevo.</p>}
          <div className="actions"><Link href="/sign-in">Iniciar sesión</Link><Link href="/forgot-password">Solicitar otro enlace</Link></div>
        </> : null}
  </>;
}
