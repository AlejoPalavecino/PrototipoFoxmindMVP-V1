import { FoxmindIcon } from '../../../../../shared-ui/index.ts';

export function AgendaHeader({ onCreate }: { onCreate: () => void }) {
  return <><nav className="agenda-location" aria-label="Ubicación"><a href="/inicio">Inicio</a><FoxmindIcon name="chevron-right" /><span aria-current="page">Agenda</span></nav>
    <header className="agenda-header brujula-agenda-heading">
    <div><span className="agenda-eyebrow">Espacio personal</span><h1>Agenda</h1>
      <p>Tus clases, momentos de estudio y próximas entregas.</p></div>
    <button type="button" className="primary" onClick={onCreate}><FoxmindIcon name="plus" />Crear evento</button>
  </header></>;
}
