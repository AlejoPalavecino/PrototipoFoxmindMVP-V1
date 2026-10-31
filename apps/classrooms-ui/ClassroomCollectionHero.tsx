import { FoxmindIcon, type IconKey } from '../shared-ui/index.ts';

const benefits: { icon: IconKey; label: string }[] = [
  { icon: 'book', label: 'Accedé a tus clases' },
  { icon: 'calendar', label: 'Entregá tus actividades' },
  { icon: 'progress', label: 'Consultá tus resultados' },
  { icon: 'users', label: 'Conectá con tus docentes' },
];

export function ClassroomCollectionHero({ accountRole, busy, onJoin, onCreate }: {
  accountRole: 'teacher' | 'student'; busy: boolean; onJoin: () => void; onCreate: () => void;
}) {
  return <header className="collection-reference-hero">
    <picture aria-hidden="true">
      <img src="/foxmind-3d/classrooms-reference/hero-wide-1600.webp"
        srcSet="/foxmind-3d/classrooms-reference/hero-wide-480.webp 480w, /foxmind-3d/classrooms-reference/hero-wide-960.webp 960w, /foxmind-3d/classrooms-reference/hero-wide-1600.webp 1600w"
        sizes="(min-width: 761px) 1600px, 100vw" width="1600" height="236"
        alt="" fetchPriority="high" />
    </picture>
    <div className="collection-hero-copy">
      <span className="collection-hero-badge"><FoxmindIcon name="book" />Mis aulas</span>
      <h1>Tus clases, <span>bien organizadas.</span></h1>
      <p>Organizá tus clases y seguí aprendiendo<br className="collection-hero-break" /> en un mismo lugar.</p>
    </div>
    <div className="collection-hero-actions">
      {accountRole === 'student' ? <button type="button" disabled={busy} onClick={onJoin}><FoxmindIcon name="users" />Unirse con código</button> : null}
      {accountRole === 'teacher' ? <button type="button" className="primary" disabled={busy} onClick={onCreate}><FoxmindIcon name="plus" />Crear aula</button> : null}
    </div>
    <ul className="collection-hero-benefits">{benefits.map(item => <li key={item.icon}>
      <span><FoxmindIcon name={item.icon} /></span>{item.label}
    </li>)}</ul>
  </header>;
}
