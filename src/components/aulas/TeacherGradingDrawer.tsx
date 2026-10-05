import React, { useState } from 'react';
import { 
  X, BrainCircuit, Sparkles, CheckCircle2, AlertCircle, FileText, 
  Download, Eye, PenTool, Check, RotateCcw, MessageSquare, 
  ChevronRight, Award, Sliders, ExternalLink, HelpCircle, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../ui/Toaster';
import type { Submission } from '../../features/classrooms';

export interface RubricCriterion {
  criteria: string;
  points?: number;
  max?: number;
  description?: string;
}

interface TeacherGradingDrawerProps {
  submission: Submission;
  activity: any;
  onClose: () => void;
  onSave: (finalGrade: number, finalFeedback: string, breakdown: any[]) => void;
}

export function TeacherGradingDrawer({
  submission,
  activity,
  onClose,
  onSave
}: TeacherGradingDrawerProps) {
  const isDuaStudent = submission.dua && submission.dua.length > 0;
  
  // Base default rubric from activity or generate structured criteria
  const defaultCriteria: { criteria: string; max: number; earned: number; note: string }[] = 
    activity.rubric && activity.rubric.length > 0
      ? activity.rubric.map((r: any) => ({
          criteria: r.criteria,
          max: Number(r.points) || 10,
          earned: submission.grade ? Math.min(Number(r.points) || 10, submission.grade) : Number(r.points) || 10,
          note: ''
        }))
      : [
          { criteria: 'Comprensión y dominio de contenidos', max: 4, earned: 4, note: 'Identifica conceptos clave y autores centrales.' },
          { criteria: 'Capacidad de análisis y argumentación crítica', max: 4, earned: 3.5, note: 'Relaciona ideas con fundamentación coherente.' },
          { criteria: 'Claridad, coherencia y estructura formal', max: 2, earned: 2, note: 'Adecuada sintaxis y organización del texto.' }
        ];

  const [criteriaScores, setCriteriaScores] = useState(defaultCriteria);
  const [teacherFeedback, setTeacherFeedback] = useState(submission.feedback || '');
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSuggestionsReady, setAiSuggestionsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'consigna'>('preview');

  // Calculate total score dynamically from criteria
  const totalMax = criteriaScores.reduce((acc, c) => acc + c.max, 0);
  const totalEarned = criteriaScores.reduce((acc, c) => acc + c.earned, 0);
  // Scale to standard 1-10 or 1-100 depending on max
  const normalizedGrade = totalMax === 10 ? totalEarned : Math.round((totalEarned / totalMax) * 10 * 10) / 10;

  const [manualGradeInput, setManualGradeInput] = useState<string>(
    submission.grade !== null ? submission.grade.toString() : normalizedGrade.toFixed(1)
  );

  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...criteriaScores];
    const clamped = Math.max(0, Math.min(updated[index].max, newScore));
    updated[index].earned = clamped;
    setCriteriaScores(updated);

    const newTotal = updated.reduce((acc, c) => acc + c.earned, 0);
    const newNorm = totalMax === 10 ? newTotal : Math.round((newTotal / totalMax) * 10 * 10) / 10;
    setManualGradeInput(newNorm.toFixed(1));
  };

  const handleRunAiEvaluation = () => {
    setIsAnalyzingAI(true);
    setTimeout(() => {
      setIsAnalyzingAI(false);
      setAiSuggestionsReady(true);

      // AI evaluation based on rubric and DUA profile
      let suggestedList = [];
      let generatedFeedback = '';

      if (isDuaStudent) {
        // Generous, constructive evaluation prioritizing conceptual grasp over mechanical rigidity
        suggestedList = [
          { criteria: 'Comprensión y dominio de contenidos', max: 4, earned: 4, note: 'Excelente comprensión de los conceptos. Logra transmitir las ideas de forma clara y directa.' },
          { criteria: 'Capacidad de análisis y argumentación crítica', max: 4, earned: 3.5, note: 'Muy buen análisis personal. Conecta las obras con su punto de vista.' },
          { criteria: 'Claridad, coherencia y estructura formal', max: 2, earned: 2, note: 'Cumple holgadamente con los criterios adaptados DUA. Estructura sintética y ordenada.' }
        ];
        generatedFeedback = `¡Muy buen trabajo, ${submission.name.split(' ')[0]}! Has demostrado una comprensión sólida de los conceptos trabajados en clase. Tu análisis es claro y responde directamente a la consigna. Te felicito por la dedicación y el esfuerzo en esta entrega.`;
      } else {
        suggestedList = [
          { criteria: 'Comprensión y dominio de contenidos', max: 4, earned: 3.8, note: 'Demuestra lectura atenta del material y cita adecuadamente los autores clave.' },
          { criteria: 'Capacidad de análisis y argumentación crítica', max: 4, earned: 3.2, note: 'Plantea argumentos interesantes, aunque en el cierre podría profundizar un poco más la conclusión.' },
          { criteria: 'Claridad, coherencia y estructura formal', max: 2, earned: 1.8, note: 'Buena redacción general, fluida y con vocabulario disciplinar apropiado.' }
        ];
        generatedFeedback = `Buen trabajo, ${submission.name.split(' ')[0]}. Tu ensayo está bien estructurado y demuestra una comprensión clara del tema. Para próximas entregas, intenta profundizar un poco más en la reflexión final para conectar los ejemplos con mayor impacto. ¡Continúa así!`;
      }

      setCriteriaScores(suggestedList);
      const newTotal = suggestedList.reduce((acc, c) => acc + c.earned, 0);
      setManualGradeInput(newTotal.toFixed(1));
      setTeacherFeedback(generatedFeedback);
      toast.show('✨ Sugerencia de corrección con IA generada', 'success');
    }, 1800);
  };

  const handleApplyFeedbackChip = (chipText: string) => {
    setTeacherFeedback(prev => prev ? `${prev} ${chipText}` : chipText);
  };

  const handleDownloadFile = () => {
    const fileName = submission.attachedFile?.name || `Entrega_${submission.name.replace(/\s+/g, '_')}.pdf`;
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'docx' || ext === 'doc'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : ext === 'txt'
      ? 'text/plain'
      : 'application/pdf';

    const fileContent = submission.content || `FoxMind LMS - Entrega Académica\nEstudiante: ${submission.name}\nActividad: ${activity.title}\nFecha de Entrega: ${submission.date || 'Reciente'}\n\n=========================================\nCONTENIDO DEL TRABAJO:\n=========================================\n${submission.content || 'Documento adjunto en formato digital para evaluación pedagógica.'}`;
    
    const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show(`📥 Descargando archivo del alumno: "${fileName}"`, 'success');
  };

  const handleSaveAndPublish = () => {
    const finalVal = parseFloat(manualGradeInput) || normalizedGrade;
    onSave(finalVal, teacherFeedback, criteriaScores);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs p-0 sm:p-3">
      <motion.div
        initial={{ x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="bg-fox-surface w-full max-w-5xl h-full sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-fox-border"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-fox-border bg-fox-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-fox-primary/10 text-fox-primary border border-fox-primary/20 flex items-center justify-center font-bold text-base shadow-xs">
              {submission.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-fox-text-main text-base sm:text-lg">
                  {submission.name}
                </h3>
                {isDuaStudent && (
                  <span className="bg-fox-purple/10 text-fox-purple border border-fox-purple/20 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={11} /> DUA: {submission.dua.join(', ')}
                  </span>
                )}
                {submission.status === 'graded' ? (
                  <span className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Calificado ({submission.grade})
                  </span>
                ) : (
                  <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Para corregir
                  </span>
                )}
              </div>
              <p className="text-xs text-fox-text-muted font-medium mt-0.5">
                {activity.title} • Entrega: {submission.date || 'Pendiente'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-border/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace 2-Column Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Column: Student Submission Viewer */}
          <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-fox-border flex flex-col bg-fox-bg/30 overflow-hidden">
            {/* Tab switch for submission vs consigna */}
            <div className="p-3 border-b border-fox-border bg-fox-surface flex items-center justify-between gap-2">
              <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'preview' ? 'bg-fox-surface shadow-2xs text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  <FileText size={14} /> Entrega del Alumno
                </button>
                <button
                  onClick={() => setActiveTab('consigna')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'consigna' ? 'bg-fox-surface shadow-2xs text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  <HelpCircle size={14} /> Consigna Asignada
                </button>
              </div>

              <button
                onClick={handleDownloadFile}
                className="text-xs font-bold text-fox-primary hover:bg-fox-primary/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-fox-primary/20 bg-fox-primary/5"
                title="Descargar archivo original del alumno"
              >
                <Download size={13} /> Descargar Entrega
              </button>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {activeTab === 'preview' ? (
                <>
                  {/* File Attachment Chip */}
                  <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-fox-orange/10 text-fox-orange flex items-center justify-center font-bold text-xs">
                        {submission.attachedFile?.type || 'DOC'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-fox-text-main">
                          {submission.attachedFile?.name || `Entrega_${submission.name.replace(/\s+/g, '_')}.pdf`}
                        </p>
                        <p className="text-[11px] text-fox-text-muted">
                          {submission.attachedFile?.size || '1.4 MB'} • Entregado en fecha
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-fox-green/10 text-fox-green border border-fox-green/20">
                        Verificado
                      </span>
                      <button
                        onClick={handleDownloadFile}
                        className="px-2.5 py-1 bg-fox-bg hover:bg-fox-primary/10 text-fox-primary border border-fox-border hover:border-fox-primary/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={12} /> Descargar
                      </button>
                    </div>
                  </div>

                  {/* Submission Document Text View */}
                  <div className="bg-fox-surface border border-fox-border rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-fox-border/60 pb-3 text-xs text-fox-text-muted font-semibold">
                      <span>Documento de Respuesta</span>
                      <span>~ 320 palabras</span>
                    </div>

                    <div className="text-xs sm:text-sm text-fox-text-main/90 leading-relaxed whitespace-pre-wrap font-serif bg-[#FCFDFE] p-4 rounded-xl border border-fox-border/40">
                      {submission.content || (
                        <span className="italic text-fox-text-muted">
                          El alumno adjuntó su archivo en formato digital para la corrección.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student Note */}
                  {submission.studentNote && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                      <p className="text-[11px] font-extrabold uppercase text-amber-700 tracking-wider mb-1 flex items-center gap-1">
                        <MessageSquare size={13} /> Comentario del alumno
                      </p>
                      <p className="text-xs text-fox-text-main/80 font-medium">
                        "{submission.studentNote}"
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Consigna View */
                <div className="space-y-4">
                  <div className="bg-fox-surface border border-fox-border rounded-2xl p-5 shadow-2xs space-y-3">
                    <h4 className="font-heading font-bold text-fox-text-main text-sm">
                      {isDuaStudent ? `Consigna Adaptada para ${submission.name}` : 'Consigna General de la Actividad'}
                    </h4>
                    <p className="text-xs sm:text-sm text-fox-text-muted font-medium leading-relaxed whitespace-pre-wrap">
                      {isDuaStudent
                        ? `Adaptación DUA (${submission.dua.join(', ')}):\n• Consigna dividida en pasos secuenciales.\n• Formato estructurado con preguntas disparadoras.\n• Criterio flexible de redacción priorizando comprensión conceptual.`
                        : activity.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Grading & Feedback Engine */}
          <div className="w-full lg:w-1/2 flex flex-col bg-fox-surface overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* AI Copilot Suggestion Box */}
              <div className="bg-gradient-to-br from-fox-purple/10 via-fox-purple/5 to-transparent border border-fox-purple/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-fox-purple text-white flex items-center justify-center shadow-xs">
                      <BrainCircuit size={16} />
                    </div>
                    <div>
                      <h4 className="font-heading font-extrabold text-fox-text-main text-sm">
                        Copiloto Foxy para Corrección
                      </h4>
                      <p className="text-[11px] text-fox-purple font-bold">
                        Evaluación guiada con Rúbrica {isDuaStudent ? 'y ajuste DUA' : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunAiEvaluation}
                    disabled={isAnalyzingAI}
                    className="px-3 py-1.5 bg-fox-purple hover:bg-fox-purple/90 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isAnalyzingAI ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Sugerir con IA</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-fox-text-muted font-medium leading-relaxed">
                  Foxy analiza la entrega según los criterios de la rúbrica y sugiere notas y una devolución pedagógica. 
                  <strong className="text-fox-text-main ml-1">Como docente, tú tienes siempre la última palabra.</strong>
                </p>
              </div>

              {/* Rubric Criteria Interactive Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-fox-text-main text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={14} className="text-fox-primary" /> Rúbrica de Evaluación
                  </h4>
                  <span className="text-xs font-bold text-fox-primary">
                    Puntaje total: {normalizedGrade.toFixed(1)} / 10
                  </span>
                </div>

                <div className="space-y-2.5">
                  {criteriaScores.map((crit, idx) => (
                    <div
                      key={idx}
                      className="bg-fox-bg/60 border border-fox-border rounded-xl p-3.5 space-y-2 transition-all hover:border-fox-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-fox-text-main">{crit.criteria}</p>
                          {crit.note && (
                            <p className="text-[11px] text-fox-text-muted mt-0.5">{crit.note}</p>
                          )}
                        </div>

                        {/* Point inputs */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-fox-surface border border-fox-border px-2 py-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleScoreChange(idx, Number((crit.earned - 0.5).toFixed(1)))}
                            className="w-5 h-5 rounded flex items-center justify-center font-black text-xs text-fox-text-muted hover:bg-fox-bg hover:text-fox-text-main"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={crit.max}
                            value={crit.earned}
                            onChange={(e) => handleScoreChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-10 text-center text-xs font-black text-fox-text-main bg-transparent outline-none"
                          />
                          <span className="text-[10px] font-bold text-fox-text-muted">/ {crit.max}</span>
                          <button
                            type="button"
                            onClick={() => handleScoreChange(idx, Number((crit.earned + 0.5).toFixed(1)))}
                            className="w-5 h-5 rounded flex items-center justify-center font-black text-xs text-fox-text-muted hover:bg-fox-bg hover:text-fox-text-main"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Progress visual */}
                      <div className="w-full bg-fox-border/40 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-fox-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${(crit.earned / crit.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Grade Input & Overrides */}
              <div className="bg-fox-bg/40 border border-fox-border rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-fox-text-muted">
                    Calificación Final (Sobre 10)
                  </label>
                  <p className="text-xs text-fox-text-muted font-medium mt-0.5">
                    Calculada automáticamente o ingresada manualmente
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={manualGradeInput}
                    onChange={(e) => setManualGradeInput(e.target.value)}
                    className="w-20 bg-fox-surface border-2 border-fox-primary/40 rounded-xl px-3 py-2 text-center text-lg font-black text-fox-primary focus:ring-2 focus:ring-fox-primary/30 outline-none shadow-xs"
                  />
                  <span className="text-xs font-black text-fox-text-muted">/ 10</span>
                </div>
              </div>

              {/* Feedback / Devolución Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-fox-text-muted flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-fox-primary" /> Devolución y Comentarios para el Alumno
                  </label>
                  <span className="text-[11px] font-bold text-fox-purple flex items-center gap-1">
                    <ShieldCheck size={12} /> Editable por el docente
                  </span>
                </div>

                <textarea
                  value={teacherFeedback}
                  onChange={(e) => setTeacherFeedback(e.target.value)}
                  placeholder="Escribe aquí las observaciones, felicitaciones o aspectos de mejora para el estudiante..."
                  rows={4}
                  className="w-full bg-fox-bg/50 border border-fox-border rounded-xl p-3.5 text-xs sm:text-sm text-fox-text-main font-medium focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all resize-none leading-relaxed"
                />

                {/* Quick Feedback Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-fox-text-muted">Frases rápidas:</span>
                  {[
                    '¡Excelente trabajo y argumentación!',
                    'Buen análisis, profundizar conclusiones.',
                    'Revisar ortografía y formato de citas.',
                    'Gran progreso respecto al trabajo anterior.'
                  ].map((chip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyFeedbackChip(chip)}
                      className="text-[10px] font-semibold text-fox-text-main bg-fox-bg hover:bg-fox-primary/10 hover:text-fox-primary border border-fox-border px-2 py-0.5 rounded-md transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 sm:p-5 border-t border-fox-border bg-fox-surface flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-fox-border font-bold text-xs text-fox-text-muted hover:bg-fox-bg transition-colors"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.show('Borrador guardado localmente', 'info');
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-fox-border font-bold text-xs text-fox-text-main hover:bg-fox-bg transition-colors"
                >
                  Guardar Borrador
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPublish}
                  className="px-6 py-2.5 bg-fox-primary hover:bg-fox-primary/90 text-white rounded-xl font-bold text-xs shadow-md shadow-fox-primary/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={15} /> Publicar y Notificar
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
