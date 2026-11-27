import { AsyncFeedback } from '../../../shared-ui/AsyncFeedback';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useEffectEvent, useState } from 'react';
import { AccountNavbar } from '../application/navigation/account-navbar.tsx';
import { createAccountClient, type AccountSession } from '../features/identity/index.ts';
import { authHref } from '../application/navigation/destinations';
import { StudyError } from '../features/study/api.ts';
import { Notice } from '../../../shared-ui/feedback';
import { useStudyFolders, StudyCollectionView, StudyWizard } from '../features/study/index.ts';
import { StudyWorkspace } from '../features/study/index.ts';
import { studySurface as s } from '../features/study/index.ts';
export function StudyScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AccountSession>();
  const [wizard, setWizard] = useState(false);
  const [entryClassroomId, setEntryClassroomId] = useState<string>();
  const [collectionStatus, setCollectionStatus] = useState('ACTIVE');
  const [retry, setRetry] = useState(0);
  const id = typeof router.query.id === 'string' ? router.query.id : undefined;
  function onAccessError(error: unknown) {
    if (
      error instanceof StudyError &&
      (error.status === 401 || error.code === 'EMAIL_VERIFICATION_REQUIRED')
    )
      void router.replace(
        authHref(
          error.code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in',
          router.asPath,
        ),
      );
  }
  const folders = useStudyFolders({ folderId: id, onAccessError });
  const { collection, detail, error, busy, setError, run } = folders;
  useEffect(() => {
    if (!router.isReady || id || !collection || router.query.crear !== '1') return;
    const classroom = collection.classrooms.find(room => room.id === router.query.aula);
    if (classroom) {
      setEntryClassroomId(classroom.id);
      setWizard(true);
    }
    void router.replace('/carpetas-de-estudio', undefined, { shallow: true });
  }, [router, id, collection]);
  const openFolders = useEffectEvent((isActive: () => boolean) => {
    setError('');
    void (async () => {
      try {
        const current = await createAccountClient().session();
        if (!isActive()) return;
        if (!current.authenticated) {
          void router.replace(authHref('sign-in', router.asPath));
          return;
        }
        if (!current.user.emailVerified) {
          void router.replace(authHref('verify-email', router.asPath));
          return;
        }
        if (current.user.accountRole !== 'student') {
          setError('Las carpetas de estudio son exclusivas de estudiantes.');
          return;
        }
        setSession(current);
        const value = await folders.load(id, isActive);
        if (isActive()) setWizard(value?.folder.status === 'DRAFT');
      } catch (e) {
        if (isActive()) {
          if (
            e instanceof StudyError &&
            (e.status === 401 || e.code === 'EMAIL_VERIFICATION_REQUIRED')
          ) {
            void router.replace(
              authHref(
                e.code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in',
                router.asPath,
              ),
            );
            return;
          }
          setError(e instanceof Error ? e.message : 'No pudimos abrir tus carpetas.');
        }
      }
    })();
  });
  useEffect(() => {
    if (!router.isReady) return;
    let active = true;
    openFolders(() => active);
    return () => {
      active = false;
    };
  }, [router.isReady, id, retry]);
  return (
    <div className="p5-app">
      <Head>
        <title>Carpetas de estudio · FoxMind</title>
      </Head>
      <a className="skip-link" href="#study-main">
        Saltar al contenido
      </a>
      {session?.authenticated && <AccountNavbar session={session} view="carpetas-de-estudio" />}
      <main className={`p5-main ${s.root}`} id="study-main">
        {error && (
          <Notice error>
            {error}
            <button onClick={() => setRetry((v) => v + 1)}>Actualizar carpeta</button>
          </Notice>
        )}
        {!session?.authenticated || !collection ? (
          error ? (
            <Notice>No se pudo abrir el espacio de estudio.</Notice>
          ) : (
            <AsyncFeedback title="Abriendo tus carpetas…" />
          )
        ) : (
          <>
            {wizard && (
              <StudyWizard
                key={id ?? 'new-folder'}
                catalog={collection}
                initialClassroomId={id ? undefined : entryClassroomId}
                folder={
                  id && detail?.folder.id === id && detail.folder.status === 'DRAFT'
                    ? detail.folder
                    : undefined
                }
                onSaved={() => {
                  setWizard(false);
                  setCollectionStatus('DRAFT');
                  if (id) void router.push('/carpetas-de-estudio');
                  setRetry((value) => value + 1);
                }}
                onClose={() => {
                  setWizard(false);
                  if (id) void router.push('/carpetas-de-estudio');
                  else setRetry((value) => value + 1);
                }}
                onCreated={() => {
                  setWizard(false);
                  setCollectionStatus('ACTIVE');
                  if (id) void router.push('/carpetas-de-estudio');
                  setRetry((v) => v + 1);
                }}
              />
            )}
            {!id ? (
              <StudyCollectionView
                status={collectionStatus}
                onStatusChange={setCollectionStatus}
                catalog={collection}
                onCreate={() => {
                  setEntryClassroomId(undefined);
                  setWizard(true);
                }}
                onEnter={(folderId) => void router.push(`/carpetas-de-estudio/${folderId}`)}
              />
            ) : !wizard ? (
              detail?.folder.id === id ? (
                <StudyWorkspace
                  selectedConversationId={
                    typeof router.query.chat === 'string' ? router.query.chat : undefined
                  }
                  onConversationSelect={(chat) => {
                    void router.replace(
                      { pathname: router.pathname, query: { ...router.query, chat } },
                      undefined,
                      { shallow: true, scroll: false },
                    );
                  }}
                  examId={
                    router.query.tab === 'repaso' && typeof router.query.exam === 'string'
                      ? router.query.exam
                      : undefined
                  }
                  cancelGeneration={folders.cancelGeneration}
                  identity={{
                    avatarKey: session.user.avatarKey,
                    initials: (session.user.firstName[0] ?? '') + (session.user.lastName[0] ?? ''),
                  }}
                  key={detail.folder.id}
                  detail={detail}
                  catalog={collection}
                  busy={busy}
                  run={run}
                  onReload={folders.reload}
                />
              ) : (
                <AsyncFeedback title="Cargando carpeta…" />
              )
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
