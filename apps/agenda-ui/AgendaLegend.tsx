import { FoxmindIcon } from '../shared-ui/index.ts';

export function AgendaLegend() {
  return <div className="agenda-legend" aria-label="Referencias del calendario">
    <span><FoxmindIcon name="calendar" /><i className="agenda-legend-personal" aria-hidden="true" />Evento personal · Solo vos</span>
    <span><FoxmindIcon name="file" /><i className="agenda-legend-deadline" aria-hidden="true" />Entrega del aula</span>
  </div>;
}
