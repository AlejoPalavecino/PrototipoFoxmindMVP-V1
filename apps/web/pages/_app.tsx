import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { captureDocumentEntry } from '../src/lib/foxy-document-boundary';
import '../../shared-ui/design-tokens.css';
import '../styles/globals.css';
import '../../classrooms-ui/styles.css';
import '../../shared-ui/folders.css';
import '../../shared-ui/foxmind-3d.css';
import '../../shared-ui/workspace.css';
if (typeof window !== 'undefined') captureDocumentEntry(window.document, window.location.pathname);
export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  useEffect(() => {
    const focusHeading = () => requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    router.events.on('routeChangeComplete', focusHeading);
    return () => router.events.off('routeChangeComplete', focusHeading);
  }, [router.events]);
  return <div className="fm3d-theme"><Component {...pageProps} /></div>;
}
