'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { WallContent, WallData, WallPost, WallTarget, WallRepliesPage, WallThreadData } from '../../../../../../src/core/contracts/communication.ts';
import { parseWallData, parseWallThreadData, parseWallRepliesPage } from '../../../../../../src/core/domain/index.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

export function TextForm({ label, initial = '', initialTitle = '', withTitle = false, titleRequired = false, busy, onSave, onCancel }: {
  label: string; initial?: string; initialTitle?: string; withTitle?: boolean; titleRequired?: boolean; busy: boolean; onSave: (body: string, title?: string) => Promise<void>; onCancel?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [title, setTitle] = useState(initialTitle);
  const length = [...body].length;
  const titleLength = [...title].length;
  const invalid = !body.trim() || length > 5000 || withTitle && (titleLength > 120 || titleRequired && !title.trim());
  return <form className="br-wall-composer" onSubmit={event => { event.preventDefault(); if (!busy && !invalid) void onSave(body, withTitle ? title : undefined); }}>
    <fieldset disabled={busy}>
      {withTitle ? <><label>Título<input name="title" required={titleRequired} value={title} placeholder="Ej. Salida de campo" aria-invalid={titleLength > 120 || undefined} onChange={event => setTitle(event.target.value)} /></label><small>{titleLength} / 120</small></> : null}
      <label>{label}<textarea required rows={3} placeholder="Compartí una idea, una consulta o una respuesta con tu aula…" value={body} aria-invalid={length > 5000 || undefined}
        onChange={event => setBody(event.target.value)} /></label>
      <small>{length.toLocaleString()} / 5.000 · Lo puede leer toda el aula.</small>
      <div className="p5-actions">
        {onCancel ? <button type="button" onClick={onCancel}>Cancelar</button> : null}
        <button className="primary" disabled={invalid}>{label}</button>
      </div>
    </fieldset>
  </form>;
}

/** Content is always a React text node, including literal HTML and removed markers. */
export function WallContentView({ content, children }: { content: WallContent; children?: ReactNode }) {
  return <>
    <header className="p6-wall-author"><span className="p5-avatar" aria-hidden="true">{content.initials}</span><div>
      <strong>{content.authorName}</strong><small><time dateTime={content.createdAt} title={new Date(content.createdAt).toLocaleString('es-AR')}>{new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short'}).format(new Date(content.createdAt)).replaceAll('.','')}</time>
        {content.editedAt ? ' · Editado' : ''}</small>
    </div></header>
    {content.removedAt ? <p className="p6-wall-removed">Contenido eliminado</p> : <>{'title' in content && typeof content.title === 'string' && content.title ? <h3 className="br-wall-title">{content.title}</h3> : null}<p className="p6-wall-text">{content.body}</p></>}
    {children}
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
  const [postFilter, setPostFilter] = useState<'all' | 'NOTICE' | 'QUERY'>('all');
  const root = useRef<HTMLElement>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = parseWallData(await api.call<WallData>(`/${room.id}/wall${postFilter==='all'?'':`?type=${postFilter}`}`, 'GET', undefined, signal));
    if (target?.postId) {
      const suffix = target.replyId ? `?replyId=${encodeURIComponent(target.replyId)}` : '';
      try {
        const selected = parseWallThreadData(await api.call<WallThreadData>(`/${room.id}/wall/${target.postId}${suffix}`, 'GET', undefined, signal));
        result.posts = [selected.post, ...result.posts.filter(post => post.id !== selected.post.id)];
        result.revision = selected.revision;
      } catch (error) { if (signal?.aborted) throw error; setError((error as Error).message); }
    }
    setData(result);
  }, [api, room.id, target?.postId, target?.replyId,postFilter]);
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
    const page = parseWallData(await api.call<WallData>(`/${room.id}/wall?cursor=${encodeURIComponent(data.nextCursor)}${postFilter==='all'?'':`&type=${postFilter}`}`));
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
  const controls = (content: WallContent, reply: boolean) => !room.archived && !content.removedAt ? <div className={`p5-actions br-wall-controls${reply?' is-reply':''}`}>
    {content.canEdit ? <button aria-label={reply?'Editar respuesta':'Editar publicación'} title={reply?'Editar respuesta':'Editar publicación'} disabled={busy} onClick={() => setEditing({ content, reply })}><FoxmindIcon name="edit"/></button> : null}
    {content.canRemove ? <button aria-label={reply?'Eliminar respuesta':'Eliminar publicación'} title={reply?'Eliminar respuesta':'Eliminar publicación'} disabled={busy} onClick={() => setRemoving({ content, reply })}><FoxmindIcon name="trash"/></button> : null}
  </div> : null;
  return <section ref={root} className="p6-wall" aria-label="Muro del aula">
    <header className="p5-section-head cl-section"><div><h2>Muro</h2><p>Avisos y conversaciones que puede leer toda el aula.</p></div>
      <div className="p5-actions">{!room.archived ? <button className="primary" disabled={busy || !data} onClick={() => setComposing(true)}><FoxmindIcon name="plus"/>{room.role === 'teacher' ? 'Publicar aviso' : 'Hacer una consulta'}</button> : null}</div>
    </header>
    {error ? <Notice error>{error} Actualiza el Muro antes de volver a intentar. Tu texto no se ha descartado.<button disabled={busy} onClick={() => void run(async()=>{await Promise.all([reload(),load()]);})}>Actualizar Muro</button></Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!data && !error ? <Notice>Cargando Muro…</Notice> : null}
    <div className="cl-pills" role="group" aria-label="Filtrar publicaciones">{([['all','Todos'],['NOTICE','Avisos'],['QUERY','Consultas']] as const).map(([value,label]) => <button key={value} className={postFilter === value ? 'selected' : undefined} disabled={busy} aria-pressed={postFilter === value} onClick={() => setPostFilter(value)}>{label}</button>)}</div>
    <div className="classroom-wall-layout"><div className="classroom-wall-conversation">
    {!room.archived && data && composing ? <Dialog title={room.role === 'teacher' ? 'Publicar aviso' : 'Hacer una consulta'} onClose={() => { if (!busy) setComposing(false); }}><p>Visible para quienes forman parte de {room.name} · {room.division}.</p><TextForm key={composerKey} withTitle titleRequired busy={busy} label={room.role === 'teacher' ? 'Publicar aviso' : 'Publicar consulta'}
      onSave={(body,title) => run(async () => { await change({ action: 'publish', title: title || null, body }); setComposerKey(value => value + 1); setComposing(false); setNotice('Publicación guardada.'); })} /></Dialog> : null}
    {data?.posts.length === 0 ? <p className="p5-empty">Todavía no hay publicaciones.</p> : null}
    {data && target && !data.posts.some(post => post.id === target.postId) ? <Notice>La publicación ya no está disponible para tu cuenta.</Notice> : null}
    <div className="p6-wall-threads">{data?.posts.filter(post => postFilter === 'all' || (postFilter === 'NOTICE' ? post.type === 'NOTICE' : post.type !== 'NOTICE')).map((post: WallPost) => <article key={post.id} data-wall-id={post.id} tabIndex={-1}
      aria-label={post.type === 'NOTICE' ? 'Aviso del aula' : 'Consulta del aula'} data-editable={post.canEdit} data-post-type={post.type} className={target?.postId === post.id ? 'p6-wall-selected' : undefined}>
      <span className="p5-tag">{post.type === 'NOTICE' ? 'Aviso' : 'Consulta'}</span>
      <WallContentView content={post}>{controls(post, false)}</WallContentView>
      <section className="p6-wall-replies" aria-label="Respuestas de la publicación">
        <h3 className={!post.replyCount?'sr-only':undefined}>Respuestas ({post.replyCount})</h3>
        {post.repliesPreviousCursor ? <button disabled={busy} onClick={() => void run(() => moreReplies(post, 'previous'))}>Respuestas anteriores</button> : null}
        {post.replies.map(reply => <article key={reply.id} data-wall-id={reply.id} tabIndex={-1}
          className={target?.replyId === reply.id ? 'p6-wall-selected' : undefined}>
          <WallContentView content={reply}>{controls(reply, true)}</WallContentView>
        </article>)}
        {post.repliesNextCursor ? <button disabled={busy} onClick={() => void run(() => moreReplies(post, 'next'))}>Más respuestas</button> : null}
        {!room.archived && !post.removedAt ? replying === post.id ? <TextForm label="Enviar respuesta" busy={busy} onCancel={() => setReplying(null)}
          onSave={body => run(async () => { await change({ action: 'reply', postId: post.id, body }); setReplying(null); setNotice('Respuesta guardada.'); })} />
          : <button className="br-wall-reply" aria-label="Responder publicación" disabled={busy} onClick={() => setReplying(post.id)}><FoxmindIcon name="chat"/>Responder</button> : null}
      </section>
    </article>)}</div>
    {data?.nextCursor ? <button disabled={busy} onClick={() => void run(morePosts)}>Más publicaciones</button> : null}
    </div></div>
    {editing ? <Dialog title={editing.reply ? 'Editar respuesta' : 'Editar publicación'} onClose={() => { if (!busy) setEditing(null); }}>
      {error ? <Notice error>{error}</Notice> : null}
      <TextForm initial={editing.content.body ?? ''} withTitle={!editing.reply} initialTitle={'title' in editing.content && typeof editing.content.title === 'string' ? editing.content.title : ''} label="Guardar texto" busy={busy} onCancel={() => setEditing(null)} onSave={(body,title) => run(async () => {
        await change({ action: editing.reply ? 'editReply' : 'editPost', id: editing.content.id, body, ...(!editing.reply ? { title: title || null } : {}) }); setEditing(null); setNotice('Texto actualizado.');
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
