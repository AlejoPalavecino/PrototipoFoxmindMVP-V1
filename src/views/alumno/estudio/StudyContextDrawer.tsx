import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  FileText, 
  CheckCircle2, 
  Circle, 
  X, 
  Upload, 
  Layers, 
  Sparkles, 
  BookOpen, 
  Plus, 
  Check, 
  FileCheck,
  Target,
  Clock
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudyFolder, StudyFolderTopic } from '../../../types';

interface StudyContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  folder: StudyFolder;
  onToggleFileIndex?: (fileId: string) => void;
  onAddNote?: (note: string) => void;
}

export const StudyContextDrawer: React.FC<StudyContextDrawerProps> = ({
  isOpen,
  onClose,
  folder,
  onToggleFileIndex,
  onAddNote
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'topics' | 'notes'>('files');
  const [newNoteText, setNewNoteText] = useState('');
  const [notesList, setNotesList] = useState<string[]>([
    'Enfocarse en autores del siglo XX y metáforas en el vanguardismo.',
    'Repasar las diferencias clave entre Creacionismo y Ultraísmo para el parcial.'
  ]);

  if (!isOpen) return null;

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setNotesList([...notesList, newNoteText.trim()]);
    if (onAddNote) onAddNote(newNoteText.trim());
    setNewNoteText('');
    toast.show('Nota personal de estudio añadida', 'success');
  };

  const defaultFiles = folder.files || [
    { name: `Apuntes_${folder.name.replace(/\s+/g, '_')}.pdf`, size: '2.4 MB', type: 'PDF' },
    { name: 'Guia_Ejercicios_Tipo_Examen.pdf', size: '1.1 MB', type: 'PDF' },
    { name: 'Resumen_Clase_Unidad1.pdf', size: '3.8 MB', type: 'PDF' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-fox-surface border-l border-fox-border h-full flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-fox-border bg-fox-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fox-purple/10 text-fox-purple flex items-center justify-center font-bold">
              <Folder size={20} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-fox-text-main text-base">
                Contexto de la Carpeta
              </h3>
              <p className="text-xs text-fox-text-muted line-clamp-1">
                {folder.name} • Base de Conocimiento IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="p-2 border-b border-fox-border bg-fox-bg/40 flex gap-1">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'files' ? 'bg-fox-surface text-fox-purple shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <FileText size={14} />
            <span>Archivos ({defaultFiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'topics' ? 'bg-fox-surface text-fox-purple shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Layers size={14} />
            <span>Unidades ({folder.topics?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'notes' ? 'bg-fox-surface text-fox-purple shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <BookOpen size={14} />
            <span>Apuntes</span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'files' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-fox-text-muted">
                <span>Documentos indexados en RAG</span>
                <span className="text-fox-purple">Activos en consultas</span>
              </div>

              {defaultFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-fox-border bg-fox-bg/50 hover:bg-fox-bg transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center shrink-0">
                      <FileCheck size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs text-fox-text-main truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-fox-text-muted">
                        {file.size} • Indexado para Active Recall
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Indexado
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'topics' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-fox-text-muted">
                Temas identificados por la IA
              </div>

              {folder.topics && folder.topics.length > 0 ? (
                folder.topics.map((topic, idx) => (
                  <div
                    key={topic.id || idx}
                    className="p-4 rounded-2xl border border-fox-border bg-fox-bg/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading font-bold text-xs text-fox-text-main">
                        {topic.name}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fox-purple/10 text-fox-purple">
                        {topic.masteryLevel || 75}% Dominio
                      </span>
                    </div>

                    {topic.subtopics && topic.subtopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {topic.subtopics.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-fox-surface border border-fox-border text-fox-text-muted"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-fox-text-muted">
                  No hay temas extraídos todavía.
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNoteSubmit} className="space-y-2">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Escribir una nota rápida para Foxy..."
                  rows={2}
                  className="w-full bg-fox-bg border border-fox-border rounded-xl p-3 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:border-fox-purple resize-none"
                />
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="w-full py-2 bg-fox-purple text-white rounded-xl text-xs font-bold hover:bg-fox-purple/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Añadir Nota
                </button>
              </form>

              <div className="space-y-2">
                {notesList.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-fox-bg/60 border border-fox-border rounded-xl text-xs text-fox-text-main leading-relaxed"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
