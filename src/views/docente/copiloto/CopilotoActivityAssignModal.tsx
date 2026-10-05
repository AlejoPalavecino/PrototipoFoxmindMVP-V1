import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  X, 
  CheckCircle2, 
  Calendar, 
  BookOpen, 
  FileText, 
  Sparkles, 
  Sliders, 
  Users, 
  Check, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { sharedActivities, updateSharedActivities, mockClassroomsDocente } from '../../../mockData';
import { useAppContext } from '../../../context';

interface CopilotoActivityAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialDescription?: string;
  initialAulaId?: string;
  initialContentMarkdown?: string;
  onSuccessAssigned?: (activityTitle: string, classroomName: string) => void;
}

export const CopilotoActivityAssignModal: React.FC<CopilotoActivityAssignModalProps> = ({
  isOpen,
  onClose,
  initialTitle = 'Nueva Actividad Generada con Foxy IA',
  initialDescription = '',
  initialAulaId = 'c1',
  initialContentMarkdown = '',
  onSuccessAssigned,
}) => {
  const { setView } = useAppContext();
  const [selectedAulaId, setSelectedAulaId] = useState(initialAulaId || 'c1');
  const [activityTitle, setActivityTitle] = useState(initialTitle);
  const [activityType, setActivityType] = useState<'Evaluación' | 'Trabajo Práctico' | 'Práctica' | 'Participación'>('Evaluación');
  const [dueDate, setDueDate] = useState('En 4 días');
  const [dueTime, setDueTime] = useState('23:59');
  const [description, setDescription] = useState(
    initialDescription || 'Lee atentamente la consigna y completa los puntos solicitados aplicando los criterios de la rúbrica compartida en clase.'
  );
  const [enableDuaAdaptation, setEnableDuaAdaptation] = useState(true);
  const [includeRubric, setIncludeRubric] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);

  if (!isOpen) return null;

  const currentAula = mockClassroomsDocente.find(c => c.id === selectedAulaId) || mockClassroomsDocente[0];

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const newActivity = {
        id: Date.now(),
        title: activityTitle.trim(),
        type: activityType,
        status: 'Activa',
        due: dueDate,
        submissions: `0/${currentAula.studentsCount}`,
        description: description.trim(),
        longInstructions: [
          { 
            title: 'Consigna Principal Generada por Foxy IA', 
            content: description.trim() 
          },
          { 
            title: 'Criterios de Evaluación y Rúbrica Formativa', 
            content: 'Se evaluará comprensión conceptual, análisis crítico y claridad argumentativa según la rúbrica oficial.' 
          },
          ...(enableDuaAdaptation ? [{
            title: 'Pautas de Accesibilidad DUA',
            content: 'Entrega flexible: Se admite texto redactado, presentación visual o audio grabado de 3 minutos para alumnos con perfil DUA.'
          }] : [])
        ],
        attachment: { 
          name: `${activityTitle.replace(/\s+/g, '_')}_Guia_Foxy.pdf`, 
          size: '1.2 MB', 
          url: '#' 
        }
      };

      const updated = [newActivity, ...sharedActivities];
      updateSharedActivities(updated);
      setIsSubmitting(false);
      setShowSuccessCard(true);

      if (onSuccessAssigned) {
        onSuccessAssigned(newActivity.title, `${currentAula.subject} ${currentAula.course}`);
      }
      toast.show(`¡Actividad asignada con éxito en ${currentAula.subject} ${currentAula.course}!`, 'success');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fox-surface border border-fox-border rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 my-auto"
      >
        {!showSuccessCard ? (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-fox-border pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-fox-primary/10 text-fox-primary rounded-2xl">
                  <Send size={22} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-fox-text-main text-lg">
                    Asignar como Actividad del Aula
                  </h3>
                  <p className="text-xs text-fox-text-muted">
                    Publica automáticamente esta producción de Foxy IA en la lista de tareas del curso.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmAssignment} className="space-y-4">
              
              {/* Classroom Selection */}
              <div>
                <label className="block text-xs font-bold text-fox-text-main mb-1.5 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-fox-primary" /> Aula Destino *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {mockClassroomsDocente.map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedAulaId(cls.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedAulaId === cls.id
                          ? 'border-fox-primary bg-fox-primary/10 shadow-xs'
                          : 'border-fox-border bg-fox-bg hover:border-fox-primary/40'
                      }`}
                    >
                      <span className="font-bold text-xs sm:text-sm text-fox-text-main block">
                        {cls.subject} {cls.course}
                      </span>
                      <span className="text-[11px] text-fox-text-muted">
                        {cls.studentsCount} alumnos inscritos
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-fox-text-main mb-1.5">
                    Título de la Actividad *
                  </label>
                  <input
                    type="text"
                    required
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    placeholder="Ej: Ensayo Comparativo de Vanguardias"
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-fox-text-main focus:border-fox-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-fox-text-main mb-1.5">
                    Tipo de Actividad
                  </label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as any)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-3 py-2 text-xs text-fox-text-main focus:border-fox-primary outline-none"
                  >
                    <option value="Evaluación">Evaluación Sumativa</option>
                    <option value="Trabajo Práctico">Trabajo Práctico</option>
                    <option value="Práctica">Práctica Guiada</option>
                    <option value="Participación">Foro / Debate</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fox-text-main mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-fox-primary" /> Fecha Límite de Entrega
                  </label>
                  <select
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-3 py-2 text-xs text-fox-text-main focus:border-fox-primary outline-none"
                  >
                    <option value="Mañana (23:59)">Mañana</option>
                    <option value="En 3 días">En 3 días</option>
                    <option value="En 1 semana">En 1 semana</option>
                    <option value="Viernes próximo">Viernes próximo</option>
                    <option value="Fin de Unidad (15 días)">Fin de Unidad (15 días)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-fox-text-main mb-1.5">
                    Hora de Cierre
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-3 py-2 text-xs text-fox-text-main focus:border-fox-primary outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-fox-text-main mb-1.5">
                  Consigna y Pautas para los Estudiantes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instrucciones detalladas de la actividad..."
                  className="w-full bg-fox-bg border border-fox-border rounded-xl p-3 text-xs sm:text-sm text-fox-text-main focus:border-fox-primary outline-none resize-none"
                />
              </div>

              {/* Toggles for DUA & Rubric */}
              <div className="bg-fox-bg border border-fox-border rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-fox-purple" />
                    <div>
                      <span className="font-bold text-fox-text-main block">
                        Adaptación DUA Automática
                      </span>
                      <span className="text-[11px] text-fox-text-muted">
                        Habilita formatos accesibles (audio, esquema visual, lectura fácil) para alumnos con perfil DUA.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableDuaAdaptation}
                    onChange={(e) => setEnableDuaAdaptation(e.target.checked)}
                    className="w-4 h-4 text-fox-primary rounded cursor-pointer accent-fox-primary"
                  />
                </div>

                <div className="flex items-center justify-between text-xs border-t border-fox-border/60 pt-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-600" />
                    <div>
                      <span className="font-bold text-fox-text-main block">
                        Adjuntar Rúbrica Formativa de Foxy
                      </span>
                      <span className="text-[11px] text-fox-text-muted">
                        Los alumnos podrán ver los 4 niveles de logro antes de enviar su trabajo.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeRubric}
                    onChange={(e) => setIncludeRubric(e.target.checked)}
                    className="w-4 h-4 text-fox-primary rounded cursor-pointer accent-fox-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-fox-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-fox-border text-fox-text-main text-xs font-bold hover:bg-fox-bg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-fox-primary hover:bg-fox-primary/90 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Asignando...</span>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Confirmar y Publicar en el Aula</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="text-center py-6 space-y-4 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="font-heading font-extrabold text-fox-text-main text-xl">
                ¡Actividad Asignada con Éxito!
              </h3>
              <p className="text-xs sm:text-sm text-fox-text-muted max-w-md mx-auto mt-1">
                La actividad <strong>"{activityTitle}"</strong> fue publicada en el muro y lista de tareas de <strong>{currentAula.subject} {currentAula.course}</strong> con las pautas DUA y rúbrica correspondiente.
              </p>
            </div>

            <div className="bg-fox-bg border border-fox-border rounded-2xl p-4 max-w-sm mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-fox-text-muted">Aula:</span>
                <span className="font-bold text-fox-text-main">{currentAula.subject} {currentAula.course}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fox-text-muted">Entrega:</span>
                <span className="font-bold text-fox-primary">{dueDate} - {dueTime} hs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fox-text-muted">Alumnos notificados:</span>
                <span className="font-bold text-emerald-600">{currentAula.studentsCount} estudiantes</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowSuccessCard(false);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl border border-fox-border text-fox-text-main text-xs font-bold hover:bg-fox-bg"
              >
                Volver a Foxy IA
              </button>
              <button
                onClick={() => {
                  onClose();
                  setView('aulas');
                }}
                className="px-5 py-2.5 rounded-xl bg-fox-primary text-white text-xs font-bold hover:bg-fox-primary/90 flex items-center gap-1.5 shadow-sm"
              >
                <span>Ir al Aula Virtual</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
