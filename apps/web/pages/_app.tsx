import type { AppProps } from 'next/app';
import '../styles/globals.css';
import '../../classrooms-ui/styles.css';
import '../../shared-ui/entry-glass.css';
export default function App({ Component, pageProps }: AppProps) { return <Component {...pageProps} />; }
