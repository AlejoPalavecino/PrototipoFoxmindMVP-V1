import { useState } from 'react';
import { zoneChoices, zoneLabel } from './event-zones.ts';

export function AgendaHeader({ zone, onZone, onCreate }: {
  zone: string; onZone: (value: string) => void; onCreate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return <header className="p5-page-head agenda-header"><div><p className="agenda-eyebrow">TU TIEMPO, EN ORDEN</p><h1>Mi <span>Agenda</span></h1>
    <p className="p5-lead">Tus eventos y entregas, en un solo lugar.</p></div>
    <div className="agenda-tools"><div className="p5-actions"><button className="primary" onClick={onCreate}>+ Nuevo evento</button></div>
      <div className="agenda-zone-control"><p>{zoneLabel(zone)} <button type="button" aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}>Cambiar</button></p>
        {expanded ? <label>Ciudad del calendario<select value={zone} onChange={event => onZone(event.target.value)}>
          {zoneChoices(zone).map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select></label> : null}</div>
    </div></header>;
}
