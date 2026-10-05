import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Brain, 
  FileText, 
  Network, 
  Target, 
  BookOpen, 
  X, 
  Sparkles, 
  Check, 
  Sliders,
  ChevronDown
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudyToolType } from './estudioTypes';
import { StudyFolderTopic } from '../../../types';

interface StudyToolGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultToolType?: StudyToolType;
  folderName: string;
  topics?: StudyFolderTopic[];
  onGenerate: (config: {
    toolType: StudyToolType;
    topic: string;
    difficulty: string;
    count: number;
    instructions: string;
  }) => void;
}

export const StudyToolGenerateModal: React.FC<StudyToolGenerateModalProps> = ({
  isOpen,
  onClose,
  defaultToolType = 'flashcards',
  folderName,
  topics = [],
  onGenerate
}) => {
  const [selectedTool, setSelectedTool] = useState<StudyToolType>(defaultToolType || 'flashcards');
  const [selectedTopic, setSelectedTopic] = useState<string>(topics[0]?.name || 'Todo el material de la carpeta');
  const [difficulty, setDifficulty] = useState<'facil' | 'intermedio' | 'dificil'>('intermedio');
  const [itemCount, setItemCount] = useState<number>(10);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const toolsList: Array<{ id: StudyToolType; label: string; icon: any; color: string; desc: string }> = [
    { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'text-fox-purple bg-fox-purple/10 border-fox-purple/30', desc: 'Tarjetas de Active Recall con preguntas clave y pistas' },
    { id: 'quiz', label: 'Quiz Rápido', icon: Brain, color: 'text-fox-orange bg-fox-orange/10 border-fox-orange/30', desc: 'Evaluación formativa con feedback pedagógico socrático' },
    { id: 'resumen', label: 'Resumen Foxy', icon: FileText, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30', desc: 'Síntesis estructurada con puntos clave y glosario' },
    { id: 'mapa', label: 'Mapa Conceptual', icon: Network, color: 'text-blue-600 bg-blue-500/10 border-blue-500/30', desc: 'Esquema de nodos y conexiones visuales interactivas' },
    { id: 'plan', label: 'Plan de Estudio', icon: Target, color: 'text-rose-600 bg-rose-500/10 border-rose-500/30', desc: 'Cronograma con hitos y metas para parciales o exámenes' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      onGenerate({
        toolType: selectedTool,
        topic: selectedTopic,
        difficulty,
        count: itemCount,
        instructions: customInstructions
      });
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-fox-border bg-fox-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fox-purple/10 text-fox-purple flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg">
                Generar Herramienta de Estudio con IA
              </h3>
              <p className="text-xs text-fox-text-muted">
                {folderName} • Seleccioná el formato y personalizá las opciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tool Type Selector Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2.5">
              Tipo de Herramienta a Generar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {toolsList.map(tool => {
                const Icon = tool.icon;
                const isSelected = selectedTool === tool.id;
                return (
                  <div
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-fox-purple bg-fox-purple/5 ring-2 ring-fox-purple/20 shadow-xs'
                        : 'border-fox-border bg-fox-bg/50 hover:border-fox-border/80'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 ${tool.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-xs text-fox-text-main">
                        {tool.label}
                      </p>
                      <p className="text-[11px] text-fox-text-muted line-clamp-1 mt-0.5">
                        {tool.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Topic Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
              Unidad o Tema de Estudio
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs text-fox-text-main focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none cursor-pointer"
            >
              <option value="Todo el material de la carpeta">Todo el material de la carpeta</option>
              {topics.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Specific controls according to tool */}
          {(selectedTool === 'flashcards' || selectedTool === 'quiz') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                  Cantidad de Items
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setItemCount(cnt)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        itemCount === cnt
                          ? 'bg-fox-purple text-white border-fox-purple shadow-2xs'
                          : 'bg-fox-bg border-fox-border text-fox-text-muted hover:text-fox-text-main'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                  Nivel de Dificultad
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2 text-xs text-fox-text-main focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none cursor-pointer"
                >
                  <option value="facil">Fácil (Conceptos iniciales)</option>
                  <option value="intermedio">Intermedio (Preguntas aplicadas)</option>
                  <option value="dificil">Difícil (Análisis crítico y examen)</option>
                </select>
              </div>
            </div>
          )}

          {/* Custom Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5 flex items-center justify-between">
              <span>Instrucciones Especiales para Foxy (Opcional)</span>
              <span className="text-[10px] normal-case text-fox-text-muted/70">Ej: Enfatizar fechas, fórmulas, etc.</span>
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ej. Haz énfasis en los autores hispanoamericanos del siglo XX y utiliza un tono explicativo socrático..."
              rows={2}
              className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 py-3 rounded-2xl border border-fox-border text-fox-text-muted hover:text-fox-text-main font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="flex-[2] py-3 rounded-2xl bg-fox-purple text-white hover:bg-fox-purple/90 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Generar Herramienta con Foxy</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
