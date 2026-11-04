import { FoxmindIcon } from '../shared-ui/index.ts';

export function ClassroomCollectionHero({ accountRole, busy, onJoin, onCreate }: {
  accountRole: 'teacher' | 'student'; busy: boolean; onJoin: () => void; onCreate: () => void;
}) {
  return <header className="collection-reference-hero">
    <picture aria-hidden="true">
      <img src="/foxmind-3d/classrooms-reference/hero-consistent-1600.webp"
        srcSet="/foxmind-3d/classrooms-reference/hero-consistent-480.webp 480w, /foxmind-3d/classrooms-reference/hero-consistent-960.webp 960w, /foxmind-3d/classrooms-reference/hero-consistent-1600.webp 1600w"
        sizes="(min-width: 761px) 1600px, 100vw" width="1600" height="236"
        alt="" fetchPriority="high" />
    </picture>
    <div className="collection-hero-copy">
      <span className="collection-hero-badge"><FoxmindIcon name="book" />Mis aulas</span>
      <h1>Tus clases, <span>bien organizadas.</span></h1>
      <p>Organizá tus clases y seguí aprendiendo, en un solo lugar.</p>
    </div>
    <div className="collection-hero-actions">
      {accountRole === 'student' ? <button type="button" disabled={busy} onClick={onJoin}><FoxmindIcon name="users" />Unirse con código</button> : null}
      {accountRole === 'teacher' ? <button type="button" className="primary" disabled={busy} onClick={onCreate}><FoxmindIcon name="plus" />Crear aula</button> : null}
    </div>
  </header>;
}
