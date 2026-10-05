import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Sparkles, X, BrainCircuit, CheckCircle2, ArrowRight, 
  BookOpen, Layers, ShieldCheck, RefreshCw, Trophy
} from 'lucide-react';

interface QuickIntervencionModalProps {
  isOpen: boolean;
  initialSubject?: string;
  initialCourse?: string;
  onClose: () => void;
  onCompleted: (earnedPoints: number, actionName: string) => void;
}

export function QuickIntervencionModal({
  isOpen,
  initialSubject = 'Biología',
  initialCourse = '4° A',
  onClose,
  onCompleted
}: QuickIntervencionModalProps) {
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedFormat, setSelectedFormat] = useState<'flash_quiz' | 'dua_card' | 'rubric_guide'>('flash_quiz');
  const [difficultyLevel, setDifficultyLevel] = useState<'nivelacion' | 'intermedio' | 'profundizacion'>('intermedio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedSuccess(true);
    }, 1600);
  };

  const handleConfirmAndClose = () => {
    const points = selectedFormat === 'dua_card' ? 75 : 60;
    const formatName = selectedFormat === 'flash_quiz' 
      ? 'Quiz Rápido de Active Recall' 
      : selectedFormat === 'dua_card' 
      ? 'Guía Adaptada DUA' 
      : 'Rúbrica Visual Paso a Paso';

    onCompleted(points, `${formatName} en ${selectedSubject}`);
    setGeneratedSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-fox-border flex justify-between items-center bg-fox-bg/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-fox-gold/15 text-fox-gold border border-fox-gold/30 flex items-center justify-center shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-fox-text-main text-lg">
                  Intervención Exprés con Foxy
                </h3>
                <span className="bg-fox-gold/20 text-fox-gold border border-fox-gold/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  IA Generativa
                </span>
              </div>
              <p className="text-xs text-fox-text-muted mt-0.5">
                Crea en segundos un recurso adaptativo para tu próxima clase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-fox-text-muted hover:text-fox-text-main bg-fox-surface rounded-full p-2 border border-fox-border transition-colors shadow-2xs cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {!generatedSuccess ? (
            <>
              {/* Select Aula */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                  Aula Destino
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Biología 4° A', 'Física 5° B', 'Química 4° B', 'Ciencias de la Tierra 6° A'].map((name) => {
                    const subj = name.split(' ')[0];
                    const isSelected = selectedSubject.includes(subj);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedSubject(name)}
                        className={`p-2.5 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-fox-primary bg-fox-primary/10 text-fox-primary shadow-xs'
                            : 'border-fox-border bg-fox-bg/50 text-fox-text-muted hover:border-fox-border/80 hover:text-fox-text-main'
                        }`}
                      >
                        <div className="truncate">{name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resource Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                  Tipo de Recurso Adaptativo
                </label>
                <div className="space-y-2.5">
                  {[
                    {
                      id: 'flash_quiz',
                      title: 'Quiz de Active Recall (3 preguntas)',
                      desc: 'Refuerzo de fijación conceptual para arrancar o cerrar la clase.'
                    },
                    {
                      id: 'dua_card',
                      title: 'Tarjeta de Adaptación DUA Multinivel',
                      desc: 'Consigna con apoyos visuales y opción oral para alumnos con dificultades.'
                    },
                    {
                      id: 'rubric_guide',
                      title: 'Rúbrica Visual Guiada con Checklist',
                      desc: 'Paso a paso explícito para proyectos y trabajos prácticos complejos.'
                    }
                  ].map(format => (
                    <div
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id as any)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedFormat === format.id
                          ? 'border-fox-primary bg-fox-primary/5 shadow-xs'
                          : 'border-fox-border bg-fox-bg/30 hover:border-fox-border/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-fox-text-main">{format.title}</span>
                        {selectedFormat === format.id && <CheckCircle2 size={16} className="text-fox-primary" />}
                      </div>
                      <p className="text-[11px] text-fox-text-muted mt-0.5 leading-relaxed">{format.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                  Enfoque Pedagógico
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'nivelacion', label: '🌱 Nivelación' },
                    { id: 'intermedio', label: '⚡ Estándar' },
                    { id: 'profundizacion', label: '🚀 Profundización' },
                  ].map(diff => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setDifficultyLevel(diff.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        difficultyLevel === diff.id
                          ? 'border-fox-primary bg-fox-primary text-white shadow-xs'
                          : 'border-fox-border bg-fox-bg/50 text-fox-text-muted hover:text-fox-text-main'
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerate}
                  className="w-full bg-fox-primary hover:bg-fox-primary/90 text-white py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Foxy está estructurando el contenido...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generar con IA (+60 XP)</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-fox-green/15 text-fox-green border border-fox-green/30 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h4 className="font-heading font-bold text-fox-text-main text-lg">
                  ¡Recurso Generado con Éxito!
                </h4>
                <p className="text-xs text-fox-text-muted mt-1 max-w-sm mx-auto">
                  La actividad adaptativa fue vinculada a <strong>{selectedSubject}</strong> y está lista para compartirse en el Muro del aula.
                </p>
              </div>

              <div className="p-4 bg-fox-bg/70 border border-fox-border rounded-2xl text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-fox-primary font-bold">
                  <span>Plantilla Pedagógica Foxy DUA</span>
                  <span className="text-fox-gold flex items-center gap-1"><Trophy size={13} /> +60 XP</span>
                </div>
                <p className="text-fox-text-main font-medium">
                  3 consignas formativas con andamiaje cognitivo e instrucciones visuales claras.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleConfirmAndClose}
                  className="w-full bg-fox-green hover:bg-fox-green/90 text-white py-3 rounded-2xl text-sm font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Aceptar y Publicar en Aula
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
