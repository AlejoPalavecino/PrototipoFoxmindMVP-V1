import React, { useState } from 'react';
import { 
  X, BrainCircuit, Sparkles, CheckCircle2, FileText, 
  Send, HelpCircle, ChevronRight, AlertCircle, 
  BookOpen, Lightbulb, MessageSquare, RotateCcw, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../ui/Toaster';

interface StudentFoxyTutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activityTitle: string;
  subjectName: string;
  activityDescription?: string;
  duaProfile?: string;
}

interface Message {
  id: string;
  sender: 'foxy' | 'student';
  text: string;
  timestamp: string;
  isSocraticHint?: boolean;
}

export function StudentFoxyTutorDrawer({
  isOpen,
  onClose,
  activityTitle,
  subjectName,
  activityDescription,
  duaProfile,
}: StudentFoxyTutorDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'foxy',
      text: `¡Hola! Soy Foxy, tu tutor socrático para **${activityTitle}** (${subjectName}). 🦊✨\n\nMi objetivo es ayudarte a pensar, aclarar dudas sobre las consignas y guiarte paso a paso. Recuerda que no te daré las respuestas directas, ¡sino las preguntas y pistas clave para que las descubras tú mismo!\n\n¿Por dónde te gustaría empezar?`,
      timestamp: 'Ahora'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const socraticPrompts = [
    { label: '¿Cómo estructurar mi entrega?', prompt: '¿Cómo me recomiendas organizar la introducción, desarrollo y conclusión de esta actividad?' },
    { label: 'No entiendo el punto principal', prompt: 'No me queda del todo clara la consigna principal. ¿Me la explicas con un ejemplo cotidiano?' },
    { label: 'Pista para argumentar', prompt: '¿Qué preguntas guía debería hacerme para argumentar mejor mi postura?' },
    { label: 'Revisar si voy por buen camino', prompt: 'Tengo una idea inicial pero no sé si responde a lo que pide la actividad. ¿Podemos revisarla?' }
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'student',
      text: text.trim(),
      timestamp: 'Ahora'
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    // Simulate Socratic AI tutor responses
    setTimeout(() => {
      setIsTyping(false);
      let reply = '';
      const lower = text.toLowerCase();

      if (lower.includes('estructurar') || lower.includes('organizar') || lower.includes('introducción')) {
        reply = `¡Excelente pregunta! Para ordenar tu trabajo, te propongo este esquema de 3 pasos:\n\n1. **Apertura (1 párrafo):** Presenta el tema central y por qué es relevante. Pregúntate: *¿Qué problema o concepto estoy abordando?*\n2. **Desarrollo (2-3 párrafos):** Contrasta las dos ideas clave con un ejemplo para cada una. Pregúntate: *¿En qué se diferencian y en qué coinciden?*\n3. **Cierre / Reflexión:** Resume tu propia conclusión con tus palabras.\n\n¿Cuál de estas tres partes sientes que te costará más redactar?`;
      } else if (lower.includes('ejemplo') || lower.includes('no entiendo') || lower.includes('consigna')) {
        reply = `Vamos a descomponerlo juntos. Imagina que tienes que explicarle este tema a un amigo que nunca lo escuchó.\n\nLa consigna te pide que identifiques **dos ideas principales** y expliques **cómo se aplican**. Piensa en el material que leímos: ¿Qué fue lo primero que te llamó la atención o te pareció novedoso? Cuéntamelo en una frase corta.`;
      } else if (lower.includes('pista') || lower.includes('argumentar') || lower.includes('preguntas')) {
        reply = `Aquí va una pista socrática para fortalecer tu argumento 💡:\n\nPregúntate: *¿Qué evidencia o ejemplo del texto respalda lo que estoy diciendo?*\n\nSi afirmas que una postura es más innovadora, busca una cita o dato que demuestre esa innovación. ¿Qué texto de la biblioteca estás usando como referencia?`;
      } else {
        reply = `¡Muy buena reflexión! Estás tocando un punto central.\n\nPara avanzar con eso: ¿Cómo crees que se relaciona lo que acabas de mencionar con la consigna de **${activityTitle}**? Intenta relacionarlo con el autor o concepto principal que vimos en clase.`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'foxy',
          text: reply,
          timestamp: 'Ahora',
          isSocraticHint: true
        }
      ]);
    }, 1400);
  };

  const handlePlayAudio = (text: string) => {
    setIsPlayingAudio(true);
    toast.show('🔊 Reproduciendo tutoría socrática de Foxy...', 'info');
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 3000);
  };

  const handleRestartChat = () => {
    setMessages([
      {
        id: '1',
        sender: 'foxy',
        text: `¡Conversación reiniciada! Estoy listo para orientarte con **${activityTitle}**. ¿Qué duda o concepto quieres explorar ahora?`,
        timestamp: 'Ahora'
      }
    ]);
    toast.show('Tutoría reiniciada', 'info');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs p-0 sm:p-3">
        <motion.div
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="bg-fox-surface w-full max-w-xl h-full sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-fox-border"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-fox-border bg-gradient-to-r from-fox-purple/10 via-fox-purple/5 to-fox-primary/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-fox-purple text-white flex items-center justify-center shadow-md shadow-fox-purple/20">
                <BrainCircuit size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg">
                    Tutor Foxy
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-fox-purple/15 text-fox-purple border border-fox-purple/20">
                    Socrático
                  </span>
                </div>
                <p className="text-xs text-fox-text-muted font-medium truncate max-w-[260px] sm:max-w-xs">
                  Orientación para {activityTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRestartChat}
                className="p-2 text-fox-text-muted hover:text-fox-purple hover:bg-fox-purple/10 rounded-xl transition-colors"
                title="Reiniciar conversación"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-border/50 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Socratic Banner */}
          <div className="px-5 py-2.5 bg-fox-bg border-b border-fox-border/70 flex items-center gap-2 text-[11px] font-semibold text-fox-text-muted">
            <Lightbulb size={14} className="text-fox-orange shrink-0" />
            <span>Foxy te hace preguntas guía para que pienses y desarrolles tu propia respuesta.</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-fox-bg/40">
            {messages.map((msg) => {
              const isFoxy = msg.sender === 'foxy';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isFoxy ? 'items-start' : 'items-end justify-end'}`}
                >
                  {isFoxy && (
                    <div className="w-8 h-8 rounded-xl bg-fox-purple/15 text-fox-purple font-bold text-xs flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                      🦊
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isFoxy
                        ? 'bg-fox-surface border border-fox-border text-fox-text-main font-medium'
                        : 'bg-fox-primary text-white font-semibold rounded-br-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {isFoxy && (
                      <div className="mt-2.5 pt-2 border-t border-fox-border/50 flex items-center justify-between text-[10px] text-fox-text-muted">
                        <span className="font-semibold">{msg.timestamp}</span>
                        <button
                          onClick={() => handlePlayAudio(msg.text)}
                          className="flex items-center gap-1 hover:text-fox-purple transition-colors font-bold px-1.5 py-0.5 rounded-md hover:bg-fox-purple/10"
                        >
                          <Volume2 size={12} className={isPlayingAudio ? 'animate-bounce text-fox-purple' : ''} />
                          <span>Escuchar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-xl bg-fox-purple/15 text-fox-purple font-bold text-xs flex items-center justify-center shrink-0">
                  🦊
                </div>
                <div className="bg-fox-surface border border-fox-border rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-1.5 text-fox-purple">
                  <div className="w-1.5 h-1.5 rounded-full bg-fox-purple animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-fox-purple animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-fox-purple animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[11px] font-bold ml-1.5 text-fox-text-muted">Foxy está pensando una pregunta guía...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="p-3 sm:px-4 sm:py-3 bg-fox-surface border-t border-fox-border">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-fox-text-muted mb-2 px-1 flex items-center gap-1">
              <Sparkles size={11} className="text-fox-purple" /> Preguntas sugeridas
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {socraticPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.prompt)}
                  className="text-[11px] font-bold text-fox-text-main bg-fox-bg hover:bg-fox-purple/10 hover:text-fox-purple border border-fox-border hover:border-fox-purple/30 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shadow-2xs shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 border-t border-fox-border bg-fox-surface flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntale a Foxy sobre la consigna o ideas..."
              className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-4 py-3 text-xs sm:text-sm text-fox-text-main font-medium focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-3 bg-fox-purple text-white rounded-xl hover:bg-fox-purple/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
