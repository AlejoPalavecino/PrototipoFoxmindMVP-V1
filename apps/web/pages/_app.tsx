import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../../shared-ui/design-tokens.css';
import '../styles/globals.css';
import '../../classrooms-ui/styles.css';
import '../../shared-ui/folders.css';
import '../../agenda-ui/agenda.css';
import '../../shared-ui/foxmind-3d.css';
import '../../classrooms-ui/foxmind-classrooms.css';
import '../../classrooms-ui/foxmind-home.css';
import '../../agenda-ui/foxmind-agenda.css';
import '../../shared-ui/auth-polish.css';
import '../../shared-ui/auth-responsive.css';
import '../../shared-ui/workspace.css';
import '../../shared-ui/auth-reference.css';
import '../../shared-ui/classrooms-reference.css';
import '../../shared-ui/wizard-reference.css';
import '../../classrooms-ui/interior-shell-reference.css';
import '../../classrooms-ui/interior-plan-reference.css';
import '../../classrooms-ui/interior-library-fidelity.css';
import '../../classrooms-ui/interior-progress-reference.css';
import '../../classrooms-ui/interior-activity-reference.css';
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
