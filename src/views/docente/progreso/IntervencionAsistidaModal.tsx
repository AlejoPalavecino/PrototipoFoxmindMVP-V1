import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, Sparkles, X, MessageSquare, BookOpen, 
  Calendar, CheckCircle2, AlertCircle, Send, ArrowLeft, Clock, ShieldAlert, Zap
} from 'lucide-react';
import { PedagogicalAlert } from './progresoDocenteTypes';

interface IntervencionAsistidaModalProps {
  isOpen: boolean;
  alert: PedagogicalAlert | null;
  onClose: () => void;
  onResolve: (alertId: number, outcomeSummary: string, pointsEarned: number) => void;
}

export function IntervencionAsistidaModal({
  isOpen,
  alert,
  onClose,
  onResolve
}: IntervencionAsistidaModalProps) {
  const [step, setStep] = useState<'analyzing' | 'options' | 'message' | 'tutoria' | 'dua'>('analyzing');
  const [parentMessage, setParentMessage] = useState('');
  const [tutoriaSlot, setTutoriaSlot] = useState('Mañana, 11:30 (Recreo largo)');
  const [tutoriaTopic, setTutoriaTopic] = useState('');
  const [duaAdaptationType, setDuaAdaptationType] = useState('rúbrica_visual');

  // Reset or simulate analysis on open
  useEffect(() => {
    if (isOpen && alert) {
      setStep('analyzing');
      setTutoriaTopic(alert.issue);
      setParentMessage(
        `Estimada familia de ${alert.student},\n\nEspero que se encuentren muy bien. Les escribo desde FoxMind para comentarles que he notado ciertas dificultades en ${alert.course} relacionadas con: "${alert.issue}".\n\nNos gustaría coordinar una estrategia pedagógica de acompañamiento conjunto para que pueda retomar el ritmo sin sobrecargas.\n\n¿Estarían disponibles para una breve comunicación o reunión la próxima semana?\n\nSaludos cordiales,\nProf. Docente a Cargo`
      );

      const timer = setTimeout(() => {
        setStep('options');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, alert]);

  if (!isOpen || !alert) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-fox-border flex justify-between items-center bg-fox-bg/50 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-fox-purple/10 border border-fox-purple/20 text-fox-purple flex items-center justify-center shrink-0">
              <BrainCircuit size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-fox-text-main text-lg">
                  Intervención Pedagógica con IA
                </h3>
                <span className="bg-fox-purple/10 text-fox-purple border border-fox-purple/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Foxy Assist
                </span>
              </div>
              <p className="text-xs text-fox-text-muted mt-0.5">
                Caso: <strong>{alert.student}</strong> ({alert.course})
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-fox-purple/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-fox-purple border-t-transparent rounded-full animate-spin" />
                <BrainCircuit size={32} className="absolute inset-0 m-auto text-fox-purple animate-pulse" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-fox-text-main text-base mb-1">
                  Foxy está diagnosticando el caso...
                </h4>
                <p className="text-xs text-fox-text-muted max-w-sm mx-auto">
                  Analizando historial de entregas, asistencias y sugerencias de acompañamiento DUA para {alert.student}.
                </p>
              </div>
            </div>
          )}

          {step === 'options' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Problem overview card */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-500 shrink-0 mt-0.5">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-600">
                      Situación Detectada ({alert.time})
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600">
                      Prioridad {alert.severity === 'high' ? 'Alta' : 'Media'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-fox-text-main mt-1">{alert.issue}</p>
                </div>
              </div>

              {/* Foxy AI Recommendation */}
              <div className="bg-fox-purple/5 border border-fox-purple/20 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles size={20} className="text-fox-purple shrink-0 mt-0.5" />
                <div className="text-xs text-fox-text-main leading-relaxed">
                  <strong className="text-fox-purple block mb-0.5 font-bold">Diagnóstico Foxy:</strong>
                  {alert.suggestedAction || 'El estudiante muestra un desfasaje en entregas recientes. Una comunicación empática y la flexibilización de formatos aumentan en un 78% la probabilidad de recuperación.'}
                </div>
              </div>

              {/* Action Buttons list */}
              <div>
                <h4 className="text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-3">
                  Selecciona la vía de intervención recomendada:
                </h4>

                <div className="space-y-3">
                  {/* Option 1: Redactar mensaje a la familia */}
                  <button
                    onClick={() => setStep('message')}
                    className="w-full text-left bg-fox-surface border border-fox-border hover:border-fox-purple hover:bg-fox-purple/5 rounded-2xl p-4 transition-all flex items-start gap-4 group cursor-pointer shadow-xs"
                  >
                    <div className="p-2.5 bg-fox-purple/10 text-fox-purple rounded-xl group-hover:bg-fox-purple group-hover:text-white transition-colors shrink-0">
                      <MessageSquare size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-heading font-bold text-fox-text-main text-sm">
                          Redactar comunicación a la familia
                        </h5>
                        <span className="text-[11px] font-bold text-fox-gold">+50 XP</span>
                      </div>
                      <p className="text-xs text-fox-text-muted mt-1 leading-relaxed">
                        Foxy genera una plantilla personalizada y empática lista para revisar y despachar.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Adaptar tarea con DUA */}
                  <button
                    onClick={() => setStep('dua')}
                    className="w-full text-left bg-fox-surface border border-fox-border hover:border-fox-primary hover:bg-fox-primary/5 rounded-2xl p-4 transition-all flex items-start gap-4 group cursor-pointer shadow-xs"
                  >
                    <div className="p-2.5 bg-fox-primary/10 text-fox-primary rounded-xl group-hover:bg-fox-primary group-hover:text-white transition-colors shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-heading font-bold text-fox-text-main text-sm">
                          Generar adaptación DUA / Formato alternativo
                        </h5>
                        <span className="text-[11px] font-bold text-fox-gold">+60 XP</span>
                      </div>
                      <p className="text-xs text-fox-text-muted mt-1 leading-relaxed">
                        Divide la consigna en micro-pasos y habilita entregas en audio o mapas conceptuales.
                      </p>
                    </div>
                  </button>

                  {/* Option 3: Agendar tutoría breve */}
                  <button
                    onClick={() => setStep('tutoria')}
                    className="w-full text-left bg-fox-surface border border-fox-border hover:border-fox-green hover:bg-fox-green/5 rounded-2xl p-4 transition-all flex items-start gap-4 group cursor-pointer shadow-xs"
                  >
                    <div className="p-2.5 bg-fox-green/10 text-fox-green rounded-xl group-hover:bg-fox-green group-hover:text-white transition-colors shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-heading font-bold text-fox-text-main text-sm">
                          Agendar micro-tutoría 1-a-1 (10-15 min)
                        </h5>
                        <span className="text-[11px] font-bold text-fox-gold">+80 XP</span>
                      </div>
                      <p className="text-xs text-fox-text-muted mt-1 leading-relaxed">
                        Fija un espacio de acompañamiento personalizado al inicio o cierre de clase.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'message' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="bg-fox-purple/10 border border-fox-purple/20 p-3.5 rounded-2xl flex gap-3 text-fox-purple text-xs">
                <Sparkles size={18} className="shrink-0 mt-0.5" />
                <p>
                  Borrador generado con tono pedagógico y colaborativo. Puedes editarlo antes de confirmar el envío.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                  Mensaje para el cuaderno de comunicaciones / familia:
                </label>
                <textarea
                  value={parentMessage}
                  onChange={e => setParentMessage(e.target.value)}
                  className="w-full h-44 p-4 rounded-2xl border border-fox-border bg-fox-bg text-xs font-medium text-fox-text-main focus:outline-none focus:border-fox-purple focus:ring-2 focus:ring-fox-purple/20 resize-none transition-all leading-relaxed"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setStep('options')}
                  className="px-4 py-2 text-xs font-bold text-fox-text-muted hover:text-fox-text-main bg-fox-surface border border-fox-border rounded-xl transition-colors cursor-pointer"
                >
                  Volver a opciones
                </button>
                <button
                  onClick={() => {
                    onResolve(
                      alert.id,
                      `Comunicación enviada a la familia de ${alert.student} para coordinar recuperación de tareas.`,
                      50
                    );
                  }}
                  className="bg-fox-purple hover:bg-fox-purple/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Send size={14} /> Enviar Mensaje y Resolver
                </button>
              </div>
            </motion.div>
          )}

          {step === 'dua' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="bg-fox-primary/10 border border-fox-primary/20 p-3.5 rounded-2xl flex gap-3 text-fox-primary text-xs">
                <Sparkles size={18} className="shrink-0 mt-0.5" />
                <p>
                  Diseño Universal para el Aprendizaje: Foxy estructurará una variante inclusiva para la próxima evaluación de {alert.course}.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted">
                  Modalidad de adaptación DUA:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'rúbrica_visual', label: 'Rúbrica Visual y Micro-pasos', desc: 'Descompone el trabajo en 3 etapas claras.' },
                    { id: 'audio_oral', label: 'Opción de Entrega en Audio/Video', desc: 'Permite responder oralmente con grabación.' },
                    { id: 'cuestionario_guiado', label: 'Cuestionario de Active Recall', desc: 'Práctica guiada previa con feedback inmediato.' },
                    { id: 'tiempo_flexible', label: 'Cronograma Flexible Escalonado', desc: 'Fechas intermedias de pre-entrega.' },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setDuaAdaptationType(opt.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        duaAdaptationType === opt.id
                          ? 'border-fox-primary bg-fox-primary/5 shadow-xs'
                          : 'border-fox-border bg-fox-bg/40 hover:border-fox-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-fox-text-main">{opt.label}</span>
                        {duaAdaptationType === opt.id && <CheckCircle2 size={14} className="text-fox-primary" />}
                      </div>
                      <p className="text-[11px] text-fox-text-muted leading-tight">{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setStep('options')}
                  className="px-4 py-2 text-xs font-bold text-fox-text-muted hover:text-fox-text-main bg-fox-surface border border-fox-border rounded-xl transition-colors cursor-pointer"
                >
                  Volver
                </button>
                <button
                  onClick={() => {
                    onResolve(
                      alert.id,
                      `Adaptación DUA configurada (${duaAdaptationType}) para ${alert.student} en ${alert.course}.`,
                      60
                    );
                  }}
                  className="bg-fox-primary hover:bg-fox-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Zap size={14} /> Aplicar Adaptación DUA (+60 XP)
                </button>
              </div>
            </motion.div>
          )}

          {step === 'tutoria' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <p className="text-xs text-fox-text-main font-medium">
                Selecciona la franja horaria sugerida para los 10-15 minutos de tutoría con {alert.student}:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  'Mañana, 11:30 (Recreo largo)',
                  'Jueves, 13:00 (Post clase)',
                  'Viernes, 10:15 (Taller práctico)',
                  'Lunes próximo, 14:00'
                ].map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTutoriaSlot(slot)}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      tutoriaSlot === slot
                        ? 'border-fox-green bg-fox-green/10 text-fox-green shadow-xs'
                        : 'border-fox-border bg-fox-bg/50 text-fox-text-muted hover:border-fox-green/40 hover:text-fox-text-main'
                    }`}
                  >
                    <Clock size={14} className="mb-1 opacity-70" />
                    <div>{slot}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                  Foco temático del encuentro:
                </label>
                <input
                  type="text"
                  value={tutoriaTopic}
                  onChange={e => setTutoriaTopic(e.target.value)}
                  className="w-full bg-fox-bg border border-fox-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-fox-text-main focus:outline-none focus:border-fox-green focus:ring-2 focus:ring-fox-green/20"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setStep('options')}
                  className="px-4 py-2 text-xs font-bold text-fox-text-muted hover:text-fox-text-main bg-fox-surface border border-fox-border rounded-xl transition-colors cursor-pointer"
                >
                  Volver
                </button>
                <button
                  onClick={() => {
                    onResolve(
                      alert.id,
                      `Tutoría 1-a-1 programada (${tutoriaSlot}) con ${alert.student} para trabajar "${tutoriaTopic}".`,
                      80
                    );
                  }}
                  className="bg-fox-green hover:bg-fox-green/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Calendar size={14} /> Confirmar y Agendar (+80 XP)
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
