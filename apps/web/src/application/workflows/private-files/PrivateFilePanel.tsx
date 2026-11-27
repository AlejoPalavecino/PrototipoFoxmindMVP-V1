import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createAccountClient, type AccountSession } from '../../../features/identity/api.ts';
import { createFileClient, FileClientError, fileState, type FileContext, type FileUsage, type PrivateFileStatus } from '../../../features/files/api.ts';
import { Button } from '../../../../../shared-ui/primitives/button.tsx';
import { Input } from '../../../../../shared-ui/primitives/input.tsx';
import { Label } from '../../../../../shared-ui/primitives/label.tsx';
import { createSessionCsrfSource } from '../../../shared/http/csrf.ts';

// One CSRF token for the panel; account mutations in this tab drop it.
const client = createFileClient(fetch, createSessionCsrfSource());
const accounts = createAccountClient();
function bytes(value: string) { const count = Number(value); return Number.isFinite(count) ? `${(count / 1_000_000).toLocaleString('es', { maximumFractionDigits: 2 })} MB` : '—'; }

export function PrivateFilePanel({ context, onSessionChange }: { context: FileContext; onSessionChange?: (session: AccountSession | undefined) => void }) {
  const { kind, id, purpose } = context;
  const [session, setSession] = useState<AccountSession>();
  const [usage, setUsage] = useState<FileUsage>();
  const [file, setFile] = useState<File>();
  const [current, setCurrent] = useState<PrivateFileStatus>();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [preview, setPreview] = useState(false);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const verified = session?.authenticated && session.user.emailVerified;
  useEffect(() => { onSessionChange?.(session); }, [session, onSessionChange]);
  const rejected = current ? fileState(current) === 'rejected' : false;
  const previewable = current?.ready && /\.(pdf|png|jpe?g)$/i.test(current.name);
  const report = useCallback((error: unknown) => {
    const safe = error instanceof FileClientError ? error : new FileClientError('SERVICE_UNAVAILABLE', 503);
    setMessage(safe.message);
    if (safe.code === 'AUTH_REQUIRED') setSession({ authenticated: false });
    if (safe.code === 'EMAIL_VERIFICATION_REQUIRED') setSession(value => value?.authenticated ? { ...value, user: { ...value.user, emailVerified: false } } : value);
    if (safe.retryAfter) { const time = Date.now(); setNow(time); setDeadline(time + safe.retryAfter * 1000); }
  }, []);
  useEffect(() => {
    let active = true;
    setLoaded(false); setUsage(undefined); setCurrent(undefined); setFile(undefined); setMessage(''); setPreview(false); setDeadline(0);
    void (async () => {
      try {
        const value = await accounts.session();
        if (!active) return;
        setSession(value);
        if (value.authenticated && value.user.emailVerified) {
          const storage = await client.usage({ kind, id, purpose });
          if (active) setUsage(storage);
        }
      } catch (error) { if (active) report(error); }
      finally { if (active) setLoaded(true); }
    })();
    return () => { active = false; };
  }, [kind, id, purpose, report]);
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const [storage, status] = await Promise.all([client.usage(context), current ? client.status(current.id) : Promise.resolve(undefined)]);
      setUsage(storage); if (status) setCurrent(status);
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file || busy || remaining || !verified) return;
    setBusy(true); setMessage(''); setPreview(false);
    let admitted = current;
    try {
      admitted = admitted ?? await client.begin(context, file);
      setCurrent(admitted);
      if (!admitted.ready) setCurrent(await client.send(admitted.id, file));
    } catch (error) {
      report(error);
      // The backend may have persisted quarantine/rejection before returning an error.
      if (admitted) { try { setCurrent(await client.status(admitted.id)); } catch { /* Keep the last server admission. */ } }
    } finally {
      try { setUsage(await client.usage(context)); } catch { /* Keep the last verified quota; refresh is available. */ }
      setBusy(false);
    }
  }
  if (!loaded) return <p role="status">Cargando archivos…</p>;
  if (!session) return <p role="alert">No se pudo comprobar la sesión. Actualiza la página para volver a intentar.</p>;
  if (!session.authenticated) return <div className="state"><p>Inicia sesión para acceder a los archivos de este contexto.</p><Link className="button button-primary" href="/sign-in">Iniciar sesión</Link></div>;
  if (!verified) return <div className="state"><p>Verifica tu correo para acceder a los archivos.</p><Link href="/verify-email">Verificar correo</Link></div>;
  return <section aria-label="Archivos privados" aria-busy={busy}>
    <p>Los archivos estarán disponibles después de validar su contenido y completar el análisis de seguridad.</p>
    {usage ? <p aria-label="Espacio disponible">Disponible: {bytes(usage.availableBytes)} de {bytes(usage.quotaBytes)}. En uso: {bytes(usage.usedBytes)}.</p> : null}
    {message ? <p className="notice notice-error" role="alert">{message}</p> : null}
    {remaining ? <p role="status">Podrás volver a intentar en {remaining} segundos.</p> : null}
    <form onSubmit={upload}><fieldset disabled={busy || remaining > 0}>
      <div className="field"><Label htmlFor="private-file">Seleccionar archivo</Label>
        <Input id="private-file" type="file" accept={purpose === 'plan' ? '.pdf,.docx' : '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx,.zip'} onChange={event => { setFile(event.target.files?.[0]); setCurrent(undefined); setPreview(false); setMessage(''); }} />
      </div>
      <Button type="submit" disabled={!file || Boolean(current?.ready) || rejected || !usage}>{busy ? 'Subiendo archivo…' : current ? 'Reintentar subida' : 'Subir archivo'}</Button>
    </fieldset></form>
    {current ? <div className="verification-content">
      <h2>{current.name}</h2>
      <p role="status">{current.ready ? 'Archivo listo' : rejected ? 'Archivo rechazado' : 'Archivo pendiente de validación'}</p>
      {rejected ? <p>Selecciona otro archivo permitido para continuar.</p> : null}
      {current.ready ? <div className="actions">
        {previewable ? <Button variant="outline" onClick={() => setPreview(value => !value)}>{preview ? 'Cerrar vista previa' : 'Previsualizar archivo'}</Button> : <p>Este formato está disponible para descarga.</p>}
        <a className="button button-outline" href={client.contentUrl(current.id, 'download')} download>Descargar archivo</a>
      </div> : null}
      {preview && previewable ? <div><iframe title="Vista previa del archivo" src={client.contentUrl(current.id, 'preview')} sandbox="allow-same-origin" style={{ width: '100%', minHeight: 360, border: 0 }} /><p>Si el visor no muestra el archivo, utiliza Descargar archivo.</p></div> : null}
    </div> : null}
    <div className="actions"><Button variant="outline" disabled={busy || remaining > 0} onClick={() => void refresh()}>Actualizar estado</Button></div>
  </section>;
}
