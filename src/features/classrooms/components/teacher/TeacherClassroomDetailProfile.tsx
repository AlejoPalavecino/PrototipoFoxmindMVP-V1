import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, X, BrainCircuit, Sparkles, BookOpen, Network, Target, AlertCircle, PenTool, Send, CheckCircle2, Clock } from 'lucide-react';
import { toast } from '../../../../components/ui/Toaster';

// Independent, conditionally mounted auxiliary panel; not the activity grading panel.
export function StudentProfilePanel({ student, onClose }: { student: any, onClose: () => void }) {
  const isHighRisk = student.risk === 'ALTO';
  const isMediumRisk = student.risk === 'MEDIO';
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<'none' | 'draft' | 'active'>('none');
  const [planEditedText, setPlanEditedText] = useState('');
  const [isEditingPlan, setIsEditingPlan] = useState(false);

  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');

  const foxyInsight = isHighRisk
    ? `${student.name} ha bajado su rendimiento en las últimas dos semanas y tiene entregas pendientes. Sugiero una tutoría sobre el tema actual y adaptar los próximos materiales.`
    : isMediumRisk
    ? `${student.name} tiene un rendimiento fluctuante. Entregó la última tarea fuera de término. Un recordatorio amigable podría ayudar.`
    : `${student.name} mantiene un excelente progreso. Participa activamente y sus entregas están al día. ¡Sigue así!`;

  const cognitiveProfile = {
    learningStyle: isHighRisk ? 'Visual y Práctico. Requiere que la información se divida en pasos cortos.' : 'Reflexivo y Analítico. Conecta muy bien los conceptos teóricos.',
    aiUsage: isHighRisk ? 'Usa a Foxy principalmente para resumir textos y pedir explicaciones más simples de consignas.' : 'Utiliza a Foxy para profundizar en temas específicos y generar debates.',
    thoughtProcess: isHighRisk ? 'Tiende a perder la concentración en tareas largas. Piensa de forma intuitiva pero a veces le cuesta estructurar sus respuestas.' : 'Construye argumentos sólidos y piensa de manera lógica y secuencial.',
    strengths: isHighRisk ? ['Creatividad visual', 'Resolución práctica', 'Participación en grupo'] : ['Pensamiento crítico', 'Expresión escrita', 'Autonomía'],
    weaknesses: isHighRisk ? ['Lectura sostenida', 'Cumplimiento de plazos', 'Atención a detalles'] : ['Trabajo en equipo', 'Sintetizar respuestas', 'Aceptación de críticas']
  };

  const chartData = isHighRisk
    ? [8, 7.5, 6, 5.5, 4]
    : isMediumRisk
    ? [6, 7, 6.5, 5.5, 6]
    : [8, 8.5, 9, 8.5, 9.5];

  const handleGeneratePlan = () => {
    setIsGeneratingPlan(true);
    setTimeout(() => {
      setIsGeneratingPlan(false);
      const initialPlan = `1. Tutoría Extra: 30 mins los viernes para revisar Vanguardias.\n2. Adaptación DUA: Facilitar formato audio para las próximas lecturas.\n3. Plazos Flexibles: Extender 2 días la próxima entrega de ensayo.\n4. Meta Semanal: Completar las 2 actividades pendientes antes del martes.`;
      setGeneratedPlan(initialPlan);
      setPlanEditedText(initialPlan);
      setPlanStatus('draft');
      setIsEditingPlan(false);
    }, 2000);
  };

  const handleSendPlan = () => {
    setPlanStatus('active');
    setGeneratedPlan(planEditedText); // Confirm edits
    setIsEditingPlan(false);
    toast.show('Plan de refuerzo activado y notificado al alumno y tutores', 'success');
  };

  const handleDiscardPlan = () => {
    setGeneratedPlan(null);
    setPlanStatus('none');
    setPlanEditedText('');
    setIsEditingPlan(false);
  };

  const handleDeactivatePlan = () => {
    setPlanStatus('none');
    setGeneratedPlan(null);
    toast.show('El plan de refuerzo ha sido marcado como completado', 'success');
  };

  const handleContact = () => {
    let defaultMsg = '';
    if (isHighRisk) {
      defaultMsg = `Hola ${student.name},\n\nHe notado que has tenido algunas dificultades con las últimas entregas y tu rendimiento ha bajado un poco. Me gustaría que nos reunamos brevemente para ver cómo puedo ayudarte y organizarnos mejor con las tareas pendientes.\n\nPor favor, confirmame qué día de esta semana te viene bien para una tutoría corta.\n\nSaludos,\nProf. Laura Martínez`;
    } else if (isMediumRisk) {
      defaultMsg = `Hola ${student.name},\n\nQuería recordarte que tu última tarea fue entregada fuera de plazo. Estás haciendo un buen trabajo en general, pero es importante organizarnos mejor con las fechas.\n\nSi necesitas ayuda con algún tema, no dudes en consultarme.\n\nSaludos,\nProf. Laura Martínez`;
    } else {
      defaultMsg = `Hola ${student.name},\n\nQuiero felicitarte por tu excelente progreso y tu participación activa en las clases. ¡Sigue así!\n\nSaludos,\nProf. Laura Martínez`;
    }
    setMessageDraft(defaultMsg);
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = () => {
    toast.show(`Mensaje enviado a ${student.name}`, 'success');
    setIsMessageModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-[#FBFDFF] w-full max-w-5xl max-h-[90vh] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-fox-border bg-fox-surface shrink-0 flex justify-between items-start relative">
          <div className="flex items-center gap-5 md:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-fox-primary/10 to-fox-purple/10 border-2 border-fox-primary/10 flex items-center justify-center font-extrabold text-fox-primary text-2xl shadow-sm shrink-0">
              {student.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-fox-text-main leading-tight">{student.name}</h2>
                <button onClick={handleContact} className="px-4 py-2 bg-fox-primary/10 text-fox-primary font-bold text-xs hover:bg-fox-primary/20 rounded-xl transition-colors flex items-center gap-2 shadow-sm" title="Enviar Mensaje">
                  <MessageSquare size={16} /> Enviar Mensaje
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold shadow-sm ${
                  isHighRisk ? 'bg-red-50 text-red-600 ring-1 ring-red-500/30' :
                  isMediumRisk ? 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-500/30' :
                  'bg-green-50 text-green-600 ring-1 ring-green-500/30'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isHighRisk ? 'bg-red-500 animate-pulse' :
                    isMediumRisk ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  Riesgo {student.risk}
                </span>
                {student.dua.map((d: string) => (
                  <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-md">{d}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-fox-text-muted/70 hover:text-fox-text-main bg-fox-bg hover:bg-fox-border/50 border border-transparent hover:border-fox-border rounded-full p-2.5 transition-all shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-fox-bg/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Informe Cognitivo AI - Full Width */}
            <div className="col-span-1 lg:col-span-3 bg-gradient-to-br from-fox-purple/5 to-white border border-fox-purple/20 rounded-3xl p-5 md:p-7 relative overflow-hidden shadow-sm group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-fox-purple/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

              <div className="flex flex-col relative z-10">
                {/* Cabecera del informe */}
                <div className="flex flex-col md:flex-row items-start lg:items-center justify-between gap-4 border-b border-fox-purple/10 pb-5 mb-5 md:mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-fox-purple border border-fox-purple/10 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-md">
                      <BrainCircuit size={24} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-fox-purple/90 text-sm md:text-base uppercase tracking-wider">Informe Cognitivo de Foxy</h4>
                      <p className="text-xs font-bold text-fox-text-muted mt-0.5">Visión global impulsada por IA para {student.name}</p>
                    </div>
                  </div>
                  {isHighRisk && planStatus === 'none' && !isGeneratingPlan && (
                    <button onClick={handleGeneratePlan} className="text-[11px] font-bold bg-fox-purple text-white px-4 py-2.5 rounded-xl hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center gap-2 w-full md:w-auto justify-center">
                      <Sparkles size={14} /> Sugerir Plan de Refuerzo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-2">
                  <div className="space-y-4">
                    {/* Estilo de Aprendizaje */}
                    <div className="bg-white/60 p-4 rounded-2xl border border-fox-purple/10">
                      <h5 className="text-[10px] uppercase font-extrabold text-fox-purple/80 mb-2 flex items-center gap-1.5"><BookOpen size={14} /> Estilo de Aprendizaje</h5>
                      <p className="text-sm font-medium text-fox-text-main/80 leading-relaxed">{cognitiveProfile.learningStyle}</p>
                    </div>

                    {/* Forma de pensar y lógica */}
                    <div className="bg-white/60 p-4 rounded-2xl border border-fox-purple/10">
                      <h5 className="text-[10px] uppercase font-extrabold text-fox-purple/80 mb-2 flex items-center gap-1.5"><Network size={14} /> Forma de Pensar</h5>
                      <p className="text-sm font-medium text-fox-text-main/80 leading-relaxed">{cognitiveProfile.thoughtProcess}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Interacción con Foxy */}
                    <div className="bg-white/60 p-4 rounded-2xl border border-fox-purple/10">
                      <h5 className="text-[10px] uppercase font-extrabold text-fox-purple/80 mb-2 flex items-center gap-1.5"><MessageSquare size={14} /> Uso de la I.A.</h5>
                      <p className="text-sm font-medium text-fox-text-main/80 leading-relaxed">{cognitiveProfile.aiUsage}</p>
                    </div>

                    {/* Fortalezas y Debilidades */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50">
                        <h5 className="text-[10px] uppercase font-extrabold text-green-700/80 mb-3 flex items-center gap-1.5"><Target size={14} /> Puntos Fuertes</h5>
                        <ul className="space-y-2">
                          {cognitiveProfile.strengths.map(s => (
                            <li key={s} className="text-xs font-bold text-green-800 flex items-start gap-1"><span className="text-green-500 mt-0.5">•</span> {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                        <h5 className="text-[10px] uppercase font-extrabold text-red-700/80 mb-3 flex items-center gap-1.5"><AlertCircle size={14} /> A Mejorar</h5>
                        <ul className="space-y-2">
                          {cognitiveProfile.weaknesses.map(w => (
                            <li key={w} className="text-xs font-bold text-red-800 flex items-start gap-1"><span className="text-red-400 mt-0.5">•</span> {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {isGeneratingPlan && (
                  <div className="mt-5 bg-white rounded-2xl p-5 border border-fox-purple/20 shadow-sm flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-[3px] border-fox-purple/20 border-t-fox-purple animate-spin"></div>
                    <p className="text-sm font-bold text-fox-purple animate-pulse">Analizando perfil y generando plan adaptado para {student.name}...</p>
                  </div>
                )}

                {planStatus !== 'none' && generatedPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-white border border-fox-purple/30 rounded-3xl p-5 md:p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[11px] font-extrabold text-fox-purple uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={14} />
                          {planStatus === 'active' ? 'Plan de Refuerzo Activo' : 'Plan de Refuerzo Sugerido'}
                        </h5>
                        {planStatus === 'active' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                      {planStatus === 'draft' && !isEditingPlan && (
                        <button onClick={() => setIsEditingPlan(true)} className="text-[10px] uppercase font-bold text-fox-primary hover:text-fox-primary/80 transition-colors flex items-center gap-1 bg-fox-primary/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-fox-primary/20">
                          <PenTool size={12} /> Editar
                        </button>
                      )}
                    </div>

                    {isEditingPlan ? (
                      <textarea
                        value={planEditedText}
                        onChange={(e) => setPlanEditedText(e.target.value)}
                        className="w-full h-32 p-4 text-sm text-fox-text-main font-medium border border-fox-primary/40 rounded-2xl bg-fox-bg/50 focus:outline-none focus:border-fox-primary focus:ring-2 focus:ring-fox-primary/20 transition-all resize-none"
                      />
                    ) : (
                      <div className="text-sm text-fox-text-main/80 space-y-2 whitespace-pre-line font-medium bg-fox-bg/30 p-5 rounded-2xl border border-fox-purple/10 leading-relaxed relative">
                        {planStatus === 'draft' ? planEditedText : generatedPlan}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {planStatus === 'draft' ? (
                        <>
                          <button onClick={handleSendPlan} className="text-xs font-bold bg-fox-primary text-white px-5 py-2.5 rounded-xl hover:bg-fox-primary/90 transition-all shadow-sm shadow-fox-primary/20 flex items-center gap-2 hover:-translate-y-0.5">
                            <Send size={16} /> Activar y Notificar a Alumno/Tutores
                          </button>
                          <button onClick={handleDiscardPlan} className="text-xs font-bold text-fox-text-muted hover:text-fox-text-main bg-fox-bg hover:bg-fox-border/50 border border-fox-border hover:border-fox-text-muted/30 px-5 py-2.5 rounded-xl transition-all">
                            Descartar
                          </button>
                        </>
                      ) : (
                        <button onClick={handleDeactivatePlan} className="text-xs font-bold bg-green-50 text-green-700 border border-green-200 px-5 py-2.5 rounded-xl hover:bg-green-100 transition-all shadow-sm flex items-center gap-2 hover:-translate-y-0.5">
                          <CheckCircle2 size={16} /> Marcar como completado
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 col-span-1">
              {/* Asistencia */}
              <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-fox-border/80">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider">Asistencia</span>
                  {isHighRisk ? <AlertCircle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-green-500" />}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-3xl font-black ${isHighRisk ? 'text-red-500' : 'text-fox-text-main'}`}>
                    {isHighRisk ? '75' : isMediumRisk ? '88' : '96'}
                  </span>
                  <span className="text-xs font-bold text-fox-text-muted">%</span>
                </div>
                <div className="w-full bg-fox-bg rounded-full h-1.5 mt-4 overflow-hidden">
                   <div className={`h-full rounded-full transition-all duration-1000 ${isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${isHighRisk ? 75 : isMediumRisk ? 88 : 96}%` }}></div>
                </div>
              </div>

              {/* Promedio */}
              <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-fox-border/80">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider">Promedio</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isHighRisk ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {isHighRisk ? '↓ 1.2' : '↑ 0.5'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-3xl font-black ${isHighRisk ? 'text-red-500' : 'text-fox-primary'}`}>
                    {chartData[4].toFixed(1)}
                  </span>
                </div>
                <p className="text-[10px] text-fox-text-muted font-medium mt-3">Sobre un total de 10 pts</p>
              </div>

              {/* Entregas a tiempo (Col-span-2) */}
              <div className="col-span-2 bg-fox-surface border border-fox-border rounded-3xl p-5 shadow-sm flex flex-col transition-all overflow-hidden group hover:shadow-md hover:border-fox-border/80">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="block text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1">Entregas a tiempo</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-fox-text-main leading-none">{isHighRisk ? '4' : '8'}</span>
                      <span className="text-xs font-bold text-fox-text-muted">/ 8 Tareas</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 ${isHighRisk ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                     {isHighRisk ? 'Atención Requerida' : 'Excelente Estado'}
                  </div>
                </div>

                {/* Visual Progress Bar instead of circle */}
                <div className="flex gap-1.5 h-3 mt-2">
                   {[1,2,3,4,5,6,7,8].map(task => (
                      <div key={task} className={`flex-1 rounded-full transition-all duration-500 ${task <= (isHighRisk ? 4 : 8) ? (isHighRisk ? 'bg-red-400 group-hover:bg-red-500' : 'bg-green-400 group-hover:bg-green-500') : 'bg-fox-bg border border-fox-border'}`}></div>
                   ))}
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-fox-surface border border-fox-border rounded-3xl p-6 lg:p-7 shadow-sm col-span-1 flex flex-col transition-all hover:shadow-md hover:border-fox-border/80">
              <h4 className="font-extrabold text-fox-text-muted text-[10px] uppercase tracking-wider">Evolución (Últimas 5 tareas)</h4>
              <div className="flex-1 relative flex items-end justify-between pt-6 pb-2 min-h-[140px] mt-2 ml-5">

                 {/* Grid Lines */}
                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2">
                   {[10, 8, 6, 4, 2].map(mark => (
                     <div key={mark} className="w-full border-t border-dashed border-fox-border/50 relative flex-1">
                       <span className="absolute -left-6 -top-2.5 text-[9px] font-bold text-fox-text-muted/60 w-4 text-right">{mark}</span>
                     </div>
                   ))}
                   <div className="w-full border-t border-fox-border relative h-0">
                     <span className="absolute -left-6 -top-2.5 text-[9px] font-bold text-fox-text-muted/60 w-4 text-right">0</span>
                   </div>
                 </div>

                 {/* SVG Data Lines */}
                 <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="gradient-high" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="gradient-medium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#eab308" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#eab308" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="gradient-good" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      d={`M 0,${100 - chartData[0]*10} L 25,${100 - chartData[1]*10} L 50,${100 - chartData[2]*10} L 75,${100 - chartData[3]*10} L 100,${100 - chartData[4]*10}`}
                      fill="none"
                      stroke={isHighRisk ? '#ef4444' : isMediumRisk ? '#eab308' : '#22c55e'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-sm"
                    />
                    <motion.path
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 1 }}
                      d={`M 0,100 L 0,${100 - chartData[0]*10} L 25,${100 - chartData[1]*10} L 50,${100 - chartData[2]*10} L 75,${100 - chartData[3]*10} L 100,${100 - chartData[4]*10} L 100,100 Z`}
                      fill={`url(#${isHighRisk ? 'gradient-high' : isMediumRisk ? 'gradient-medium' : 'gradient-good'})`}
                    />
                  </svg>
                  {chartData.map((val, i) => (
                    <div key={i} className="absolute z-10 flex flex-col items-center justify-end h-full group cursor-pointer bottom-0" style={{ left: `${(i/4)*100}%`, transform: 'translateX(-50%)' }}>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-4 bg-fox-text-main text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition-all duration-200 shadow-xl z-20 pointer-events-none transform group-hover:-translate-y-1">
                        {val.toFixed(1)}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-fox-text-main"></div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-[3.5px] border-fox-surface shadow-sm transition-transform duration-200 group-hover:scale-[1.5] ${isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ marginBottom: `${val*10}%` }}></div>
                    </div>
                  ))}
              </div>
              <div className="relative mt-4 ml-5 h-6 text-[10px] font-extrabold text-fox-text-muted/60 tracking-wider pt-3 border-t border-fox-border/50">
                {['T1', 'T2', 'T3', 'T4', 'T5'].map((label, i) => (
                  <span key={label} className="absolute hover:text-fox-text-main transition-colors cursor-default" style={{ left: `${(i/4)*100}%`, transform: 'translateX(-50%)' }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="col-span-1 mt-2 lg:mt-0 flex flex-col">
              <div className="flex justify-between items-center mb-4 lg:mb-5">
                <h4 className="font-extrabold text-fox-text-main text-[10px] uppercase tracking-wider">Actividad Reciente</h4>
                <button className="text-[10px] font-bold text-fox-primary hover:text-fox-primary/80 transition-colors uppercase tracking-wider bg-fox-primary/10 px-3 py-1.5 rounded-lg">Ver historial</button>
              </div>
              <div className="flex-1 bg-fox-surface border border-fox-border rounded-3xl p-2 md:p-3 shadow-sm flex flex-col justify-center">
                <ul className="flex flex-col w-full divide-y divide-fox-border/40">

                  {/* Item 1 */}
                  <li className="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-fox-bg/40 transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl">
                    <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-sm ${isHighRisk ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {isHighRisk ? <AlertCircle size={20} /> : <PenTool size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm shadow-sm opacity-0 absolute -z-10">Hidden</h5> {/* A11y / spacing trick avoiding real space if text very long */}
                      <h5 className="text-sm font-bold text-fox-text-main truncate group-hover:text-fox-primary transition-colors">Ensayo: Vanguardias</h5>
                      <p className="text-[10px] md:text-[11px] font-medium text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} /> Hace 2 días
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {isHighRisk ? (
                        <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wider">
                           Faltante
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] md:text-[9px] text-fox-text-muted font-bold uppercase tracking-wider mb-0.5">Nota</span>
                          <span className="text-sm md:text-base font-black text-fox-text-main leading-none">{chartData[4].toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </li>

                  {/* Item 2 */}
                  <li className="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-fox-bg/40 transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl">
                    <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-green-50 text-green-500 transition-all group-hover:scale-105 group-hover:shadow-sm">
                      <BrainCircuit size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-fox-text-main truncate group-hover:text-fox-primary transition-colors">Cuest. Modernismo</h5>
                      <p className="text-[10px] md:text-[11px] font-medium text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} /> Hace 1 semana
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="text-[8px] md:text-[9px] text-fox-text-muted font-bold uppercase tracking-wider mb-0.5">Nota</span>
                      <span className="text-sm md:text-base font-black text-fox-text-main leading-none">{chartData[3].toFixed(1)}</span>
                    </div>
                  </li>

                  {/* Item 3 */}
                  <li className="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-fox-bg/40 transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl">
                    <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-green-50 text-green-500 transition-all group-hover:scale-105 group-hover:shadow-sm">
                      <MessageSquare size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-fox-text-main truncate group-hover:text-fox-primary transition-colors">Foro: Generación del 98</h5>
                      <p className="text-[10px] md:text-[11px] font-medium text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} /> Hace 2 semanas
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="text-[8px] md:text-[9px] text-fox-text-muted font-bold uppercase tracking-wider mb-0.5">Nota</span>
                      <span className="text-sm md:text-base font-black text-fox-text-main leading-none">{chartData[2].toFixed(1)}</span>
                    </div>
                  </li>

                </ul>
              </div>
            </div>

          </div>
        </div>
      </motion.div>

      {/* Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#FBFDFF] w-full max-w-lg rounded-3xl shadow-2xl p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-heading font-extrabold text-fox-text-main flex items-center gap-2">
                <MessageSquare size={24} className="text-fox-primary" /> Nuevo Mensaje
              </h3>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-fox-text-muted hover:text-fox-text-main transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
               <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Para</label>
               <div className="flex items-center gap-3 p-3 bg-fox-bg border border-fox-border rounded-xl">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fox-primary/20 to-fox-purple/20 flex items-center justify-center font-extrabold text-fox-primary text-xs">
                    {student.name.split(' ').map((n: string) => n[0]).join('')}
                 </div>
                 <span className="text-sm font-bold text-fox-text-main">{student.name}</span>
               </div>
            </div>

            <div className="flex-1 mb-6">
              <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Mensaje Sugerido por Foxy</label>
              <textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                className="w-full h-48 p-4 text-sm text-fox-text-main font-medium border border-fox-border rounded-2xl bg-white focus:outline-none focus:border-fox-primary focus:ring-2 focus:ring-fox-primary/20 transition-all resize-none"
              />
              <p className="text-[10px] font-medium text-fox-text-muted mt-2 flex items-center gap-1"><Sparkles size={12} className="text-fox-purple"/> Mensaje autogenerado basado en el rendimiento</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-fox-text-muted hover:bg-fox-bg transition-colors"
               >
                Cancelar
              </button>
              <button
                onClick={handleSendMessage}
                className="flex items-center gap-2 bg-fox-primary hover:bg-fox-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
              >
                <Send size={16} /> Enviar Mensaje
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
