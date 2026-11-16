import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Notice } from '../../../shared-ui/feedback';
import { createWebClassroomClient } from '../application/academic-classroom-client.ts';
import { createWebAgendaClient } from '../application/agenda-client.ts';
import { AccountNavbar } from '../application/navigation/account-navbar.tsx';
import { authHref } from '../application/navigation/destinations';
import { createAccountClient, type AccountSession } from '../features/identity/index.ts';
import { Notifications } from '../features/notifications/index.ts';
import { NotificationReview, type ReviewTarget } from './notification-review.tsx';
import reviewStyles from './notification-review.module.css';

const account = createAccountClient();
type OpenReview = { target: ReviewTarget; ownerId: string; trigger?: HTMLElement };
export function NotificationsScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AccountSession>();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  const [review, setReview] = useState<OpenReview | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState('');
  const sessionRequest = useRef<AbortController | null>(null);
  const main = useRef<HTMLElement>(null);
  const reviewRef = useRef<OpenReview | null>(null);
  const restore = useRef<{ trigger?: HTMLElement } | null>(null);

  const requireAccount = useCallback((code: string) => {
    sessionRequest.current?.abort();
    reviewRef.current = null;
    restore.current = null;
    setReview(null);
    setStatus('');
    setSession(undefined);
    void router.replace(authHref(code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in', '/notificaciones'));
  }, [router]);
  const api = useMemo(() => createWebClassroomClient(fetch, requireAccount), [requireAccount]);
  const agenda = useMemo(() => createWebAgendaClient(fetch, requireAccount), [requireAccount]);

  useEffect(() => {
    if (review || !restore.current) return;
    const { trigger } = restore.current;
    restore.current = null;
    const activeFilter = main.current?.querySelector<HTMLButtonElement>('.nt-reading-filters button[aria-pressed="true"]');
    if (trigger?.isConnected && !trigger.matches(':disabled')) trigger.focus({ preventScroll: true });
    else (activeFilter ?? main.current)?.focus({ preventScroll: true });
  }, [review]);

  function closeReview(expected: OpenReview, reload = false, message?: string) {
    if (reviewRef.current !== expected) return;
    reviewRef.current = null;
    // A confirmed write or revoked access can remove the originating row on refresh.
    restore.current = reload ? {} : { trigger: expected.trigger };
    if (reload) setRefresh(value => value + 1);
    if (message) setStatus(message);
    setReview(null);
  }

  useEffect(() => {
    if (!router.isReady) return;
    const controller = new AbortController();
    sessionRequest.current = controller;
    setError('');
    void account.session(controller.signal).then(current => {
      if (controller.signal.aborted) return;
      if (!current.authenticated) { requireAccount('AUTH_REQUIRED'); return; }
      if (!current.user.emailVerified) { requireAccount('EMAIL_VERIFICATION_REQUIRED'); return; }
      setSession(current);
    }).catch(failure => {
      if (!controller.signal.aborted) setError((failure as Error).message);
    });
    return () => controller.abort();
  }, [router.isReady, requireAccount, retry]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    sessionRequest.current?.abort();
    try {
      await account.mutate('/auth/logout');
      requireAccount('AUTH_REQUIRED');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="p5-app">
    <Head><title>Notificaciones · FoxMind</title></Head>
    <a className="skip-link" href="#notifications-main">Saltar al contenido</a>
    {session?.authenticated ? <AccountNavbar session={session} view="notificaciones"
      accountActions={<button disabled={busy} onClick={() => void logout()}>Cerrar sesión</button>} /> : null}
    <main id="notifications-main" className="p5-main" ref={main} tabIndex={-1}>
      {error ? <Notice error>{error}<button onClick={() => setRetry(value => value + 1)}>Reintentar</button></Notice> : null}
      {session?.authenticated ? <>
        {status ? <div className={reviewStyles.success} role="status">{status}</div> : null}
        <Notifications key={session.user.id} api={api} refresh={refresh} presentation="center"
          role={session.user.accountRole} onNavigate={href => void router.push(href)}
          onReviewProjected={(target, trigger) => {
            const next = { target, trigger, ownerId: session.user.id };
            reviewRef.current = next;
            setStatus('');
            setReview(next);
          }}
          onSelect={id => void router.push(`/mis-aulas?notificacion=${encodeURIComponent(id)}`)} />
        {review?.ownerId === session.user.id ? <NotificationReview key={`notification-review:${session.user.id}`} target={review.target} api={api} agenda={agenda}
          onClose={reload => closeReview(review, reload)} onChanged={message => closeReview(review, true, message)} /> : null}
      </> : !error ? <Notice>Comprobando tu sesión…</Notice> : null}
    </main>
  </div>;
}
