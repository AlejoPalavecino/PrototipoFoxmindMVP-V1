import type { AppProps } from 'next/app';
import '../../shared-ui/design-tokens.css';
import '../styles/globals.css';
import '../../classrooms-ui/styles.css';
import '../../shared-ui/platform-glass.css';
import '../../shared-ui/entry-glass.css';
export default function App({ Component, pageProps }: AppProps) { return <Component {...pageProps} />; }
