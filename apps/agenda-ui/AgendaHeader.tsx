import { FoxmindIcon } from '../shared-ui/index.ts';

export function AgendaHeader({ onCreate }: { onCreate: () => void }) {
  return <header className="p5-page-head agenda-header agenda-banner">
    <img className="agenda-banner-art" src="/foxmind-3d/agenda-reference/agenda-banner-1600.webp"
      srcSet="/foxmind-3d/agenda-reference/agenda-banner-800.webp 800w, /foxmind-3d/agenda-reference/agenda-banner-1600.webp 1600w"
      sizes="(max-width: 1100px) calc(100vw - 32px), calc(100vw - 280px)"
      width={1600} height={533} alt="" aria-hidden="true" fetchPriority="high" />
    <div className="agenda-banner-copy"><h1>Mi <span>agenda</span></h1>
      <p className="p5-lead">Tus entregas y eventos, día por día.</p></div>
    <div className="agenda-tools"><button type="button" className="primary" onClick={onCreate}><FoxmindIcon name="plus" />Nuevo evento</button></div>
  </header>;
}
