'use client';
import { useEffect, useRef, useState } from 'react';
import type { AttemptEditor, AttemptSessionData } from '../../../../../../src/core/contracts/participation.ts';
import type { AttemptAttachmentOperations, PracticalAttemptOperations } from '../model/participation-operations.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import type { AttemptExitRef } from '../model/AttemptExitRef.ts';
import styles from '../ui/Participation.module.css';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { AttemptAnswers } from '../review/AttemptAnswers.tsx';
import { AttemptReceipt } from '../receipts/AttemptReceipt.tsx';

export function PracticalAttempt({ operations, attachments, data, editor, refresh, exitRef, onClose }: {
  operations: PracticalAttemptOperations; attachments: AttemptAttachmentOperations; data: AttemptSessionData; editor: AttemptEditor | null; refresh: () => Promise<void>; exitRef?: AttemptExitRef; onClose?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null), [phase, setPhase] = useState<'selected' | 'uploading' | 'error'>('selected');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null } | null>(null);
  const [response,setResponse]=useState(data.attempt?.practicalResponse??''),[savedResponse,setSavedResponse]=useState(data.attempt?.practicalResponse??'');
  const attempt = data.attempt;
  const operation = useRef(false);
  const confirmedRevision = useRef<string | null>(null);
  const revision = attempt && confirmedRevision.current && BigInt(confirmedRevision.current) > BigInt(attempt.revision)
    ? confirmedRevision.current : attempt?.revision;
  const files = attempt?.attachments ?? [], submitted = attempt?.status === 'SUBMITTED' || receipt !== null;
  const delivery = receipt ?? attempt;
  const editable = !submitted && !!editor && data.canTransfer && editor.epoch === attempt?.epoch;
  const ready = files.every(item => item.selected && item.ready);
  const invalidResponse=[...response].length>5000;
  const canSubmit = editable && !invalidResponse && !file && ready && (!data.activity.attachmentRequired || files.length > 0);
  async function saveResponse(){
    if(response===savedResponse)return revision;
    const saved=await operations.saveResponse(revision!,response);
    confirmedRevision.current = saved.revision;
    setSavedResponse(saved.text);return saved.revision;
  }
  async function run(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); }
    finally { try { await refresh(); } catch (e) { setError((e as Error).message); } operation.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (!exitRef) return;
    exitRef.current = {
      dirty: !submitted && (Boolean(file) || response !== savedResponse), busy,
      save: editable && !invalidResponse && !file ? async () => { await saveResponse(); } : undefined,
    };
    return () => { exitRef.current = null; };
  });
  if (!attempt || !delivery) return null;
  if (submitted) return <div className="parity-receipt-screen"><AttemptReceipt delivery={delivery} title={data.activity.title} zone={data.activity.zone} number={attempt.number} content={files.length ? `${files.length} archivos` : response.trim() ? 'Respuesta escrita' : 'Entrega sin archivos'}/><div className="parity-receipt-actions"><AttemptAnswers operations={attachments} data={data}/>{onClose ? <button className="primary" onClick={onClose}>Volver a actividades</button> : null}</div></div>;
  return <section className={`p7-practical ${styles.practical}`} aria-label="Archivos y entrega del trabajo práctico">
    {error ? <Notice error>{error} {submitted ? 'Tu entrega ya está confirmada. Podés consultarla en el historial.' : null}</Notice> : null}
    {submitted ? <><p role="status" className="sr-only">Entrega confirmada.{delivery.submittedLate ? ' Entrega fuera de plazo.' : ''}</p><AttemptReceipt delivery={delivery} title={data.activity.title} zone={data.activity.zone} number={attempt.number}
      content={files.length ? `${files.length} ${files.length === 1 ? 'archivo' : 'archivos'}` : response.trim() ? 'Respuesta escrita' : 'Entrega sin archivos'} /></>
      : <header className={styles.uploadHeading}><span><FoxmindIcon name="attach"/></span><div><h3>Prepará tu entrega</h3>
        <p>{data.activity.attachmentRequired ? 'Adjuntá al menos un archivo aprobado.' : 'Podés escribir tu respuesta y sumar archivos.'}</p></div></header>}
    {editable ? <>
      <label className={styles.filePicker}><span className={styles.uploadGlyph}><FoxmindIcon name="upload"/></span>
        <span><strong>{files.length ? 'Sumá otro archivo' : 'Agregá tu trabajo'}</strong><small>Hasta 5 archivos. PDF, Word y PowerPoint de hasta 20 MB. XLSX, JPG, PNG y ZIP de hasta 50 MB.</small></span>
        <input aria-label="Seleccionar archivo del trabajo" type="file" disabled={busy || files.length >= 5}
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.jpg,.jpeg,.png,.zip" onChange={e => { setFile(e.target.files?.[0] ?? null); setPhase('selected'); setError(''); e.target.value = ''; }} /></label>
      {file ? <div className={styles.selectedFile} aria-live="polite"><p>{file.name} · {phase === 'selected' ? 'Archivo seleccionado · todavía no cargado' : phase === 'uploading' ? 'Cargando archivo y esperando validación de seguridad…' : 'Error · carga no confirmada'}</p>
        <button disabled={busy} onClick={() => { setFile(null); setError(''); }}>Descartar selección local</button>
        <button disabled={busy || files.length >= 5} onClick={() => void run(async () => {
          setPhase('uploading');
          try {
            const confirmed = await attachments.upload(file);
            if (!confirmed.ready) throw new Error('El archivo sigue pendiente de aprobación.');
            setFile(null); setPhase('selected');
          } catch (e) { setPhase('error'); throw e; }
        })}>Subir archivo privado</button></div> : null}
    </> : null}
    {files.length ? <ul className={`p7-attachment-list ${styles.uploaded}`}>{files.map(item => <li key={item.id}>
      <span className={styles.uploadGlyph}><FoxmindIcon name="file"/></span>
      <div><strong>{item.name}</strong><small>{item.ready && item.selected ? submitted ? 'Adjunto entregado · aprobado' : 'Listo para entregar'
        : item.rejectionCode ? 'Error de carga o revisión · no aprobado' : 'Carga incompleta o revisión pendiente · no aprobado'}</small>
        {item.ready ? <><a href={attachments.fileUrl(item.id)} target="_blank" rel="noreferrer">Descargar {item.name}</a>
          {['pdf', 'jpg', 'jpeg', 'png'].includes(item.extension) ? <> · <a href={attachments.fileUrl(item.id, true)} target="_blank" rel="noreferrer">Vista previa de {item.name}</a></> : null}</> : null}</div>
      {editable ? <button type="button" disabled={busy} onClick={() => void run(async () => {
        await attachments.remove(revision!, item.id);
      })}>Quitar {item.name}</button> : null}
    </li>)}</ul> : !submitted ? <p>No hay archivos confirmados.</p> : null}
    {submitted ? (response.trim() ? <button type="button" aria-haspopup="dialog" onClick={() => setResponseOpen(true)}>Ver respuesta escrita</button> : null) :
      <label>{data.activity.attachmentRequired ? 'Comentario (opcional)' : 'Tu respuesta'}
        <textarea rows={4} placeholder="Escribí acá…" aria-label={data.activity.attachmentRequired ? 'Comentario (opcional)' : 'Tu respuesta'}
          disabled={!editable || busy} value={response} aria-invalid={invalidResponse || undefined}
          onChange={event => { setResponse(event.target.value); setConfirm(false); }}/>
      </label>}
    {invalidResponse ? <Notice error>La respuesta puede tener hasta 5.000 caracteres.</Notice> : null}
    {editable ? <footer className={`${styles.workFooter} parity-work-footer`}>
      <p className={styles.answerStatus} role="status"><FoxmindIcon name={file || response !== savedResponse ? 'clock' : 'check'}/>
        {file ? 'Archivo seleccionado sin subir' : response !== savedResponse ? 'Cambios pendientes de guardar' : 'Borrador guardado'}</p>
      <div className={styles.workActions}>
        <button disabled={busy || invalidResponse || response === savedResponse} onClick={() => void run(async () => { await saveResponse(); })}>Guardar borrador</button>
        <button className="primary" disabled={busy || !canSubmit} onClick={() => void run(async () => { await saveResponse(); setConfirm(true); })}>Revisar entrega</button>
      </div>
    </footer> : null}
    {responseOpen && submitted ? <Dialog title="Respuesta escrita" onClose={() => setResponseOpen(false)}>
      <p className="p7-multiline">{response}</p>
    </Dialog> : null}
    {confirm && editable ? <Dialog title="Revisá antes de entregar" className={styles.reviewDialog} onClose={()=>{if(!busy)setConfirm(false);}}><section className="p7-submit-confirm" aria-label="Confirmar entrega del trabajo práctico"><small>Intento {attempt.number}</small><h4>{data.activity.title}</h4>
      <p>{files.length ? `Vas a entregar ${files.length === 1 ? '1 archivo aprobado' : `${files.length} archivos aprobados`}.` : 'Entrega sin archivos.'} Después de confirmar, el intento queda bloqueado. La hora de recepción del servidor determina si llegó a tiempo.</p>
      {files.length ? <ul>{files.map(item => <li key={item.id}>{item.name}</li>)}</ul> : null}
      {response.trim() ? <section aria-label="Texto que vas a entregar"><h5>Texto que vas a entregar</h5><p className="p7-multiline">{response}</p></section> : null}
      {error ? <Notice error>{error}</Notice> : null}
      <button aria-label="Cancelar entrega" disabled={busy} onClick={() => setConfirm(false)}>Volver a editar</button>
      <button className="primary" disabled={busy || !canSubmit} onClick={() => void run(async () => {
        const revision=await saveResponse();
        const result = await operations.submitPractical(revision!);
        setReceipt(result); setConfirm(false);
      })} aria-label="Confirmar envío del trabajo">Confirmar entrega</button></section></Dialog> : null}
  </section>;
}
