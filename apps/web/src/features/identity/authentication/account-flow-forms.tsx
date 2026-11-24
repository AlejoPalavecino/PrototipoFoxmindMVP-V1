import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AccountSession, AccountUser } from '../api/account-client';
import type { AccountView } from '../model/account-view';
import type { AccountSubmit } from '../model/form-types';
import { AccountField as Field } from '../controls/account-field';
import { Button } from '../../../../../shared-ui/primitives/button';
import { VerificationGuidance } from '../../../../../shared-ui/VerificationGuidance';
import { FoxmindIcon } from '../../../../../shared-ui/index';
import { RegisterSteps } from './register-steps';

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
          {user ? <div className="notice">Ya tenés una sesión abierta. <Link href={verified ? classroomNext ?? '/inicio' : nextAccountHref('verify-email')}>Continuar con mi cuenta</Link></div> : null}
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

function Register({view, session, locked, busy, submit, message, nextAccountHref}: FlowProps) {
  return session && view === 'register' ? <RegisterSteps locked={locked} busy={busy} submit={submit} message={message} nextAccountHref={nextAccountHref} /> : null;
}

function Verification({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'verify-email' ? <div className="verification-content">
          {hasToken ? <><h2>Confirmá tu dirección</h2><p>Al continuar se usa el enlace que abriste desde tu correo. El enlace vence después de una hora.</p>
            <form noValidate onSubmit={submit('/auth/email-verification/confirm', 'Tu correo está verificado. Ya podés continuar con tu cuenta.')}><Button disabled={locked} type="submit">{busy ? 'Verificando…' : 'Confirmar verificación'}</Button></form></> : null}
          {user && !verified ? <><h2>Revisá tu correo</h2><p>Enviamos el enlace a <strong className="email-value">{user.email}</strong>. Abrí el mensaje y confirmá la verificación.</p><p>Si recargás esta página después de abrir un enlace, volvé a abrir el mensaje original para usarlo.</p>
            <div className="actions"><Button disabled={locked} onClick={() => void action('/auth/email-verification/resend', {}, 'Solicitud aceptada. Revisá tu correo y usá el enlace más reciente.')}>{busy ? 'Enviando…' : 'Reenviar correo'}</Button><Button variant="outline" disabled={locked} onClick={() => void load()}>Actualizar estado</Button>{signOut}</div></> : null}
          {verified ? <><h2>Tu correo está verificado</h2><Link className="button button-primary" href={classroomNext ?? '/inicio'}>{classroomNext === '/settings' ? 'Ir a Configuración' : classroomNext === '/agenda' ? 'Ir a Agenda' : classroomNext && classroomNext !== '/inicio' ? 'Ir a Mis Aulas' : 'Ir a Inicio'}</Link><div className="actions">{signOut}</div></> : null}
          {!user ? <><VerificationGuidance confirmed={Boolean(message && !message.error && !hasToken)} /><div className="actions"><Link className="button button-primary" href={nextAccountHref('sign-in')}>Iniciar sesión</Link><Link href={nextAccountHref('register')}>Crear cuenta</Link></div></> : null}
        </div> : null}
  </>;
}

function Forgot({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'forgot-password' ? <>
          <form noValidate onSubmit={submit('/auth/password-recovery/request', 'Si existe una cuenta con ese correo, vas a recibir un enlace para recuperar el acceso. Revisá también la carpeta de correo no deseado.')}><fieldset disabled={locked}>
            <Field appearance="polished" name="email" label="Correo electrónico" autoComplete="email" />
            <Button type="submit" className="full-width">{busy ? 'Solicitando enlace…' : 'Enviar enlace de recuperación'}</Button>
          </fieldset></form><p className="after-form"><Link href="/sign-in">Volver a iniciar sesión</Link></p>
        </> : null}
  </>;
}

function Recover({view, session, user, verified, classroomNext, nextAccountHref, locked, busy, hasToken, submit, message, signOut, load, action}: FlowProps) {
  return <>
{session && view === 'recover-password' ? <>
          {hasToken ? <form noValidate onSubmit={submit('/auth/password-recovery/confirm', 'Contraseña actualizada. Las sesiones anteriores se cerraron. Iniciá sesión con tu nueva contraseña.')}><fieldset disabled={locked}>
            <Field appearance="polished" name="newPassword" label="Nueva contraseña" password autoComplete="new-password" />
            <Field appearance="polished" name="confirmPassword" label="Repetir contraseña" password autoComplete="new-password" />
            <Button type="submit" className="full-width">{busy ? 'Actualizando contraseña…' : 'Confirmar nueva contraseña'}</Button>
          </fieldset></form> : <p>Para establecer tu contraseña, abrí el enlace original del correo. Si ya lo usaste, iniciá sesión; si venció, pedí uno nuevo.</p>}
          <div className="actions"><Link href="/sign-in">Iniciar sesión</Link><Link href="/forgot-password">Solicitar otro enlace</Link></div>
        </> : null}
  </>;
}
