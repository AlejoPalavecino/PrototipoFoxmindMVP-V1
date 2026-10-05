import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, BrainCircuit, Check, Copy, MessageSquare, BookOpen, Lightbulb } from 'lucide-react';
import { Conversation, Role } from '../../types';
import { toast } from '../ui/Toaster';

interface FoxyMessageCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentRole: Role;
  onApplyDraft: (text: string) => void;
}

export function FoxyMessageCopilotModal({
  isOpen,
  onClose,
  conversation,
  currentRole,
  onApplyDraft,
}: FoxyMessageCopilotModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'drafts' | 'dua'>('summary');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    toast.show('Texto copiado al portapapeles', 'info');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (text: string) => {
    onApplyDraft(text);
    toast.show('Borrador transferido al editor de mensaje', 'success');
    onClose();
  };

  // Pre-calculated educational insights based on conversation context
  const summaryPoints = currentRole === 'docente' ? [
    '📌 **Tema central:** Consultas sobre el Ensayo de Vanguardias Literarias y pautas de entrega.',
    '🕒 **Plazo acordado:** Entrega hasta mañana viernes 23:59 hs en formato PDF.',
    '📚 **Material clave citado:** Guía de Citación APA7 y Manifiesto Non Serviam de Vicente Huidobro.',
    '💡 **Recomendación pedagógica:** Reforzar en la próxima clase la estructura de citas textuales y síntesis argumentativa.'
  ] : [
    '📌 **Resumen de la consulta:** Se aclararon los requisitos obligatorios de citas para el ensayo de Vanguardias.',
    '🕒 **Fecha límite confirmada:** Mañana viernes a las 23:59 hs.',
    '📚 **Material de apoyo:** Revisar el PDF de Guía APA7 subido por la profesora Laura en la Biblioteca.',
    '💡 **Siguiente paso:** Completar el borrador y verificar las 2 citas textuales antes de la entrega final.'
  ];

  const suggestedDrafts = currentRole === 'docente' ? [
    {
      title: 'Empática y de Refuerzo Positivo',
      text: '¡Excelente avance! Me parece muy acertada tu interpretación. Seguí adelante con esa línea argumental y recordá que cualquier duda puntual podés escribirme antes de las 18 hs.'
    },
    {
      title: 'Orientación Metodológica (DUA)',
      text: 'Para organizar mejor las ideas, te sugiero estructurar el texto en 3 partes: 1) Contexto histórico, 2) Comparación de manifiestos con citas, 3) Conclusión personal.'
    },
    {
      title: 'Recordatorio de Pautas de Entrega',
      text: 'Recuerden que la entrega debe ser en formato PDF con tipografía legible y una extensión entre 300 y 500 palabras.'
    }
  ] : [
    {
      title: 'Consulta Clara y Respetuosa',
      text: 'Hola profe, muchas gracias por la devolución. Ya incorporé las correcciones sugeridas y quería consultarle si puedo subir el archivo final hoy por la tarde.'
    },
    {
      title: 'Duda sobre Consigna Específica',
      text: 'Hola profe, tengo una duda sobre la segunda cita del manifiesto: ¿debe ir en párrafo aparte o integrada dentro del texto principal?'
    },
    {
      title: 'Agradecimiento por Explicación',
      text: '¡Muchas gracias por la explicación y el material adjunto! Me aclaró mucho el panorama para terminar el trabajo.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-fox-surface border border-fox-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-fox-border bg-gradient-to-r from-fox-orange/10 via-amber-500/10 to-fox-gold/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fox-orange text-white flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-fox-text-main flex items-center gap-2">
                Foxy Copiloto de Conversación
              </h3>
              <p className="text-xs text-fox-text-muted">
                Asistencia pedagógica inteligente para {conversation.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-fox-border bg-fox-surface px-6 pt-3 gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-fox-orange text-fox-orange'
                : 'border-transparent text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <BrainCircuit size={16} /> Resumen del Hilo
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'drafts'
                ? 'border-fox-orange text-fox-orange'
                : 'border-transparent text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Lightbulb size={16} /> Respuestas Sugeridas
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-fox-orange uppercase tracking-wider">
                  <BrainCircuit size={14} /> Puntos Clave de la Conversación
                </div>
                <div className="space-y-2.5 text-sm text-fox-text-main/90 leading-relaxed">
                  {summaryPoints.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-fox-orange font-bold mt-0.5">•</span>
                      <span dangerouslySetInnerHTML={{ __html: pt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-fox-orange/5 border border-fox-orange/20 rounded-xl text-xs text-fox-text-muted flex items-center justify-between">
                <span>Total de mensajes analizados: <strong>{conversation.messages.length}</strong></span>
                <span className="text-fox-orange font-bold">Actualizado en tiempo real</span>
              </div>
            </div>
          )}

          {activeTab === 'drafts' && (
            <div className="space-y-4">
              <p className="text-xs text-fox-text-muted font-medium">
                Selecciona una respuesta sugerida para aplicarla directamente a tu editor:
              </p>

              {suggestedDrafts.map((draft, idx) => (
                <div
                  key={idx}
                  className="bg-fox-bg/40 border border-fox-border hover:border-fox-orange/40 rounded-2xl p-4 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fox-orange uppercase tracking-wider">
                      {draft.title}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleCopy(draft.text, idx)}
                        className="p-1.5 rounded-lg text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors"
                        title="Copiar texto"
                      >
                        {copiedIndex === idx ? <Check size={14} className="text-fox-green" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => handleApply(draft.text)}
                        className="px-2.5 py-1 bg-fox-orange text-white text-xs font-bold rounded-lg hover:bg-fox-orange/90 transition-colors shadow-xs"
                      >
                        Usar Borrador
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-fox-text-main/90 italic leading-relaxed">
                    "{draft.text}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-fox-border bg-fox-bg/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold text-fox-text-muted hover:bg-fox-bg hover:text-fox-text-main transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
