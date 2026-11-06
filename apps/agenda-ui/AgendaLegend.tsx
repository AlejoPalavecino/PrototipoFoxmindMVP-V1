import { FoxmindIcon } from '../shared-ui/index.ts';

export function AgendaLegend() {
  return <div className="agenda-legend" aria-label="Referencias del calendario">
    <span><FoxmindIcon name="lock" />Tus eventos personales solo son visibles para vos.</span>
  </div>;
}
