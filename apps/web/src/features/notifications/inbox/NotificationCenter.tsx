import type { InboxNotification, NotificationKind } from '../../../../../../src/core/contracts/notifications.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { describeNotice, groupNotices, noticeTime, notificationKinds } from './notice-presentation.ts';
import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback.tsx';
import styles from './notification-center.module.css';

interface Props {
  role: 'teacher' | 'student';
  items: InboxNotification[] | null;
  unread: number;
  total: number;
  onlyUnread: boolean;
  kind: NotificationKind;
  error: string;
  status: string;
  busy: boolean;
  writing?: boolean;
  hasCounts?: boolean;
  unavailable?: boolean;
  onDismissUnavailable?(): void;
  more: boolean;
  onFilter(read: boolean, kind: NotificationKind): void;
  onReadAll(): void;
  onToggle(item: InboxNotification, trigger?: HTMLElement): void;
  onOpen(item: InboxNotification, trigger?: HTMLElement): void;
  onReload(): void;
  onMore(): void;
}
export function NotificationCenter(props: Props) {
  const { role, items, unread, total, onlyUnread, kind, error, status, busy, more,
    writing, hasCounts = items !== null, unavailable, onDismissUnavailable,
    onFilter, onReadAll, onToggle, onOpen, onReload, onMore } = props;
  const loading = !items && !error;
  return <div className={`parity-notifications ${styles.scope}`}><div className="nt-page">
    <header className="nt-intro"><div>
      <h1>Notificaciones</h1>
      <p>{role === 'teacher' ? 'Las novedades de tus aulas, a tu ritmo.' : 'Lo nuevo en tu aprendizaje, en un solo lugar.'}</p>
      <span className="nt-summary"><FoxmindIcon name={!hasCounts || unread ? 'bell' : 'check'} />
        {hasCounts ? unread ? `${unread} ${unread === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}` : 'Estás al día' : 'Tus notificaciones'}
      </span>
    </div><div className="nt-letter" aria-hidden="true">
      <span className="nt-letter-sheet"><i /><i /><i /></span><span className="nt-letter-seal"><FoxmindIcon name="bell" /></span>
      <span className="nt-letter-spark"><FoxmindIcon name="spark" /></span>
    </div></header>
    <section className="nt-inbox" aria-label="Tu bandeja de notificaciones">
      <div className="nt-toolbar"><div className="nt-reading-filters" role="group" aria-label="Estado de lectura">
        <button type="button" aria-pressed={!onlyUnread} disabled={writing} onClick={() => onFilter(false, kind)}>Todas <span>{hasCounts ? total : '—'}</span></button>
        <button type="button" aria-pressed={onlyUnread} disabled={writing} onClick={() => onFilter(true, kind)}>No leídas <span>{hasCounts ? unread : '—'}</span></button>
      </div><button type="button" className="nt-button" disabled={loading || busy || !unread} onClick={onReadAll}><FoxmindIcon name="check" />Marcar todas como leídas</button></div>
      <div className="nt-kind-filters" role="group" aria-label="Tipo de notificación">
        {(Object.entries(notificationKinds) as [NotificationKind, typeof notificationKinds[NotificationKind]][]).map(([value, { label, icon }]) =>
          <button type="button" key={value} aria-pressed={kind === value} disabled={writing} onClick={() => onFilter(onlyUnread, value)}>
            <FoxmindIcon name={icon} />{label}
          </button>)}
      </div>
      <div className={status ? 'nt-confirmation' : 'sr-only'} role="status" aria-atomic="true">
        {status ? <><FoxmindIcon name="check" />{status}</> : null}
      </div>
      {error ? <div className="nt-feedback"><Notice error>{error} <button type="button" className="nt-button" disabled={busy} onClick={onReload}>Actualizar notificaciones</button></Notice></div> : null}
      {loading ? <div className="nt-loading"><AsyncFeedback compact title="Cargando notificaciones…" detail="Estamos reuniendo las novedades para vos." /></div> : null}
      <div aria-busy={busy || loading} className="nt-list">
        {items?.length === 0 && !error && !busy ? <div className="nt-empty">
          <span><FoxmindIcon name={onlyUnread ? 'check' : 'bell'} /></span>
          <h2>{!total ? 'Las próximas novedades llegan acá' : onlyUnread ? 'Todo leído por acá' : 'No hay avisos de este tipo'}</h2>
          <p>{!total ? 'Cuando haya una novedad en tus aulas o tu agenda, vas a encontrarla en este espacio.'
            : onlyUnread ? kind !== 'all' && unread ? 'No te quedan avisos de este tipo sin leer.' : 'Podés volver a consultar los avisos cuando lo necesites.' : 'Elegí otro tipo para seguir revisando tu bandeja.'}</p>
          {total ? <button type="button" className="nt-button" onClick={() => onFilter(false, 'all')}>Ver todas las notificaciones <FoxmindIcon name="arrow-right" /></button>
            : <a className="nt-button" href="/inicio">Volver al inicio <FoxmindIcon name="arrow-right" /></a>}
        </div> : null}
        {items && groupNotices(items).map(group => <section key={group.label} className="nt-date-group" aria-label={group.label}>
          <h2>{group.label} <span>{group.items.length}</span></h2>
          {group.items.map(item => {
            const notice = describeNotice(item);
            const toggleLabel = item.readAt ? 'Marcar como no leída' : 'Marcar como leída';
            return <article key={item.id} className={`nt-row ${item.readAt ? 'read' : 'unread'}`} data-notice-id={item.id}>
              <span className={`nt-type-icon ${notice.tone}`}><FoxmindIcon name={notice.icon} /></span>
              <div className="nt-row-copy"><div className="nt-row-heading"><h3>{notice.title}</h3>
                {!item.readAt ? <span className="nt-unread-label">Sin leer</span> : null}</div>
                {notice.body ? <p>{notice.body}</p> : null}
                <div className="nt-row-meta">{notice.source ? <span>{notice.source}</span> : null}
                  <time dateTime={item.createdAt}>{noticeTime(item.createdAt, group.recent)}</time></div>
              </div>
              <div className="nt-row-actions">
                <button type="button" className="nt-button" disabled={busy}
                  aria-haspopup={item.eventType === 'AGENDA_REMINDER' || item.eventType === 'CLASSROOM_INVITATION' ? 'dialog' : undefined}
                  onClick={event => onOpen(item, event?.currentTarget)}><FoxmindIcon name="chevron-right" />{notice.action}</button>
                <button type="button" className="nt-toggle" disabled={busy} onClick={event => onToggle(item, event?.currentTarget)} aria-label={`${toggleLabel}: ${notice.title}`} title={toggleLabel}>
                  <FoxmindIcon name={item.readAt ? 'mail' : 'check'} />
                </button>
              </div>
            </article>;
          })}
        </section>)}
      </div>
      {more ? <button type="button" className="nt-button nt-load" disabled={busy} onClick={onMore}>Cargar más notificaciones</button> : null}
      <footer className="nt-inbox-note"><FoxmindIcon name="check" />Leer un aviso no confirma una entrega ni acepta una invitación.</footer>
    </section>
    {unavailable && onDismissUnavailable ? <Dialog captureEscape title="Este contenido ya no está disponible" onClose={onDismissUnavailable} className="nt-unavailable">
      <Notice error>Puede haberse retirado o puede que ya no tengas acceso. Podés seguir revisando tus otras notificaciones.</Notice>
      <footer className="p5-form-footer"><button type="button" className="primary" onClick={onDismissUnavailable}>Volver a notificaciones</button></footer>
    </Dialog> : null}
  </div></div>;
}
