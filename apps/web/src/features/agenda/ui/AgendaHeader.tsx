import { FoxmindIcon } from '../../../../../shared-ui/index.ts';

export function AgendaHeader({ onCreate, role = 'student' }: { onCreate: () => void; role?: 'teacher' | 'student' }) {
  return <header className="agenda-header agenda-heading">
    <div className="agenda-heading-copy">
      <div className="agenda-heading-icon" aria-hidden="true"><FoxmindIcon name="calendar" /></div>
      <div><h1>Mi agenda</h1>
        <p>{role === 'teacher' ? 'Tus clases, tus ideas y un momento para vos.' : 'Un lugar para tus clases, repasos y pausas.'}</p>
      </div>
    </div>
    <button type="button" className="primary" onClick={onCreate}><FoxmindIcon name="plus" />Crear evento</button>
  </header>;
}
