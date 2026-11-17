'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { WallContent, WallData, WallPost, WallTarget, WallRepliesPage, WallThreadData } from '../../../../../../src/core/contracts/communication.ts';
import { parseWallData, parseWallThreadData, parseWallRepliesPage } from '../../../../../../src/core/domain/communication/wall.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import styles from './wall.module.css';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

export function TextForm({ label, initial = '', initialTitle = '', withTitle = false, titleRequired = false, busy, onSave, onCancel, focusBody = false }: {
  label: string; initial?: string; initialTitle?: string; withTitle?: boolean; titleRequired?: boolean; busy: boolean; onSave: (body: string, title?: string) => Promise<void>; onCancel?: () => void; focusBody?: boolean;
}) {
  const [body, setBody] = useState(initial);
  const [title, setTitle] = useState(initialTitle);
  const length = [...body].length;
  const titleLength = [...title].length;
  const invalid = !body.trim() || length > 5000 || withTitle && (titleLength > 120 || titleRequired && !title.trim());
  return <form className={styles.composer} aria-busy={busy} onSubmit={event => { event.preventDefault(); if (!busy && !invalid) void onSave(body, withTitle ? title : undefined); }}>
    <fieldset disabled={busy}>
      {withTitle ? <><label>Título<input name="title" required={titleRequired} value={title} aria-invalid={titleLength > 120 || undefined} onChange={event => setTitle(event.target.value)} /></label>{titleLength > 120 ? <small role="alert">El título admite hasta 120 caracteres.</small> : null}</> : null}
      <label>{withTitle ? 'Tu mensaje' : 'Tu respuesta'}<textarea autoFocus={focusBody} required rows={4} value={body} aria-invalid={length > 5000 || undefined}
        onChange={event => setBody(event.target.value)} /></label>
      {length > 5000 ? <small role="alert">El mensaje admite hasta 5.000 caracteres.</small> : null}
      <div className="p5-actions">
        {onCancel ? <button type="button" onClick={onCancel}>Cancelar</button> : null}
        <button type="submit" className="primary" disabled={invalid}>{busy ? label.startsWith('Publicar') ? 'Publicando…' : label === 'Enviar respuesta' ? 'Enviando…' : 'Guardando…' : label}{label === 'Publicar mensaje' ? <FoxmindIcon name="arrow-right" /> : null}</button>
      </div>
    </fieldset>
  </form>;
}

/** Content is always a React text node, including literal HTML and removed markers. */
export function WallContentView({ content, children, tag }: { content: WallContent; children?: ReactNode; tag?: string }) {
  return <>
    <header className={styles.byline}><div className={styles.author}><span className={styles.avatar} aria-hidden="true">{content.initials}</span><div>
      <strong>{content.authorName}</strong><small><time dateTime={content.createdAt} title={new Date(content.createdAt).toLocaleString('es-AR')}>{new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short'}).format(new Date(content.createdAt)).replaceAll('.','')}</time>
        {tag ? <span> · {tag}</span> : null}{content.editedAt ? ' · Editado' : ''}</small>
    </div></div>{children}</header>
    {content.removedAt ? <p className="p6-wall-removed">Contenido eliminado</p> : <>{'title' in content && typeof content.title === 'string' && content.title ? <h3 className={styles.title}>{content.title}</h3> : null}<p className={styles.body}>{content.body}</p></>}
  </>;
}

export function Wall({ api, room, reload, target, onChanged, openComposer = false }: {
  api: ClassroomClient; room: Detail; reload: () => Promise<void>; target?: WallTarget | null; onChanged?: () => void; openComposer?: boolean;
}) {
  const [data, setData] = useState<WallData | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [composerKey, setComposerKey] = useState(0);
  const [editing, setEditing] = useState<{ content: WallContent; reply: boolean } | null>(null);
  const [removing, setRemoving] = useState<{ content: WallContent; reply: boolean } | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [composing, setComposing] = useState(openComposer);
  const root = useRef<HTMLElement>(null);
  const operation = useRef(false);
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
    if (!signal?.aborted) setData(result);
  }, [api, room.id, target?.postId, target?.replyId]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setNotice(''); setEditing(null); setRemoving(null); setReplying(null);
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
    if (operation.current) return;
    operation.current = true; setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (e) { setError((e as Error).message); } finally { operation.current = false; setBusy(false); }
  }
  async function change(operation: Record<string, unknown>, onSaved: () => void) {
    if (!data) return;
    await api.call(`/${room.id}/wall`, 'POST', { revision: data.revision, operation });
    onSaved();
    onChanged?.();
    try { await Promise.all([reload(), load()]); }
    catch { setError('La publicación se guardó, pero todavía no se pudo actualizar el Muro.'); }
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
  const posts = data?.posts;
  const finishReply = (id: string) => {
    setReplying(null);
    requestAnimationFrame(() => {
      const trigger = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-reply-trigger]') ?? [])
        .find(button => button.dataset.replyTrigger === id);
      trigger?.focus();
    });
  };
  const controls = (content: WallContent, reply: boolean) => !room.archived && !content.removedAt ? <div className={styles.controls}>
    {content.canEdit ? <button aria-label={reply?'Editar respuesta':'Editar publicación'} title={reply?'Editar respuesta':'Editar publicación'} disabled={busy} onClick={() => setEditing({ content, reply })}><FoxmindIcon name="edit"/></button> : null}
    {content.canRemove ? <button aria-label={reply?'Eliminar respuesta':'Eliminar publicación'} title={reply?'Eliminar respuesta':'Eliminar publicación'} disabled={busy} onClick={() => setRemoving({ content, reply })}><FoxmindIcon name="trash"/></button> : null}
  </div> : null;
  return <section ref={root} className={`parity-wall ${styles.wall}`} aria-label="Muro del aula">
    <header className={styles.heading}><div><h2>Conversemos en el aula</h2><p>Los avisos y las consultas son visibles para tu grupo.</p></div>
      {!room.archived ? <button className="primary" disabled={busy || !data} onClick={() => setComposing(true)}>
        <FoxmindIcon name={room.role === 'teacher' ? 'plus' : 'chat'} />{room.role === 'teacher' ? 'Publicar aviso' : 'Hacer una consulta'}
      </button> : null}
    </header>
    {error ? <Notice error>{error} Actualizá el Muro antes de volver a intentar.<button disabled={busy} onClick={() => void run(async()=>{await Promise.all([reload(),load()]);})}>Actualizar Muro</button></Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!data && !error ? <div className={styles.loading} role="status">Cargando Muro…
      <div aria-hidden="true"><span /><span /><span /></div></div> : null}
    {!room.archived && data && composing ? <Dialog className="parity-wall-dialog" title={room.role === 'teacher' ? 'Una idea para tu grupo' : 'Tu pregunta tiene lugar'} onClose={() => { if (!busy) setComposing(false); }}>{error ? <Notice error>{error}</Notice> : null}<p>Se compartirá dentro del aula.</p><TextForm key={composerKey} onCancel={() => setComposing(false)} withTitle titleRequired busy={busy} label="Publicar mensaje"
      onSave={(body,title) => run(async () => { await change({ action: 'publish', title: title || null, body }, () => {
        setComposerKey(value => value + 1); setComposing(false);
        setNotice(room.role === 'teacher' ? 'Aviso publicado en el aula.' : 'Consulta publicada en el aula.');
      }); })} /></Dialog> : null}
    {posts?.length === 0 ? <div role="status" className={styles.empty}>
      <FoxmindIcon name="chat" />
      <h3>Todavía no hay conversaciones</h3>
      <p>Los avisos y las consultas de este grupo van a aparecer acá.</p>
    </div> : null}
    {data && target && !data.posts.some(post => post.id === target.postId) ? <Notice>La publicación ya no está disponible para tu cuenta.</Notice> : null}
    <div className={styles.threads}>{posts?.map((post: WallPost) => <article key={post.id} data-wall-id={post.id} tabIndex={-1}
      aria-label={post.type === 'NOTICE' ? 'Aviso del aula' : 'Consulta del aula'} data-editable={post.canEdit} data-post-type={post.type} className={target?.postId === post.id ? 'p6-wall-selected' : undefined}>
      <WallContentView content={post} tag={post.type === 'NOTICE' ? 'Aviso' : 'Consulta'}>{controls(post, false)}</WallContentView>
      <section className={styles.replies} aria-label="Respuestas de la publicación">
        <h4 className="sr-only">Respuestas ({post.replyCount})</h4>
        {post.repliesPreviousCursor ? <button disabled={busy} onClick={() => void run(() => moreReplies(post, 'previous'))}>Respuestas anteriores</button> : null}
        {post.replies.map(reply => <article key={reply.id} data-wall-id={reply.id} tabIndex={-1}
          className={target?.replyId === reply.id ? 'p6-wall-selected' : undefined}>
          <div className={styles.replyContent}><p className={styles.body}><strong>{reply.authorName}:</strong> {reply.removedAt ? 'Contenido eliminado' : reply.body}</p>{controls(reply, true)}</div>
        </article>)}
        {post.repliesNextCursor ? <button disabled={busy} onClick={() => void run(() => moreReplies(post, 'next'))}>Más respuestas</button> : null}
        {!room.archived && !post.removedAt ? replying === post.id ? <Dialog className="parity-wall-dialog" title="Continuar la conversación" onClose={() => { if (!busy) finishReply(post.id); }}><p>Se compartirá dentro del aula.</p>{error ? <Notice error>{error}</Notice> : null}<TextForm label="Publicar mensaje" focusBody busy={busy} onCancel={() => finishReply(post.id)}
          onSave={body => run(async () => { await change({ action: 'reply', postId: post.id, body }, () => {
            finishReply(post.id); setNotice('Respuesta publicada.');
          }); })} /></Dialog>
          : <button className={styles.reply} data-reply-trigger={post.id} aria-label="Responder publicación" disabled={busy} onClick={() => setReplying(post.id)}><FoxmindIcon name="chat"/>Responder</button> : null}
      </section>
    </article>)}</div>
    {data?.nextCursor ? <button disabled={busy} onClick={() => void run(morePosts)}>Más publicaciones</button> : null}
    {editing ? <Dialog title={editing.reply ? 'Editar respuesta' : 'Editar publicación'} onClose={() => { if (!busy) setEditing(null); }}>
      {error ? <Notice error>{error}</Notice> : null}
      <TextForm initial={editing.content.body ?? ''} withTitle={!editing.reply} initialTitle={'title' in editing.content && typeof editing.content.title === 'string' ? editing.content.title : ''} label="Guardar texto" busy={busy} onCancel={() => setEditing(null)} onSave={(body,title) => run(async () => {
        await change({ action: editing.reply ? 'editReply' : 'editPost', id: editing.content.id, body,
          ...(!editing.reply ? { title: title || null } : {}) }, () => { setEditing(null); setNotice('Cambios guardados.'); });
      })} />
    </Dialog> : null}
    {removing ? <Dialog title={removing.reply ? 'Eliminar respuesta' : 'Eliminar publicación'} onClose={() => { if (!busy) setRemoving(null); }}>
      <p>Se reemplazará el texto por una marca de contenido eliminado. Las respuestas de otras personas se conservarán. Esta acción no se puede deshacer.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <footer className="p5-form-footer"><button disabled={busy} onClick={() => setRemoving(null)}>Cancelar</button>
        <button className="primary" disabled={busy} onClick={() => void run(async () => {
          await change({ action: removing.reply ? 'removeReply' : 'removePost', id: removing.content.id, confirm: true }, () => {
            setRemoving(null); setNotice('Contenido eliminado.');
          });
        })}>Confirmar eliminación</button></footer>
    </Dialog> : null}
  </section>;
}
