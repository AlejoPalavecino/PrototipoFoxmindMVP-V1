'use client';
import { useEffect, useState } from 'react';
import type { AssignmentReceipt, ClassroomClient, Detail } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { activityDate } from './ActivityAuthoring.tsx';

export function AssignmentSubmissions({ api, room, activityId, onClose }: {
  api: ClassroomClient; room: Detail; activityId: string; onClose: () => void;
}) {
  const [rows, setRows] = useState<Omit<AssignmentReceipt, 'attachments'>[] | null>(null), [receipt, setReceipt] = useState<AssignmentReceipt | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { const controller = new AbortController();
    void api.call<{ submissions: Omit<AssignmentReceipt, 'attachments'>[] }>(`/${room.id}/activities/${activityId}/submissions`, 'GET', undefined, controller.signal)
      .then(data => setRows(data.submissions)).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, room.id, activityId]);
  return <Dialog title="Entregas recibidas" onClose={onClose}><section className="p7-submissions" aria-label="Entregas recibidas del trabajo práctico">
    <p>Solo se muestran intentos enviados con confirmación. Los borradores privados de estudiantes no son entregas recibidas.</p>
    {error ? <Notice error>{error}</Notice> : null}
    {!rows && !error ? <p>Cargando entregas…</p> : null}
    {rows?.length === 0 ? <p>Todavía no hay entregas recibidas.</p> : null}
    <ul>{rows?.map(row => <li key={row.id}><strong>{row.lastName}, {row.firstName}</strong> · Intento {row.number}
      <button disabled={busy} onClick={() => { setBusy(true); setError(''); void api.call<AssignmentReceipt>(`/${room.id}/attempts/${row.id}/receipt`)
        .then(setReceipt).catch(e => setError(e.message)).finally(() => setBusy(false)); }}>Abrir entrega de {row.firstName} {row.lastName} · intento {row.number}</button></li>)}</ul>
    {receipt ? <article aria-label="Comprobante recibido"><h4>{receipt.lastName}, {receipt.firstName} · Intento {receipt.number}</h4>
      <p>Recibido: {new Date(receipt.submittedAt).toLocaleString('es', { timeZone: room.timezone })} · {room.timezone}. {receipt.submittedLate ? 'Fuera de plazo.' : 'A tiempo.'} {activityDate(receipt.appliedDeadlineAt, room.timezone)}</p>
      <ul>{receipt.attachments.map(file => <li key={file.id}>{file.ready ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar entrega {file.name}</a> : `${file.name} · No disponible por revisión de seguridad`}</li>)}</ul>
      {!receipt.attachments.length ? <p>Entrega confirmada sin archivos.</p> : null}
      <Notice>Entrega recibida · pendiente de corrección. Este flujo no califica ni publica resultados.</Notice>
    </article> : null}
  </section></Dialog>;
}
