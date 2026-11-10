import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/router';

export function ApplicationShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const focusHeading = () => requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    router.events.on('routeChangeComplete', focusHeading);
    return () => router.events.off('routeChangeComplete', focusHeading);
  }, [router.events]);
  return <div className="fm3d-theme">{children}</div>;
}
