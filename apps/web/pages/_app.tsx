import type { AppProps } from 'next/app';
import { ApplicationShell } from '../src/application/application-shell.tsx';
import { captureDocumentEntry } from '../src/application/foxy-document-boundary';
import '../../shared-ui/design-tokens.css';
import '../styles/globals.css';
import "../src/application/styles/academic.css";
import '../../shared-ui/folders.css';
import '../../shared-ui/foxmind-3d.css';
import '../../shared-ui/workspace.css';
import '../../shared-ui/parity-foundation.css';
import '../../shared-ui/parity-home.css';
import '../../shared-ui/parity-classrooms.css';
import '../../shared-ui/parity-catalog-fidelity.css';
import '../../shared-ui/parity-classroom-fidelity.css';
import '../../shared-ui/parity-classroom-interior-exact.css';
import '../../shared-ui/parity-classroom-people-wall-exact.css';
import '../../shared-ui/parity-classroom-progress-exact.css';
import '../../shared-ui/parity-agenda-account-fidelity.css';
import '../../shared-ui/parity-ai-fidelity.css';
import '../../shared-ui/parity-classroom-collection.css';
import '../../shared-ui/parity-wizard.css';
import '../../shared-ui/parity-study-exact.css';
if (typeof window !== 'undefined') captureDocumentEntry(window.document, window.location.pathname);
export default function App({ Component, pageProps }: AppProps) {
  return <ApplicationShell><Component {...pageProps} /></ApplicationShell>;
}
