import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  FileText, 
  CheckCircle2, 
  Circle, 
  X, 
  Upload, 
  Users, 
  Layers, 
  Sparkles, 
  Info,
  BookOpen,
  FileCheck,
  ChevronRight,
  Plus
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { AulaContextKnowledge, AulaContextFile } from './copilotoTypes';

interface CopilotoContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: AulaContextKnowledge | null;
  onToggleFile: (fileId: string) => void;
  onAddCustomFile: (file: AulaContextFile) => void;
}

export const CopilotoContextDrawer: React.FC<CopilotoContextDrawerProps> = ({
  isOpen,
  onClose,
  contextData,
  onToggleFile,
  onAddCustomFile,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'curriculum' | 'dua'>('files');
  const [isUploading, setIsUploading] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileCategory, setNewFileCategory] = useState('Material Complementario');

  if (!isOpen || !contextData) return null;

  const activeFilesCount = contextData.files.filter(f => f.activeInContext).length;

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const newFile: AulaContextFile = {
      id: `custom-f-${Date.now()}`,
      name: newFileName.trim().endsWith('.pdf') ? newFileName.trim() : `${newFileName.trim()}.pdf`,
      type: 'PDF',
      size: '1.5 MB',
      category: newFileCategory,
      uploadDate: 'Hoy',
      activeInContext: true,
    };

    onAddCustomFile(newFile);
    setNewFileName('');
    setIsUploading(false);
    toast.show(`Archivo "${newFile.name}" añadido al contexto activo de Foxy IA`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-fox-surface border-l border-fox-border w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-fox-border bg-fox-bg/70 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold">
                <Database size={20} />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-fox-text-main text-lg">
                  Base de Conocimiento del Aula
                </h3>
                <p className="text-xs text-fox-text-muted">
                  {contextData.subject} {contextData.course} • Contexto Pedagógico Activo
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

          {/* Context Stats Pill */}
          <div className="bg-fox-surface border border-fox-border rounded-2xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-fox-text-main">
                {activeFilesCount} de {contextData.files.length} archivos activos
              </span>
            </div>
            <span className="text-fox-text-muted text-[11px]">
              Foxy analiza estos documentos en cada respuesta
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 mt-4 bg-fox-bg p-1 rounded-xl border border-fox-border">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'files'
                  ? 'bg-fox-surface text-fox-primary shadow-xs'
                  : 'text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              <FileText size={14} />
              <span>Archivos ({contextData.files.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'curriculum'
                  ? 'bg-fox-surface text-fox-primary shadow-xs'
                  : 'text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              <Layers size={14} />
              <span>Currícula ({contextData.curriculumUnits.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('dua')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'dua'
                  ? 'bg-fox-surface text-fox-primary shadow-xs'
                  : 'text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              <Users size={14} />
              <span>Perfiles DUA ({contextData.duaStudents.length})</span>
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: FILES LIST */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider">
                  Documentos de la Biblioteca Escolar
                </span>
                <button
                  onClick={() => setIsUploading(!isUploading)}
                  className="text-xs font-bold text-fox-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> {isUploading ? 'Cancelar' : 'Añadir Archivo'}
                </button>
              </div>

              {/* Upload form accordion */}
              {isUploading && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleUploadFile}
                  className="bg-fox-bg border border-fox-border rounded-2xl p-4 space-y-3"
                >
                  <h4 className="text-xs font-bold text-fox-text-main flex items-center gap-1.5">
                    <Upload size={14} className="text-fox-primary" /> Vincular Nuevo Documento
                  </h4>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del documento (ej: Unidad_3_Lecturas.pdf)"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full bg-fox-surface border border-fox-border rounded-xl px-3 py-2 text-xs text-fox-text-main outline-none focus:border-fox-primary"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newFileCategory}
                      onChange={(e) => setNewFileCategory(e.target.value)}
                      className="flex-1 bg-fox-surface border border-fox-border rounded-xl px-3 py-2 text-xs text-fox-text-main outline-none"
                    >
                      <option value="Material Complementario">Material Complementario</option>
                      <option value="Guía Teórica">Guía Teórica</option>
                      <option value="Evaluaciones Previas">Evaluaciones Previas</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-fox-primary text-white rounded-xl text-xs font-bold hover:bg-fox-primary/90 transition-colors shrink-0"
                    >
                      Añadir
                    </button>
                  </div>
                </motion.form>
              )}

              {/* File list items */}
              <div className="space-y-2.5">
                {contextData.files.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      file.activeInContext
                        ? 'bg-fox-surface border-fox-border hover:border-fox-primary/40 shadow-xs'
                        : 'bg-fox-bg/50 border-fox-border/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl text-xs font-bold uppercase ${
                        file.type === 'PDF' ? 'bg-rose-100 text-rose-700' :
                        file.type === 'DOCX' ? 'bg-blue-100 text-blue-700' :
                        file.type === 'PPTX' ? 'bg-amber-100 text-amber-700' :
                        'bg-fox-bg text-fox-text-muted'
                      }`}>
                        {file.type}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-fox-text-main truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-fox-text-muted truncate">
                          {file.category} • {file.size} • Subido {file.uploadDate}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => onToggleFile(file.id)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                        file.activeInContext
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-fox-text-muted hover:bg-fox-border/40'
                      }`}
                      title={file.activeInContext ? 'Desactivar del contexto' : 'Activar en contexto'}
                    >
                      {file.activeInContext ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CURRICULUM UNITS */}
          {activeTab === 'curriculum' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider block">
                Planificación Curricular del Ciclo Lectivo
              </span>

              <div className="space-y-3">
                {contextData.curriculumUnits.map((u, idx) => (
                  <div key={idx} className="bg-fox-surface border border-fox-border rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-fox-text-main">
                        {u.unit}
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        u.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        u.status === 'current' ? 'bg-fox-primary/10 text-fox-primary animate-pulse' :
                        'bg-fox-bg text-fox-text-muted'
                      }`}>
                        {u.status === 'completed' ? 'Completada' : u.status === 'current' ? 'En Curso' : 'Pendiente'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {u.topics.map((topic, tidx) => (
                        <span key={tidx} className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-fox-bg border border-fox-border text-fox-text-muted">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DUA STUDENT PROFILES */}
          {activeTab === 'dua' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider block">
                Acompañamiento a la Diversidad (DUA)
              </span>

              <div className="space-y-3">
                {contextData.duaStudents.map((st, idx) => (
                  <div key={idx} className="bg-fox-surface border border-fox-border rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-fox-purple/15 text-fox-purple font-bold flex items-center justify-center text-xs">
                          {st.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-fox-text-main">{st.name}</h4>
                          <div className="flex gap-1 mt-0.5">
                            {st.dua.map((d, didx) => (
                              <span key={didx} className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 text-purple-700">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {st.recommendationNote && (
                      <div className="bg-fox-bg border border-fox-border/80 rounded-xl p-3 text-xs text-fox-text-muted leading-relaxed">
                        <span className="font-bold text-fox-purple block mb-0.5">Pauta Pedagógica Adaptativa:</span>
                        {st.recommendationNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-fox-border bg-fox-bg/70 shrink-0 flex items-center justify-between">
          <p className="text-[11px] text-fox-text-muted">
            Los cambios se aplican automáticamente a las consultas de Foxy.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-fox-primary text-white rounded-xl text-xs font-bold hover:bg-fox-primary/90 transition-colors"
          >
            Listo
          </button>
        </div>
      </motion.div>
    </div>
  );
};
