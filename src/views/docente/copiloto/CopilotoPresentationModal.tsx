import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Presentation, 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  FileText, 
  Send,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { SlideItem } from './copilotoTypes';

interface CopilotoPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  slides: SlideItem[];
  onAssignToAula?: () => void;
}

export const CopilotoPresentationModal: React.FC<CopilotoPresentationModalProps> = ({
  isOpen,
  onClose,
  title,
  slides,
  onAssignToAula,
}) => {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [showPresenterNotes, setShowPresenterNotes] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  if (!isOpen) return null;

  const currentSlide = slides[currentSlideIdx] || slides[0];

  const handleNext = () => {
    if (currentSlideIdx < slides.length - 1) {
      setCurrentSlideIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIdx > 0) {
      setCurrentSlideIdx(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full ${
          isPresentationMode ? 'max-w-[98vw] h-[96vh]' : 'max-w-5xl h-[88vh]'
        } flex flex-col overflow-hidden transition-all duration-300`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-fox-border bg-fox-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Presentation size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg truncate max-w-md">
                  {title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-700 border border-amber-500/20">
                  {slides.length} Diapositivas
                </span>
              </div>
              <p className="text-xs text-fox-text-muted">
                Diapositiva {currentSlideIdx + 1} de {slides.length} • {currentSlide?.visualTag || 'Contenido'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPresentationMode(!isPresentationMode)}
              className={`p-2 rounded-xl border border-fox-border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                isPresentationMode ? 'bg-amber-500 text-white' : 'text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg'
              }`}
              title={isPresentationMode ? 'Salir de pantalla completa' : 'Modo Presentación'}
            >
              {isPresentationMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span className="hidden sm:inline">{isPresentationMode ? 'Salir' : 'Presentar'}</span>
            </button>

            {onAssignToAula && (
              <button
                onClick={onAssignToAula}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-fox-primary text-white text-xs font-bold hover:bg-fox-primary/90 transition-all shadow-xs"
              >
                <Send size={14} /> Asignar al Aula
              </button>
            )}

            <button
              onClick={() => toast.show('Descargando presentación en formato editable (.PPTX)...', 'success')}
              className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg transition-colors"
              title="Descargar PowerPoint"
            >
              <Download size={18} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Presentation Stage */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Main Slide Screen */}
          <div className="flex-1 bg-neutral-900 p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-y-auto select-none">
            
            {/* Slide Card Container (16:9 aspect) */}
            <motion.div
              key={currentSlide?.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl text-white flex flex-col justify-between relative overflow-hidden"
            >
              {/* Slide Background Subtle Accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

              {/* Top Slide Tag */}
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-black px-2.5 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full">
                  {currentSlide?.visualTag || 'FoxMind Educational Deck'}
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  {currentSlideIdx + 1} / {slides.length}
                </span>
              </div>

              {/* Slide Titles & Bullets */}
              <div className="my-auto py-3 z-10 space-y-4">
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-black text-white leading-tight">
                    {currentSlide?.title}
                  </h2>
                  {currentSlide?.subtitle && (
                    <p className="text-xs sm:text-sm text-amber-200/90 font-medium mt-1">
                      {currentSlide.subtitle}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 pt-2">
                  {currentSlide?.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Footer */}
              <div className="flex items-center justify-between border-t border-slate-700/60 pt-3 z-10 text-[10px] text-slate-400">
                <span>FoxMind Copiloto Pedagógico</span>
                <span>Profa. Laura Martínez</span>
              </div>
            </motion.div>

            {/* Slide Navigation Controls */}
            <div className="flex items-center justify-center gap-4 mt-6 z-20">
              <button
                onClick={handlePrev}
                disabled={currentSlideIdx === 0}
                className="p-2.5 rounded-2xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Diapositiva anterior"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Slide Indicator Dots */}
              <div className="flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIdx(idx)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlideIdx === idx ? 'w-6 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={currentSlideIdx === slides.length - 1}
                className="p-2.5 rounded-2xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Siguiente diapositiva"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Presenter Notes & Slide Carousel Sidebar */}
          {!isPresentationMode && (
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-fox-border bg-fox-surface p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-amber-600" /> Notas para el Docente
                  </span>
                  <button
                    onClick={() => setShowPresenterNotes(!showPresenterNotes)}
                    className="text-[11px] font-semibold text-fox-primary hover:underline"
                  >
                    {showPresenterNotes ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                {showPresenterNotes && (
                  <div className="bg-amber-50/70 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs leading-relaxed space-y-2">
                    <p className="font-bold flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-600" /> Sugerencia Didáctica:
                    </p>
                    <p className="text-amber-950/85">
                      {currentSlide?.notes || 'Promover el debate socrático con preguntas de indagación y vincular el concepto con las lecturas de la biblioteca.'}
                    </p>
                  </div>
                )}

                {/* Slides Thumbnails List */}
                <div>
                  <h5 className="text-xs font-bold text-fox-text-main mb-2">Todas las Diapositivas</h5>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {slides.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => setCurrentSlideIdx(idx)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex items-center gap-2.5 ${
                          currentSlideIdx === idx 
                            ? 'bg-amber-500/10 border-amber-400 text-amber-900 font-bold shadow-xs'
                            : 'bg-fox-bg border-fox-border text-fox-text-muted hover:border-amber-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-lg bg-fox-surface border border-fox-border flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-fox-border">
                <button
                  onClick={() => toast.show('Iniciando temporizador de clase (45 min)...', 'info')}
                  className="w-full py-2 rounded-xl border border-fox-border hover:bg-fox-bg text-xs font-bold text-fox-text-main transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play size={14} /> Iniciar Clase Guiada
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
