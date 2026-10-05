import React, { useState } from 'react';
import { Sparkles, CalendarCheck, Search, ListTodo, Bot, X, Maximize2, Minimize2, Send, Plus, Check, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../../../components/ui/Toaster';

export interface CalendarEvent {
  id: string;
  title: string;
  type?: string;
  startHour: number;
  duration: number;
  date: string;
  endDate?: string;
  isAllDay?: boolean;
  repeat?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly';
  color: 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'pink' | 'yellow';
  location?: string;
  isTask?: boolean;
  subject?: string;
  notes?: string;
}

interface AgendaFoxyAssistantProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onOptimizeSchedule: (optimizedEvents: CalendarEvent[]) => void;
}

interface SuggestedSlot {
  title: string;
  type: string;
  day: string;
  date: string;
  startHour: number;
  duration: number;
  subject: string;
  color: 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'pink' | 'yellow';
  reason: string;
}

export function AgendaFoxyAssistant({ events, onAddEvent }: AgendaFoxyAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'suggestions'>('suggestions');
  const [inputMessage, setInputMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([
    {
      title: 'Corrección de Ensayos (Vanguardias)',
      type: 'Tarea',
      day: 'Martes',
      date: new Date().toISOString().split('T')[0],
      startHour: 15,
      duration: 1.5,
      subject: 'Literatura 3°A',
      color: 'purple',
      reason: 'Tienes un bloque libre de 2hs después del mediodía antes de la entrega de notas.'
    },
    {
      title: 'Tutoría de Apoyo DUA',
      type: 'Tutoría',
      day: 'Jueves',
      date: new Date().toISOString().split('T')[0],
      startHour: 11.5,
      duration: 1,
      subject: 'Historia 2°B',
      color: 'orange',
      reason: 'Espacio ideal para refuerzo con alumnos en alerta antes del examen trimestral.'
    },
    {
      title: 'Planificación Módulo 4',
      type: 'Planificación',
      day: 'Viernes',
      date: new Date().toISOString().split('T')[0],
      startHour: 9,
      duration: 1,
      subject: 'Matemáticas 1°C',
      color: 'green',
      reason: 'Cierre de semana para estructurar actividades de la siguiente unidad temática.'
    }
  ]);

  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'foxy'; text: string; action?: string }>>([
    {
      id: '1',
      sender: 'foxy',
      text: '¡Hola, Profe! Soy Foxy, tu copiloto pedagógico. Puedo analizar tu calendario semanal, encontrar huecos libres para corrección o tutorías, y organizar tus lecciones DUA.'
    }
  ]);

  const handleSend = (presetQuery?: string) => {
    const textToSend = presetQuery || inputMessage.trim();
    if (!textToSend) return;

    const userMsgId = Date.now().toString();
    setChatMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: textToSend }]);
    if (!presetQuery) setInputMessage('');
    setIsAnalyzing(true);

    setTimeout(() => {
      let replyText = '';
      if (textToSend.toLowerCase().includes('hueco') || textToSend.toLowerCase().includes('libre')) {
        replyText = `He analizado tu semana laboral. Tienes un hueco óptimo el **Martes a las 15:00 hs (90 min)** y el **Jueves a las 11:30 hs (60 min)**. Te sugiero reservarlos para corrección o tutorías personalizadas.`;
      } else if (textToSend.toLowerCase().includes('optimi') || textToSend.toLowerCase().includes('agenda')) {
        replyText = `Tu agenda tiene buena distribución en las mañanas. Para evitar fatiga cognitiva docente, te recomiendo agrupar las reuniones los viernes y adelantar la preparación de Literatura 3°A al miércoles por la tarde.`;
      } else if (textToSend.toLowerCase().includes('resumen') || textToSend.toLowerCase().includes('semana')) {
        replyText = `**Resumen semanal:** Tienes 4 bloques de clases dictadas, 2 entregas de tareas programadas y 1 reunión institucional. Carga horaria total estimada: 18 horas lectivas.`;
      } else {
        replyText = `Entendido. He procesado tu solicitud sobre: "${textToSend}". Puedo proponerte un bloque en tu agenda o ajustar tus planificaciones escolares automáticamente.`;
      }

      setChatMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: 'foxy', text: replyText }
      ]);
      setIsAnalyzing(false);
    }, 800);
  };

  const handleApplySuggestion = (slot: SuggestedSlot) => {
    onAddEvent({
      title: slot.title,
      type: slot.type,
      startHour: slot.startHour,
      duration: slot.duration,
      date: slot.date,
      color: slot.color,
      subject: slot.subject,
      repeat: 'none',
      isAllDay: false
    });
    setSuggestedSlots(prev => prev.filter(s => s.title !== slot.title));
    toast.show(`✨ Agendado: ${slot.title}`, 'success');
  };

  return (
    <>
      {/* Trigger Button if closed */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-fox-primary to-fox-orange text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-heading font-bold hover:shadow-2xl hover:scale-105 transition-all border border-white/20 group"
          id="btn-open-agenda-foxy"
        >
          <div className="relative">
            <Sparkles size={20} className="animate-spin-slow text-yellow-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-fox-primary"></span>
          </div>
          <span className="text-sm">Asistente Foxy</span>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-sans font-medium">IA Agenda</span>
        </motion.button>
      )}

      {/* Floating / Expanded Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className={`fixed z-50 bg-fox-surface border border-fox-border shadow-2xl rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${
              isExpanded
                ? 'inset-4 md:inset-10 max-w-5xl mx-auto h-[calc(100vh-5rem)]'
                : 'bottom-6 right-6 w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh]'
            }`}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-fox-primary via-[#1c365d] to-fox-orange text-white flex items-center justify-between shadow-md select-none">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-yellow-300">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm leading-tight flex items-center gap-2">
                    Copiloto Foxy Agenda
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-sans font-normal text-blue-100">En vivo</span>
                  </h3>
                  <p className="text-[11px] text-blue-100/80">Optimización y sugerencias de calendario</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-blue-100 hover:text-white transition-colors"
                  title={isExpanded ? "Reducir ventana" : "Ampliar ventana"}
                  id="btn-expand-foxy"
                >
                  {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-blue-100 hover:text-white transition-colors"
                  title="Cerrar"
                  id="btn-close-foxy"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside Foxy */}
            <div className="flex border-b border-fox-border bg-fox-bg/60 px-4 pt-2 gap-2">
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'suggestions'
                    ? 'border-fox-orange text-fox-orange'
                    : 'border-transparent text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                <CalendarCheck size={14} /> Sugerencias ({suggestedSlots.length})
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'border-fox-orange text-fox-orange'
                    : 'border-transparent text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                <Bot size={14} /> Consultar con Foxy
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-fox-surface">
              {activeTab === 'suggestions' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-fox-orange/10 border border-fox-orange/20 rounded-2xl flex items-start gap-3">
                    <Sparkles size={18} className="text-fox-orange shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-fox-text-main">3 recomendaciones para esta semana</p>
                      <p className="text-fox-text-muted mt-0.5">Puedes agregar estos bloques a tu agenda con un solo clic.</p>
                    </div>
                  </div>

                  {suggestedSlots.length === 0 ? (
                    <div className="text-center py-10 text-fox-text-muted text-xs">
                      <Check size={32} className="mx-auto text-green-500 mb-2" />
                      ¡Todas las sugerencias han sido añadidas a tu calendario!
                    </div>
                  ) : (
                    suggestedSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-fox-bg rounded-2xl border border-fox-border hover:border-fox-orange/40 transition-all flex flex-col gap-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-primary/10 text-fox-primary">
                              {slot.type}
                            </span>
                            <h4 className="font-bold text-sm text-fox-text-main mt-1">{slot.title}</h4>
                            <p className="text-xs text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                              <Clock size={12} className="text-fox-orange" /> {slot.day} · {slot.startHour}:00 ({slot.duration}h) · <span className="font-medium text-fox-text-main/80">{slot.subject}</span>
                            </p>
                          </div>
                        </div>

                        <p className="text-[11px] text-fox-text-muted bg-fox-surface p-2 rounded-xl border border-fox-border/60 italic">
                          💡 {slot.reason}
                        </p>

                        <button
                          onClick={() => handleApplySuggestion(slot)}
                          className="w-full bg-fox-orange text-white py-2 px-3 rounded-xl text-xs font-bold hover:bg-fox-orange/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Plus size={14} /> Añadir a mi Agenda
                        </button>
                      </div>
                    ))
                  )}

                  {/* Quick Action Pills */}
                  <div className="pt-2 border-t border-fox-border space-y-2">
                    <p className="text-[11px] font-bold text-fox-text-muted uppercase tracking-wider">Acciones Rápidas con IA</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => { setActiveTab('chat'); handleSend('Optimiza mi agenda detectando solapamientos y pausas'); }}
                        className="p-2.5 bg-fox-surface border border-fox-border hover:border-fox-primary text-fox-text-main rounded-xl text-xs font-medium text-left flex items-center justify-between group transition-colors"
                      >
                        <span className="flex items-center gap-2"><CalendarCheck size={14} className="text-fox-primary" /> Optimizar semana</span>
                        <ArrowRight size={12} className="text-fox-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      <button
                        onClick={() => { setActiveTab('chat'); handleSend('Buscar huecos libres de 45 a 90 minutos para corrección'); }}
                        className="p-2.5 bg-fox-surface border border-fox-border hover:border-fox-primary text-fox-text-main rounded-xl text-xs font-medium text-left flex items-center justify-between group transition-colors"
                      >
                        <span className="flex items-center gap-2"><Search size={14} className="text-fox-orange" /> Detectar huecos</span>
                        <ArrowRight size={12} className="text-fox-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat view */
                <div className="flex flex-col h-full space-y-3">
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {chatMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'foxy' && (
                          <div className="w-7 h-7 rounded-xl bg-fox-orange text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Sparkles size={14} />
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                            msg.sender === 'user'
                              ? 'bg-fox-orange text-white rounded-br-none'
                              : 'bg-fox-bg text-fox-text-main border border-fox-border rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isAnalyzing && (
                      <div className="flex items-center gap-2 text-xs text-fox-text-muted p-2">
                        <RefreshCw size={14} className="animate-spin text-fox-orange" />
                        Foxy está analizando tu calendario escolar...
                      </div>
                    )}
                  </div>

                  {/* Input Box */}
                  <div className="pt-2 border-t border-fox-border flex items-center gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Pregunta a Foxy sobre tu agenda..."
                      className="flex-1 px-3 py-2 text-xs bg-fox-bg border border-fox-border rounded-xl focus:outline-none focus:border-fox-orange"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!inputMessage.trim()}
                      className="p-2 bg-fox-orange text-white rounded-xl hover:bg-fox-orange/90 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
