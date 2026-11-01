type Options = { window: Pick<Window, 'location' | 'addEventListener' | 'removeEventListener'>;
  shouldBlock: () => boolean; hidePresentation: () => void; onError?: () => void };
const safePath = (href: string) => typeof href === 'string' && /^\/(?!\/)/u.test(href) && !/[\\\u0000-\u001f\u007f-\u009f]/u.test(href);
export function createFoxyNavigationBridge(options: Options) {
  let installed = false, disposed = false, restored = false;
  function visit(href: string, replace: boolean) {
    if (disposed) return;
    if (!safePath(href)) { options.onError?.(); return; }
    try { if (replace) options.window.location.replace(href); else options.window.location.assign(href); }
    catch { options.onError?.(); }
  }
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!disposed && options.shouldBlock()) { event.preventDefault(); event.returnValue = ''; }
  };
  const pageHide = () => { if (!disposed) options.hidePresentation(); };
  const pageShow = (event: PageTransitionEvent) => {
    if (!disposed && event.persisted && !restored) { restored = true; visit('/foxy-ai', true); }
  };
  return {
    install() {
      if (disposed || installed) return; installed = true;
      options.window.addEventListener('beforeunload', beforeUnload);
      options.window.addEventListener('pagehide', pageHide);
      options.window.addEventListener('pageshow', pageShow);
    },
    navigate(href: string) { visit(href, false); },
    replace(href: string) { visit(href, true); },
    dispose() {
      if (disposed) return; disposed = true;
      if (installed) {
        options.window.removeEventListener('beforeunload', beforeUnload);
        options.window.removeEventListener('pagehide', pageHide);
        options.window.removeEventListener('pageshow', pageShow);
      }
    },
  };
}
