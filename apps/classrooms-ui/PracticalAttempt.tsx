'use client';
import { useState } from 'react';
import type { AttemptEditor, AttemptSessionData, ClassroomClient } from './api.ts';
import { Notice } from './components.tsx';
import { activityDate } from './ActivityAuthoring.tsx';

export function PracticalAttempt({ api, classroomId, data, editor, refresh }: {
  api: ClassroomClient; classroomId: string; data: AttemptSessionData; editor: AttemptEditor | null; refresh: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null), [phase, setPhase] = useState<'selected' | 'uploading' | 'error'>('selected');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const attempt = data.attempt;
  if (!attempt) return null;
  const files = attempt.attachments ?? [], submitted = attempt.status === 'SUBMITTED';
  const editable = !submitted && !!editor && data.canTransfer && editor.epoch === attempt.epoch;
  const ready = files.every(item => item.selected && item.ready);
  const canSubmit = editable && !file && ready && (!data.activity.attachmentRequired || files.length > 0);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); }
    finally { try { await refresh(); } catch (e) { setError((e as Error).message); } setBusy(false); }
  }
  return <section className="p7-practical" aria-label="Archivos y entrega del trabajo práctico">
    <h4>{submitted ? 'Comprobante de entrega' : 'Archivos del borrador'}</h4>
    {error ? <Notice error>{error} El archivo no se considera confirmado. Consulta el estado recuperado antes de continuar.</Notice> : null}
    {submitted ? <Notice>Entregado · pendiente de corrección. No hay una calificación publicada en este comprobante.
      <br />Recepción: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('es', { timeZone: data.activity.zone }) : 'No disponible'} · {data.activity.zone}.
      {attempt.submittedLate ? ' Entrega fuera de plazo.' : ' Entrega a tiempo.'} {activityDate(attempt.appliedDeadlineAt, data.activity.zone)}</Notice>
      : <p>Los archivos confirmados se recuperan al volver a abrir el intento. Seleccionar o subir un archivo NO entrega el trabajo.
        {data.activity.attachmentRequired ? ' Debes adjuntar al menos un archivo aprobado.' : ' Puedes confirmar una entrega sin archivos.'} Hasta 5 archivos de 50 MB cada uno, según el espacio disponible del aula.</p>}
    <ul className="p7-attachment-list">{files.map(item => <li key={item.id}>
      <div><strong>{item.name}</strong><small>{item.ready && item.selected ? submitted ? 'Adjunto entregado · aprobado' : 'Borrador confirmado · aprobado' : item.rejectionCode ? 'Error de carga o revisión · no aprobado' : 'Carga incompleta o revisión pendiente · no aprobado'}</small>
        {item.ready ? <><a href={api.fileUrl(item.id)} target="_blank" rel="noreferrer">Descargar {item.name}</a>
          {['pdf', 'jpg', 'jpeg', 'png'].includes(item.extension) ? <> · <a href={api.fileUrl(item.id, true)} target="_blank" rel="noreferrer">Vista previa de {item.name}</a></> : null}</> : null}</div>
      {editable ? <button disabled={busy} onClick={() => void run(async () => {
        if (!api.attempt) throw new Error('El flujo de archivos no está disponible.');
        await api.attempt(`/${classroomId}/attempts/${attempt.id}/attachments-remove`, { revision: attempt.revision, fileId: item.id }, editor!);
      })}>Quitar {item.name}</button> : null}
    </li>)}</ul>
    {!files.length ? <p>{submitted ? 'Entrega confirmada sin archivos.' : 'No hay archivos confirmados.'}</p> : null}
    {editable ? <>
      <label>Seleccionar archivo del trabajo<input aria-label="Seleccionar archivo del trabajo" type="file" disabled={busy || files.length >= 5}
        accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.zip" onChange={e => { setFile(e.target.files?.[0] ?? null); setPhase('selected'); setError(''); e.target.value = ''; }} /></label>
      {file ? <div aria-live="polite"><p>{file.name} · {phase === 'selected' ? 'Archivo seleccionado · todavía no cargado' : phase === 'uploading' ? 'Cargando archivo y esperando validación de seguridad…' : 'Error · carga no confirmada'}</p>
        <button disabled={busy} onClick={() => { setFile(null); setError(''); }}>Descartar selección local</button>
        <button disabled={busy || files.length >= 5} onClick={() => void run(async () => {
          if (!api.uploadAttachment) throw new Error('La carga no está disponible.');
          setPhase('uploading');
          try {
            const confirmed = await api.uploadAttachment(classroomId, attempt.id, file, editor!);
            if (!confirmed.ready) throw new Error('El archivo sigue pendiente de aprobación.');
            setFile(null); setPhase('selected');
          } catch (e) { setPhase('error'); throw e; }
        })}>Subir archivo privado</button></div> : null}
      <p>Para reemplazar un archivo, quítalo del borrador y agrega el nuevo. Esto no elimina los archivos conservados ni libera su espacio.</p>
      <button className="primary" disabled={busy || !canSubmit} onClick={() => setConfirm(true)}>Enviar trabajo práctico</button>
    </> : null}
    {confirm && editable ? <section className="p7-submit-confirm" aria-label="Confirmar entrega del trabajo práctico"><h4>Confirmar entrega</h4>
      <p>Se enviarán {files.length} archivos aprobados. Después de confirmar, el intento no se puede modificar. La recepción completa del servidor determina el plazo, no el inicio de la carga.</p>
      <button disabled={busy} onClick={() => setConfirm(false)}>Cancelar entrega</button>
      <button className="primary" disabled={busy || !canSubmit} onClick={() => void run(async () => {
        if (!api.attempt) throw new Error('El envío no está disponible.');
        await api.attempt(`/${classroomId}/attempts/${attempt.id}/submit-practical`, { revision: attempt.revision, confirm: true }, editor!);
        setConfirm(false);
      })}>Confirmar envío del trabajo</button></section> : null}
  </section>;
}
