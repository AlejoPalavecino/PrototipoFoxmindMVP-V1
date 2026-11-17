import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { activityDate } from '../../../../../shared-ui/academic-date.ts';
import styles from '../ui/Participation.module.css';

export type ReceiptData = { submittedAt: string | null; submittedLate: boolean | null; appliedDeadlineAt: string | null };

export function AttemptReceipt({ delivery, title, zone, number, content, children }: {
  delivery: ReceiptData; title: string | null; zone: string; number: number; content: string; children?: React.ReactNode;
}) {
  return <section className={styles.receipt} aria-label="Comprobante de entrega">
    <header><span className={styles.receiptIcon}><FoxmindIcon name="check"/></span><div>
      <p>Entrega confirmada</p><h3 tabIndex={-1} aria-label="Comprobante de entrega">Listo, tu trabajo llegó.</h3>
      <p>Podés cerrar esta pantalla. Tu entrega quedó confirmada.</p>
    </div></header>
<section className="parity-receipt-card"><h2>{title ?? 'Actividad'}</h2><dl>
      <div><dt>Recibida</dt><dd>{delivery.submittedAt ? <time dateTime={delivery.submittedAt}>
        {new Date(delivery.submittedAt).toLocaleString('es-AR', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' })}
      </time> : 'No disponible'}</dd></div>
      <div><dt>Contenido</dt><dd>{content}</dd></div>
      <div><dt>Intento {number}</dt><dd>{delivery.submittedLate === null ? 'Solo consulta' : delivery.submittedLate ? 'Fuera de plazo · Solo consulta' : 'A tiempo · Solo consulta'}</dd></div>
    </dl>
    {delivery.appliedDeadlineAt ? <small>Plazo aplicado · {activityDate(delivery.appliedDeadlineAt, zone)}</small> : null}
    <div className="parity-receipt-next"><FoxmindIcon name="clock"/><div><b>Ahora sigue la mirada de tu docente</b><p>La recepción ya está confirmada; la calificación se publica después.</p></div></div></section>
    {children}
  </section>;
}
