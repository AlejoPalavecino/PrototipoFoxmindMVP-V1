import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PrivateFilePanel } from '../src/components/private-file-panel';
import { parseFileContext } from '../src/lib/file-client';

export { accountPageProps as getServerSideProps } from '../src/lib/page-server';
export default function Files() {
  const router = useRouter();
  const context = parseFileContext(router.query);
  return <>
    <Head><title>Archivos privados | FoxMind</title><meta name="referrer" content="no-referrer" /></Head>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header className="topbar"><Link href="/profile" className="wordmark" aria-label="FoxMind"><span>Fox</span>Mind</Link><Link href="/profile">Mi perfil</Link></header>
    <main id="main" className="main profile-main">
      <div className="page-heading"><div><h1>Archivos privados</h1><p>Plan y materiales del contexto actual.</p></div></div>
      <section className="surface">{context ? <PrivateFilePanel key={`${context.kind}:${context.id}:${context.purpose}`} context={context} /> : <p>Abre los archivos desde un borrador o aula existente con su contexto completo.</p>}</section>
      <footer className="page-footer">FoxMind · Enseñar y aprender, en un mismo lugar.</footer>
    </main>
  </>;
}
