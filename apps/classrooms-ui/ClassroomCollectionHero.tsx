import { FoxmindIcon } from '../shared-ui/index.ts';

export function ClassroomCollectionHero({ accountRole, busy, onJoin, onCreate }: {
  accountRole: 'teacher' | 'student'; busy: boolean; onJoin: () => void; onCreate: () => void;
}) {
  return <><nav className="brujula-catalog-crumb" aria-label="Ruta de navegación"><a href="/inicio">Inicio</a><FoxmindIcon name="chevron-right" /><span aria-current="page">Mis aulas</span></nav><header className="brujula-catalog-heading">
    <div className="brujula-heading-copy">
      <span className="eyebrow">Mi espacio</span>
      <h1>Mis aulas</h1>
      <p>{accountRole === 'teacher' ? 'Organizá los recorridos de enseñanza de tus grupos.' : 'Elegí un aula para continuar con tus actividades.'}</p>
    </div>
    <div className="brujula-heading-actions">
      {accountRole === 'student' ? <button type="button" className="primary" disabled={busy} onClick={onJoin}><FoxmindIcon name="plus" />Unirme con código</button> : null}
      {accountRole === 'teacher' ? <button type="button" className="primary" disabled={busy} onClick={onCreate}><FoxmindIcon name="plus" />Crear aula</button> : null}
    </div>
  </header></>;
}
