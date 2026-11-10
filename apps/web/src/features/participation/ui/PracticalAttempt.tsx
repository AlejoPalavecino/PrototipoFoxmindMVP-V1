'use client';
import { useState } from 'react';
import type { AttemptEditor, AttemptSessionData } from '../../../../../../src/core/contracts/participation.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { activityDate } from '../../../../../shared-ui/academic-date.ts';

export function PracticalAttempt({ api, classroomId, data, editor, refresh }: {
  api: ClassroomClient; classroomId: string; data: AttemptSessionData; editor: AttemptEditor | null; refresh: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null), [phase, setPhase] = useState<'selected' | 'uploading' | 'error'>('selected');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const [receipt, setReceipt] = useState<{ submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null } | null>(null);
  const [response,setResponse]=useState(data.attempt?.practicalResponse??''),[savedResponse,setSavedResponse]=useState(data.attempt?.practicalResponse??'');
  const attempt = data.attempt;
  if (!attempt) return null;
  const files = attempt.attachments ?? [], submitted = attempt.status === 'SUBMITTED' || receipt !== null;
  const delivery = receipt ?? attempt;
  const editable = !submitted && !!editor && data.canTransfer && editor.epoch === attempt.epoch;
  const ready = files.every(item => item.selected && item.ready);
  const invalidResponse=[...response].length>5000;
  const canSubmit = editable && !invalidResponse && !file && ready && (!data.activity.attachmentRequired || files.length > 0);
  async function saveResponse(){
    if(response===savedResponse)return attempt!.revision;
    if(!api.attempt)throw new Error('El guardado no está disponible.');
    const saved=await api.attempt<{revision:string;text:string}>(`/${classroomId}/attempts/${attempt!.id}/practical-response`,{revision:attempt!.revision,text:response},editor!);
    setSavedResponse(saved.text);return saved.revision;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); }
    finally { try { await refresh(); } catch (e) { setError((e as Error).message); } setBusy(false); }
  }
  return <section className="p7-practical" aria-label="Archivos y entrega del trabajo práctico">
    {submitted?<h4>Comprobante de entrega</h4>:null}
    <label>{data.activity.attachmentRequired?'Comentario (opcional)':'Tu respuesta'}<textarea rows={5} placeholder="Escribí acá…" aria-label={data.activity.attachmentRequired?'Comentario (opcional)':'Tu respuesta'} disabled={!editable||busy} value={response} aria-invalid={invalidResponse||undefined} onChange={event=>{setResponse(event.target.value);setConfirm(false);}}/></label>
    {invalidResponse?<Notice error>La respuesta puede tener hasta 5.000 caracteres.</Notice>:null}
    {error ? <Notice error>{error} {submitted ? 'Tu entrega ya está confirmada. No pudimos actualizar la vista; podés volver a consultar el estado.'
      : 'El archivo no se considera confirmado. Consulta el estado recuperado antes de continuar.'}</Notice> : null}
    {submitted ? <Notice><strong>Entrega confirmada.</strong> Podés consultar la calificación desde «Ver devolución».
      <br />Recepción: {delivery.submittedAt ? new Date(delivery.submittedAt).toLocaleString('es', { timeZone: data.activity.zone }) : 'No disponible'} · {data.activity.zone}.
      {delivery.submittedLate ? ' Entrega fuera de plazo.' : ' Entrega a tiempo.'} {activityDate(delivery.appliedDeadlineAt, data.activity.zone)}</Notice>
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
      <div className="p5-actions"><button disabled={busy||invalidResponse||response===savedResponse} onClick={()=>void run(async()=>{await saveResponse();})}>Guardar borrador</button><button className="primary" disabled={busy || !canSubmit} onClick={() => void run(async()=>{await saveResponse();setConfirm(true);})}>Revisar entrega</button></div>
    </> : null}
    {confirm && editable ? <Dialog title="Confirmar entrega" onClose={()=>{if(!busy)setConfirm(false);}}><section className="p7-submit-confirm" aria-label="Confirmar entrega del trabajo práctico"><small>Intento {attempt.number}</small><h4>{data.activity.title}</h4>
      <p>Se enviarán {files.length} archivos aprobados. Después de confirmar, el intento no se puede modificar. La recepción completa del servidor determina el plazo, no el inicio de la carga.</p>
      <button aria-label="Cancelar entrega" disabled={busy} onClick={() => setConfirm(false)}>Volver a editar</button>
      <button className="primary" disabled={busy || !canSubmit} onClick={() => void run(async () => {
        if (!api.attempt) throw new Error('El envío no está disponible.');
        const revision=await saveResponse();
        const result = await api.attempt<{ submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null }>(
          `/${classroomId}/attempts/${attempt.id}/submit-practical`, { revision, confirm: true }, editor!);
        setReceipt(result); setConfirm(false);
      })} aria-label="Confirmar envío del trabajo">Confirmar entrega</button></section></Dialog> : null}
  </section>;
}
