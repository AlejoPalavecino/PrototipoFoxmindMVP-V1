import type { HomeResponse } from '../../src/core/domain/index.ts';
import { FoxmindIcon, type IconKey } from '../shared-ui/index.ts';
import { homeActivityStats, type HomeActivityStat } from './home-presentation.ts';

const statIcons: Record<HomeActivityStat['key'], IconKey> = {
  study: 'book', teach: 'users', pending: 'clock', feedback: 'check', review: 'clipboard',
};

export function HomeActivitySummary({ data }: { data: HomeResponse }) {
  const stats = homeActivityStats(data);
  const unavailable = (['pending', 'feedback', 'review'] as const).some(name => data.modules[name].status === 'error');
  return <section className="fm-home-activity-summary" aria-label="Tu actividad">
    <header><FoxmindIcon name="progress" /><h2>Tu actividad</h2></header>
    {stats.length ? <dl>{stats.map(stat => <div key={stat.key} className={`fm-home-stat fm-home-stat--${stat.key}`}>
      <span className="fm-home-stat-icon"><FoxmindIcon name={statIcons[stat.key]} /></span>
      <dt>{stat.label}</dt><dd>{stat.value}</dd>
    </div>)}</dl> : <p>Tu actividad aparecerá aquí.</p>}
    {unavailable ? <p className="fm-home-summary-unavailable">Parte del resumen no está disponible. Puedes reintentar en la sección correspondiente.</p> : null}
  </section>;
}
