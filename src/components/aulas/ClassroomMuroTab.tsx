import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Pin, 
  Heart, 
  MessageCircle, 
  Sparkles, 
  Paperclip, 
  FileText, 
  BrainCircuit, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  Download,
  Share2
} from 'lucide-react';
import { MuroPost, MuroComment } from '../../types';
import { sharedMuroPosts, updateSharedMuroPosts } from '../../mockData';

interface ClassroomMuroTabProps {
  role: 'docente' | 'alumno';
  subjectName?: string;
  courseName?: string;
  aulaId?: string | number;
  onOpenCopilot?: () => void;
}

export const ClassroomMuroTab: React.FC<ClassroomMuroTabProps> = ({
  role,
  subjectName = 'Materia',
  courseName = 'Curso',
  aulaId,
  onOpenCopilot
}) => {
  const [posts, setPosts] = useState<MuroPost[]>(sharedMuroPosts);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'announcements' | 'doubts'>('all');

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newPost: MuroPost = {
      id: `post-${Date.now()}`,
      authorName: role === 'docente' ? 'Profa. Martínez' : 'Valentina Gómez',
      authorRole: role,
      timestamp: 'Justo ahora',
      title: newTitle.trim() || undefined,
      content: newContent.trim(),
      isPinned: role === 'docente' ? isPinned : false,
      type: role === 'docente' ? 'announcement' : 'doubt',
      attachment: attachedFile || undefined,
      likesCount: 0,
      isLiked: false,
      comments: []
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    updateSharedMuroPosts(updated);

    setNewTitle('');
    setNewContent('');
    setIsPinned(false);
    setAttachedFile(null);
  };

  const handleLikePost = (postId: string) => {
    const updated = posts.map(post => {
      if (post.id === postId) {
        const isLiked = !post.isLiked;
        return {
          ...post,
          isLiked,
          likesCount: isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1)
        };
      }
      return post;
    });
    setPosts(updated);
    updateSharedMuroPosts(updated);
  };

  const handleAddComment = (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    const newComment: MuroComment = {
      id: `c-${Date.now()}`,
      authorName: role === 'docente' ? 'Profa. Martínez' : 'Valentina Gómez',
      authorRole: role,
      timestamp: 'Justo ahora',
      content: text
    };

    const updated = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    });

    setPosts(updated);
    updateSharedMuroPosts(updated);
    setCommentText(prev => ({ ...prev, [postId]: '' }));
  };

  const handleAiDraftNotice = () => {
    setIsGeneratingWithAi(true);
    setTimeout(() => {
      setNewTitle('📌 Recordatorio de Actividad y Guía de Consulta');
      setNewContent(
        `Hola a todos: Les recuerdo que la fecha límite para subir la actividad de ${subjectName} es este viernes a las 23:59. Recuerden revisar la rúbrica y consultar la Biblioteca si necesitan material de apoyo. ¡Muchos éxitos en la producción!`
      );
      setAttachedFile({ name: 'Rubrica_Evaluacion.pdf', size: '1.4 MB', type: 'PDF' });
      setIsGeneratingWithAi(false);
    }, 900);
  };

  const filteredPosts = posts.filter(p => {
    if (filterType === 'announcements') return p.type === 'announcement' || p.isPinned;
    if (filterType === 'doubts') return p.type === 'doubt';
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      
      {/* Top Banner / Composer Card */}
      <div className="bg-fox-surface border border-fox-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
            role === 'docente' ? 'bg-fox-primary' : 'bg-gradient-to-tr from-fox-purple to-indigo-600'
          }`}>
            {role === 'docente' ? 'P' : 'V'}
          </div>

          <div className="flex-1 min-w-0">
            <form onSubmit={handleCreatePost} className="space-y-3">
              {role === 'docente' && (
                <input
                  type="text"
                  placeholder="Título del anuncio o aviso (opcional)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-fox-bg/70 border border-fox-border/80 rounded-xl px-4 py-2 text-sm font-bold text-fox-text-main placeholder:text-fox-text-muted/60 focus:bg-fox-surface focus:border-fox-primary focus:ring-1 focus:ring-fox-primary outline-none transition-all"
                />
              )}

              <textarea
                placeholder={
                  role === 'docente'
                    ? `Publicar un anuncio o aviso para toda la clase de ${subjectName}...`
                    : 'Escribe una pregunta o mensaje público para tus compañeros o docente...'
                }
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                className="w-full bg-fox-bg/70 border border-fox-border/80 rounded-xl p-3.5 text-sm text-fox-text-main placeholder:text-fox-text-muted/60 focus:bg-fox-surface focus:border-fox-primary focus:ring-1 focus:ring-fox-primary outline-none resize-none transition-all"
              />

              {attachedFile && (
                <div className="flex items-center justify-between p-2.5 bg-fox-bg border border-fox-border rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-fox-text-main font-semibold">
                    <FileText size={16} className="text-fox-primary" />
                    <span>{attachedFile.name} ({attachedFile.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-red-500 hover:text-red-700 font-bold px-2 py-0.5"
                  >
                    Quitar
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-fox-border/50">
                <div className="flex items-center gap-2">
                  {role === 'docente' && (
                    <button
                      type="button"
                      onClick={handleAiDraftNotice}
                      disabled={isGeneratingWithAi}
                      className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Redactar anuncio pedagógico con Foxy"
                    >
                      <Sparkles size={14} className={isGeneratingWithAi ? 'animate-spin' : ''} />
                      <span>{isGeneratingWithAi ? 'Generando...' : 'Redactar con Foxy'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setAttachedFile({ name: 'Recurso_Clase_Semana.pdf', size: '2.1 MB', type: 'PDF' })}
                    className="p-2 text-fox-text-muted hover:text-fox-primary hover:bg-fox-bg rounded-lg transition-colors"
                    title="Adjuntar archivo o guía"
                  >
                    <Paperclip size={17} />
                  </button>

                  {role === 'docente' && (
                    <label className="flex items-center gap-1.5 text-xs text-fox-text-muted hover:text-fox-text-main cursor-pointer select-none font-medium ml-1">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="rounded text-fox-primary focus:ring-fox-primary"
                      />
                      <span>Fijar arriba</span>
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="px-5 py-2 bg-fox-primary hover:bg-fox-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send size={15} />
                  <span>Publicar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Filter and stats row */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-1.5 bg-fox-bg p-1 rounded-xl border border-fox-border">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'all' ? 'bg-fox-surface text-fox-primary shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Todos ({posts.length})
          </button>
          <button
            onClick={() => setFilterType('announcements')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'announcements' ? 'bg-fox-surface text-fox-primary shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Anuncios
          </button>
          <button
            onClick={() => setFilterType('doubts')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'doubts' ? 'bg-fox-surface text-fox-primary shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Consultas
          </button>
        </div>

        <span className="text-xs text-fox-text-muted font-medium">
          Muro sincronizado en tiempo real
        </span>
      </div>

      {/* Posts Stream */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isDocente = post.authorRole === 'docente';
          const isFoxy = post.authorRole === 'foxy';
          const isCommentsOpen = activeCommentPostId === post.id;

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-fox-surface border rounded-2xl p-5 sm:p-6 shadow-xs transition-all ${
                post.isPinned
                  ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/20 to-fox-surface'
                  : 'border-fox-border hover:border-fox-primary/30'
              }`}
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-2xs ${
                    isFoxy
                      ? 'bg-gradient-to-tr from-fox-purple to-pink-500'
                      : isDocente
                      ? 'bg-fox-primary'
                      : 'bg-emerald-600'
                  }`}>
                    {isFoxy ? <BrainCircuit size={20} /> : post.authorName.charAt(0)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-fox-text-main">
                        {post.authorName}
                      </h4>
                      {isDocente && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-fox-primary/10 text-fox-primary flex items-center gap-1">
                          <ShieldCheck size={11} /> Docente
                        </span>
                      )}
                      {isFoxy && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-700 flex items-center gap-1">
                          <Sparkles size={11} /> IA Copiloto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-fox-text-muted flex items-center gap-1 mt-0.5">
                      <Clock size={12} className="opacity-70" />
                      {post.timestamp}
                    </p>
                  </div>
                </div>

                {post.isPinned && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                    <Pin size={12} className="fill-amber-700" /> Fijado
                  </span>
                )}
              </div>

              {/* Post Content */}
              {post.title && (
                <h3 className="font-heading font-bold text-fox-text-main text-base sm:text-lg mb-2">
                  {post.title}
                </h3>
              )}

              <p className="text-sm text-fox-text-main/90 whitespace-pre-line leading-relaxed mb-4">
                {post.content}
              </p>

              {/* Attachment if present */}
              {post.attachment && (
                <div className="mb-4 p-3 rounded-xl bg-fox-bg border border-fox-border flex items-center justify-between gap-3 hover:border-fox-primary/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-red-100 text-red-700">
                      <FileText size={18} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-fox-text-main truncate">
                        {post.attachment.name}
                      </p>
                      <p className="text-[11px] text-fox-text-muted">
                        {post.attachment.type} • {post.attachment.size}
                      </p>
                    </div>
                  </div>

                  <button
                    className="p-2 text-fox-text-muted hover:text-fox-primary hover:bg-fox-surface rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shrink-0"
                    title="Descargar archivo adjunto"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">Descargar</span>
                  </button>
                </div>
              )}

              {/* Post Footer / Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-fox-border/60 text-xs font-bold">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      post.isLiked
                        ? 'bg-rose-50 text-rose-600'
                        : 'text-fox-text-muted hover:text-rose-600 hover:bg-rose-50/50'
                    }`}
                  >
                    <Heart size={16} className={post.isLiked ? 'fill-rose-600' : ''} />
                    <span>{post.likesCount}</span>
                  </button>

                  <button
                    onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      isCommentsOpen
                        ? 'bg-fox-primary/10 text-fox-primary'
                        : 'text-fox-text-muted hover:text-fox-primary hover:bg-fox-bg'
                    }`}
                  >
                    <MessageCircle size={16} />
                    <span>{post.comments.length} comentarios</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveCommentPostId(post.id)}
                  className="text-fox-primary hover:underline text-xs font-bold"
                >
                  Responder
                </button>
              </div>

              {/* Expandable Comments Section */}
              <AnimatePresence>
                {isCommentsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-fox-border/60 space-y-3"
                  >
                    {/* Existing comments */}
                    {post.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-start gap-3 bg-fox-bg/70 rounded-xl p-3 border border-fox-border/50 text-xs"
                      >
                        <div className="w-7 h-7 rounded-lg bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {comment.authorName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-fox-text-main">
                              {comment.authorName}
                            </span>
                            <span className="text-[10px] text-fox-text-muted">
                              {comment.timestamp}
                            </span>
                          </div>
                          <p className="text-fox-text-main/90 mt-1 leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* New comment input */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Escribe una respuesta para el hilo..."
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-3.5 py-2 text-xs text-fox-text-main focus:bg-fox-surface focus:border-fox-primary outline-none transition-all"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentText[post.id]?.trim()}
                        className="px-3.5 py-2 bg-fox-primary hover:bg-fox-primary/90 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
                      >
                        Enviar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
