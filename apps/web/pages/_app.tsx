import type { AppProps } from 'next/app';
import { ApplicationShell } from '../src/application/application-shell.tsx';
import { captureDocumentEntry } from '../src/application/foxy-document-boundary';
import '../../shared-ui/design-tokens.css';
import '../styles/globals.css';
import "../src/application/styles/academic.css";
import '../../shared-ui/folders.css';
import '../../shared-ui/foxmind-3d.css';
import '../../shared-ui/workspace.css';
if (typeof window !== 'undefined') captureDocumentEntry(window.document, window.location.pathname);
export default function App({ Component, pageProps }: AppProps) {
  return <ApplicationShell><Component {...pageProps} /></ApplicationShell>;
}
