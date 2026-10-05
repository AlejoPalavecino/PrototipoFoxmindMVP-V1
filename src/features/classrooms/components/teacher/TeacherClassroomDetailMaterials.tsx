import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, Upload, LayoutList } from 'lucide-react';
import type { TeacherClassroomDetailController } from '../../hooks/useTeacherClassroomDetail';

// Preserve the existing plan/upload presence boundaries and dormant upload entry.
export function TeacherClassroomDetailMaterials({ detail }: { detail: TeacherClassroomDetailController }) {
  const { isPlanModalOpen, setIsPlanModalOpen, isUploadModalOpen, setIsUploadModalOpen,
    newFileTitle, setNewFileTitle, newFileType, setNewFileType, handleUploadFile } = detail;
  return (
    <>
      {/* Plan de Estudios PDF Modal */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]"
            >
              <div className="p-5 border-b border-fox-border flex justify-between items-center bg-fox-bg/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-fox-text-main text-lg">plan_de_estudios_anual.pdf</h3>
                    <p className="text-xs text-fox-text-muted font-medium">Cargado el 12 de Mayo, 2026</p>
                  </div>
                </div>
                <button onClick={() => setIsPlanModalOpen(false)} className="text-fox-text-muted hover:text-fox-text-main bg-fox-surface rounded-full p-2 shadow-sm border border-fox-border transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 bg-gray-100/50 p-6 overflow-y-auto flex items-center justify-center">
                <div className="w-full max-w-3xl bg-white shadow-md rounded-xl aspect-[1/1.4] border border-gray-200 p-12 flex items-center justify-center text-center">
                  <div>
                    <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-heading font-bold text-gray-400 mb-2">Visor PDF Original</h3>
                    <p className="text-gray-400 max-w-sm mx-auto font-medium">Aquí se mostraría el archivo PDF original subido por el docente con el plan de estudios, sin la interpretación de la IA.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Library Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[60] flex justify-center items-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FBFDFF] w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-heading font-extrabold text-fox-text-main flex items-center gap-2">
                  <Upload size={24} className="text-fox-primary" /> Subir Material
                </h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-fox-text-muted hover:text-fox-text-main transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Título del Material</label>
                <input
                  type="text"
                  placeholder="Ej. Guía de Estudio Completa"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  className="w-full p-3 border border-fox-border rounded-xl text-sm focus:outline-none focus:border-fox-primary focus:ring-1 focus:ring-fox-primary transition-all text-fox-text-main font-medium"
                />
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Tipo de Archivo</label>
                <div className="grid grid-cols-3 gap-3">
                  {['PDF', 'PPTX', 'DOCX', 'LINK'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewFileType(type)}
                      className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2 ${newFileType === type ? 'border-fox-primary text-fox-primary bg-fox-primary/5' : 'border-fox-border text-fox-text-muted hover:border-fox-primary/30'}`}
                    >
                      {type === 'PDF' && <FileText size={16} />}
                      {type === 'PPTX' && <LayoutList size={16} />}
                      {type === 'DOCX' && <FileText size={16} />}
                      {type === 'LINK' && <Upload size={16} />}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-2 border-dashed border-fox-border rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-fox-bg/50 mb-6 group cursor-pointer hover:border-fox-primary/50 transition-colors">
                 <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-fox-border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                   <Upload size={20} className="text-fox-primary" />
                 </div>
                 <span className="text-sm font-bold text-fox-text-main group-hover:text-fox-primary transition-colors">Arrastra tu archivo aquí</span>
                 <span className="text-xs font-medium text-fox-text-muted mt-1">o haz clic para buscar en tu PC</span>
                 <span className="text-[10px] font-bold text-fox-text-muted/60 uppercase tracking-widest mt-3">Max 50 MB</span>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-fox-text-muted hover:bg-fox-bg transition-colors"
                 >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadFile}
                  className="flex items-center gap-2 bg-fox-primary hover:bg-fox-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
                >
                  Subir Archivo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
