'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ClassroomClient, Detail, WallContent, WallData, WallPost, WallTarget, WallRepliesPage, WallThreadData } from './api.ts';
import { parseWallData, parseWallThreadData, parseWallRepliesPage } from '../../src/core/domain/index.ts';
import { Dialog, Notice } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';

function TextForm({ label, initial = '', busy, onSave, onCancel }: {
  label: string; initial?: string; busy: boolean; onSave: (body: string) => Promise<void>; onCancel?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const length = [...body].length;
  return <form onSubmit={event => { event.preventDefault(); void onSave(body); }}>
    <fieldset disabled={busy}>
      <label>{label}<textarea required rows={3} placeholder="Compartí una idea, una consulta o una respuesta con tu aula…" value={body} aria-invalid={length > 5000 || undefined}
        onChange={event => setBody(event.target.value)} /></label>
      <small>{length.toLocaleString()} / 5.000 · Lo puede leer toda el aula.</small>
      <div className="p5-actions">
        {onCancel ? <button type="button" onClick={onCancel}>Cancelar</button> : null}
        <button className="primary" disabled={!body.trim() || length > 5000}>{label}</button>
      </div>
    </fieldset>
  </form>;
}

/** Content is always a React text node, including literal HTML and removed markers. */
export function WallContentView({ content, children }: { content: WallContent; children?: ReactNode }) {
  return <>
    <header className="p6-wall-author"><span className="p5-avatar" aria-hidden="true">{content.initials}</span><div>
      <strong>{content.authorName}</strong><small><time dateTime={content.createdAt}>{new Date(content.createdAt).toLocaleString('es-AR')}</time>
        {content.editedAt ? ' · Editado' : ''}</small>
    </div></header>
    {content.removedAt ? <p className="p6-wall-removed">Contenido eliminado</p> : <p className="p6-wall-text">{content.body}</p>}
    {children}
  </>;
}

export function Wall({ api, room, reload, target, onChanged }: {
  api: ClassroomClient; room: Detail; reload: () => Promise<void>; target?: WallTarget | null; onChanged?: () => void;
}) {
  const [data, setData] = useState<WallData | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [composerKey, setComposerKey] = useState(0);
  const [editing, setEditing] = useState<{ content: WallContent; reply: boolean } | null>(null);
  const [removing, setRemoving] = useState<{ content: WallContent; reply: boolean } | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = parseWallData(await api.call<WallData>(`/${room.id}/wall`, 'GET', undefined, signal));
    if (target?.postId) {
      const suffix = target.replyId ? `?replyId=${encodeURIComponent(target.replyId)}` : '';
      try {
        const selected = parseWallThreadData(await api.call<WallThreadData>(`/${room.id}/wall/${target.postId}${suffix}`, 'GET', undefined, signal));
        result.posts = [selected.post, ...result.posts.filter(post => post.id !== selected.post.id)];
        result.revision = selected.revision;
      } catch (error) { if (signal?.aborted) throw error; setError((error as Error).message); }
    }
    setData(result);
  }, [api, room.id, target?.postId, target?.replyId]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setEditing(null); setRemoving(null); setReplying(null);
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [load, target?.postId, target?.replyId]);
  useEffect(() => {
    if (!target || !data) return;
    const id = target.replyId ?? target.postId;
    // Match an existing dataset value rather than constructing a selector from target input.
    const element = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-wall-id]') ?? []).find(item => item.dataset.wallId === id);
    element?.scrollIntoView({ block: 'center', behavior: 'auto' }); element?.focus({ preventScroll: true });
  }, [target, data]);
  async function run(task: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function change(operation: Record<string, unknown>) {
    if (!data) return;
    await api.call(`/${room.id}/wall`, 'POST', { revision: data.revision, operation });
    await Promise.all([reload(), load()]);
    onChanged?.();
  }
  async function morePosts() {
    if (!data?.nextCursor) return;
    const page = parseWallData(await api.call<WallData>(`/${room.id}/wall?cursor=${encodeURIComponent(data.nextCursor)}`));
    setData(current => current ? { ...page, posts: [...current.posts, ...page.posts.filter(post => !current.posts.some(item => item.id === post.id))] } : page);
  }
  async function moreReplies(post: WallPost, direction: 'next' | 'previous') {
    const cursor = direction === 'next' ? post.repliesNextCursor : post.repliesPreviousCursor;
    if (!cursor) return;
    const page = parseWallRepliesPage(await api.call<WallRepliesPage>(`/${room.id}/wall/${post.id}/replies?cursor=${encodeURIComponent(cursor)}`));
    setData(current => current ? { ...current, revision: page.revision, posts: current.posts.map(item => item.id !== post.id ? item : {
      ...item, replies: direction === 'next' ? [...item.replies, ...page.replies] : [...page.replies, ...item.replies],
      repliesNextCursor: direction === 'next' ? page.nextCursor : item.repliesNextCursor,
      repliesPreviousCursor: direction === 'previous' ? page.previousCursor : item.repliesPreviousCursor,
    }) } : current);
  }
  const controls = (content: WallContent, reply: boolean) => !room.archived && !content.removedAt ? <div className="p5-actions">
    {content.canEdit ? <button disabled={busy} onClick={() => setEditing({ content, reply })}>{reply ? 'Editar respuesta' : 'Editar publicación'}</button> : null}
    {content.canRemove ? <button disabled={busy} onClick={() => setRemoving({ content, reply })}>{reply ? 'Eliminar respuesta' : 'Eliminar publicación'}</button> : null}
  </div> : null;
  return <section ref={root} className="p6-wall" aria-label="Muro del aula">
    <header className="p5-section-head"><div className="interior-social-heading"><EntryIcon name="book" /><div><h2>Muro del aula</h2><p>Avisos y consultas, con sus respuestas en contexto.</p></div></div>
      <button disabled={busy} onClick={() => void run(async () => { await Promise.all([reload(), load()]); })}>Actualizar Muro</button>
    </header>
    {error ? <Notice error>{error} Actualiza el Muro antes de volver a intentar. Tu texto no se ha descartado.</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!data && !error ? <Notice>Cargando Muro…</Notice> : null}
    <div className="classroom-wall-layout"><div className="classroom-wall-conversation">
    {!room.archived && data ? <div className="classroom-wall-composer"><TextForm key={composerKey} busy={busy} label={room.role === 'teacher' ? 'Publicar aviso' : 'Publicar consulta'}
      onSave={body => run(async () => { await change({ action: 'publish', body }); setComposerKey(value => value + 1); setNotice('Publicación guardada.'); })} /></div> : null}
    <details className="interior-wall-guide">
      <summary>Cómo participar en el Muro</summary>
      <ol><li><strong>Respetá a los demás</strong><p>Compartí tus ideas con un lenguaje amable y constructivo.</p></li>
        <li><strong>Sumá al aprendizaje</strong><p>Hacé preguntas, compartí recursos y ayudá a tus compañeros.</p></li>
        <li><strong>Mantené el foco</strong><p>Publicá contenido relacionado con los temas de la clase.</p></li></ol>
    </details>
    {data?.posts.length === 0 ? <p className="p5-empty">Todavía no hay publicaciones.</p> : null}
    {data && target && !data.posts.some(post => post.id === target.postId) ? <Notice>La publicación ya no está disponible para tu cuenta.</Notice> : null}
    <div className="p6-wall-threads">{data?.posts.map((post: WallPost) => <article key={post.id} data-wall-id={post.id} tabIndex={-1}
      aria-label={post.type === 'NOTICE' ? 'Aviso del aula' : 'Consulta del aula'} className={target?.postId === post.id ? 'p6-wall-selected' : undefined}>
      <span className="p5-tag">{post.type === 'NOTICE' ? 'Aviso' : 'Consulta'}</span>
      <WallContentView content={post}>{controls(post, false)}</WallContentView>
      <section className="p6-wall-replies" aria-label="Respuestas de la publicación">
        <h3>Respuestas ({post.replyCount})</h3>
        {post.repliesPreviousCursor ? <button disabled={busy} onClick={() => void run(() => moreReplies(post, 'previous'))}>Respuestas anteriores</button> : null}
        {post.replies.map(reply => <article key={reply.id} data-wall-id={reply.id} tabIndex={-1}
          className={target?.replyId === reply.id ? 'p6-wall-selected' : undefined}>
          <WallContentView content={reply}>{controls(reply, true)}</WallContentView>
        </article>)}
        {post.repliesNextCursor ? <button disabled={busy} onClick={() => void run(() => moreReplies(post, 'next'))}>Más respuestas</button> : null}
        {!room.archived && !post.removedAt ? replying === post.id ? <TextForm label="Enviar respuesta" busy={busy} onCancel={() => setReplying(null)}
          onSave={body => run(async () => { await change({ action: 'reply', postId: post.id, body }); setReplying(null); setNotice('Respuesta guardada.'); })} />
          : <button disabled={busy} onClick={() => setReplying(post.id)}>Responder publicación</button> : null}
      </section>
    </article>)}</div>
    {data?.nextCursor ? <button disabled={busy} onClick={() => void run(morePosts)}>Más publicaciones</button> : null}
    </div><aside className="classroom-wall-guidance"><EntryIcon name="book" /><h3>La conversación sigue acá</h3><p>El Muro reúne los avisos y las preguntas compartidas. Las consignas y las entregas están en Actividades.</p><small>Tu publicación la puede leer toda el aula.</small>{room.archived ? <p>El aula está archivada. Podés consultar las conversaciones conservadas.</p> : null}</aside></div>
    {editing ? <Dialog title={editing.reply ? 'Editar respuesta' : 'Editar publicación'} onClose={() => { if (!busy) setEditing(null); }}>
      {error ? <Notice error>{error}</Notice> : null}
      <TextForm initial={editing.content.body ?? ''} label="Guardar texto" busy={busy} onCancel={() => setEditing(null)} onSave={body => run(async () => {
        await change({ action: editing.reply ? 'editReply' : 'editPost', id: editing.content.id, body }); setEditing(null); setNotice('Texto actualizado.');
      })} />
    </Dialog> : null}
    {removing ? <Dialog title={removing.reply ? 'Eliminar respuesta' : 'Eliminar publicación'} onClose={() => { if (!busy) setRemoving(null); }}>
      <p>Se reemplazará el texto por una marca de contenido eliminado. Las respuestas de otras personas se conservarán. Esta acción no se puede deshacer.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <footer className="p5-form-footer"><button disabled={busy} onClick={() => setRemoving(null)}>Cancelar</button>
        <button className="primary" disabled={busy} onClick={() => void run(async () => {
          await change({ action: removing.reply ? 'removeReply' : 'removePost', id: removing.content.id, confirm: true }); setRemoving(null); setNotice('Contenido eliminado.');
        })}>Confirmar eliminación</button></footer>
    </Dialog> : null}
  </section>;
}
