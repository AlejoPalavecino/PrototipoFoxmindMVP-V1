import type { AppProps } from 'next/app';
import { ApplicationShell } from '../src/application/shell/ApplicationShell.tsx';
import { captureDocumentEntry } from '../src/application/navigation/foxy-document-boundary';
import '../src/application/shell/styles/product.css';
if (typeof window !== 'undefined') captureDocumentEntry(window.document, window.location.pathname);
export default function App({ Component, pageProps }: AppProps) {
  return <ApplicationShell><Component {...pageProps} /></ApplicationShell>;
}
