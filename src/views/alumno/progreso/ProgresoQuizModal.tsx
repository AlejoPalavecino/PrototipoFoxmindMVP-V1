import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, CheckCircle2, AlertCircle, Award, ArrowRight, Brain, RefreshCw, Trophy, Flame } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

interface ProgresoQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCompleted: (earnedXp: number, correctAnswers: number, totalQuestions: number) => void;
  initialTopic?: string;
}

const mathQuestions: Question[] = [
  {
    id: 1,
    topic: 'Fracciones y Operaciones',
    question: '¿Cuál es el resultado simplificado de sumar 1/4 + 2/3?',
    options: ['3/7', '11/12', '3/12', '8/12'],
    correctIndex: 1,
    explanation: 'El común denominador entre 4 y 3 es 12. Entonces: 3/12 + 8/12 = 11/12 (fracción irreducible).',
  },
  {
    id: 2,
    topic: 'Fracciones Equivalentes',
    question: '¿Cuál de las siguientes fracciones es equivalente a 3/5?',
    options: ['6/15', '9/15', '12/25', '15/20'],
    correctIndex: 1,
    explanation: 'Multiplicando numerador y denominador por 3: (3 × 3) / (5 × 3) = 9/15.',
  },
  {
    id: 3,
    topic: 'Problemas con Porcentajes',
    question: 'Si un libro cuesta $400 y tiene un descuento del 25%, ¿cuánto pagas?',
    options: ['$300', '$320', '$350', '$100'],
    correctIndex: 0,
    explanation: 'El 25% de 400 es 100 (400 × 0.25). Por lo tanto, 400 - 100 = $300.',
  },
];

export function ProgresoQuizModal({ isOpen, onClose, onQuizCompleted, initialTopic = 'Matemáticas' }: ProgresoQuizModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const currentQ = mathQuestions[currentStep];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentQ.correctIndex) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentStep < mathQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
      const earnedXp = (correctCount + (selectedOption === currentQ.correctIndex ? 1 : 0)) * 25 + 25; // Bonus completion
      onQuizCompleted(earnedXp, correctCount + (selectedOption === currentQ.correctIndex ? 1 : 0), mathQuestions.length);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setCorrectCount(0);
    setIsFinished(false);
  };

  const isCurrentCorrect = selectedOption === currentQ?.correctIndex;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fox-surface border border-fox-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-fox-border flex items-center justify-between bg-fox-bg/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-fox-orange/10 text-fox-orange flex items-center justify-center font-bold">
              <Brain size={18} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-fox-text-main text-base">
                Quiz Rápido de Refuerzo · {initialTopic}
              </h3>
              <p className="text-xs text-fox-text-muted">Active Recall guiado por Foxy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-fox-border text-fox-text-muted hover:text-fox-text-main transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isFinished ? (
            <div>
              {/* Progress Tracker */}
              <div className="flex items-center justify-between text-xs font-bold text-fox-text-muted mb-2">
                <span>Pregunta {currentStep + 1} de {mathQuestions.length}</span>
                <span className="text-fox-primary flex items-center gap-1">
                  <Sparkles size={13} /> +25 XP por acierto
                </span>
              </div>
              <div className="w-full bg-fox-border/50 h-2 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-gradient-to-r from-fox-orange to-fox-gold transition-all duration-300 rounded-full"
                  style={{ width: `${((currentStep + 1) / mathQuestions.length) * 100}%` }}
                />
              </div>

              {/* Tag */}
              <span className="inline-block bg-fox-orange/10 text-fox-orange border border-fox-orange/20 text-xs font-bold px-2.5 py-1 rounded-lg mb-3">
                {currentQ.topic}
              </span>

              {/* Question Text */}
              <h4 className="text-lg font-heading font-bold text-fox-text-main mb-5 leading-snug">
                {currentQ.question}
              </h4>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, idx) => {
                  let optionStyle = "bg-fox-bg border-fox-border text-fox-text-main hover:border-fox-primary/60 hover:bg-fox-surface";
                  
                  if (selectedOption === idx) {
                    optionStyle = "bg-fox-primary/10 border-fox-primary text-fox-text-main shadow-sm ring-1 ring-fox-primary";
                  }

                  if (isAnswerSubmitted) {
                    if (idx === currentQ.correctIndex) {
                      optionStyle = "bg-fox-green/15 border-fox-green text-fox-text-main ring-1 ring-fox-green font-bold";
                    } else if (selectedOption === idx && idx !== currentQ.correctIndex) {
                      optionStyle = "bg-fox-red/15 border-fox-red text-fox-text-main ring-1 ring-fox-red";
                    } else {
                      optionStyle = "bg-fox-bg/50 border-fox-border/50 text-fox-text-muted/60 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerSubmitted}
                      className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl border border-fox-border bg-fox-surface flex items-center justify-center font-bold text-xs text-fox-text-muted shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="font-medium text-sm">{opt}</span>
                      </div>

                      {isAnswerSubmitted && idx === currentQ.correctIndex && (
                        <CheckCircle2 size={18} className="text-fox-green shrink-0" />
                      )}
                      {isAnswerSubmitted && selectedOption === idx && idx !== currentQ.correctIndex && (
                        <AlertCircle size={18} className="text-fox-red shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Box when submitted */}
              <AnimatePresence>
                {isAnswerSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-4 rounded-2xl border text-sm mb-4 ${
                      isCurrentCorrect
                        ? 'bg-fox-green/10 border-fox-green/30 text-fox-text-main'
                        : 'bg-fox-orange/10 border-fox-orange/30 text-fox-text-main'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {isCurrentCorrect ? (
                        <>
                          <CheckCircle2 size={16} className="text-fox-green" />
                          <span className="text-fox-green">¡Correcto! (+25 XP)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} className="text-fox-orange" />
                          <span className="text-fox-orange">Explicación de Foxy</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-fox-text-muted leading-relaxed">
                      {currentQ.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Results Screen */
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-fox-gold to-yellow-300 text-fox-text-main flex items-center justify-center mx-auto mb-4 shadow-lg ring-8 ring-fox-gold/20">
                <Trophy size={40} className="text-amber-900" />
              </div>

              <span className="bg-fox-green/10 text-fox-green border border-fox-green/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                ¡Quiz Completado!
              </span>

              <h4 className="text-2xl font-heading font-bold text-fox-text-main mt-3 mb-1">
                {correctCount === mathQuestions.length
                  ? '¡Puntaje Perfecto!'
                  : correctCount > 1
                  ? '¡Excelente Esfuerzo!'
                  : 'Buen intento, sigamos practicando'}
              </h4>
              <p className="text-sm text-fox-text-muted max-w-md mx-auto mb-6">
                Has reforzado conceptos clave de Matemáticas. Tu retención en este tema aumentó +15%.
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
                <div className="p-3 bg-fox-bg border border-fox-border rounded-2xl">
                  <div className="text-xs text-fox-text-muted font-bold">Aciertos</div>
                  <div className="text-xl font-heading font-bold text-fox-text-main mt-1">
                    {correctCount}/{mathQuestions.length}
                  </div>
                </div>
                <div className="p-3 bg-fox-bg border border-fox-border rounded-2xl">
                  <div className="text-xs text-fox-text-muted font-bold">XP Ganado</div>
                  <div className="text-xl font-heading font-bold text-fox-gold mt-1 flex items-center justify-center gap-1">
                    <Award size={18} /> +{correctCount * 25 + 25}
                  </div>
                </div>
                <div className="p-3 bg-fox-bg border border-fox-border rounded-2xl">
                  <div className="text-xs text-fox-text-muted font-bold">Racha</div>
                  <div className="text-xl font-heading font-bold text-fox-orange mt-1 flex items-center justify-center gap-1">
                    <Flame size={18} /> 7 días
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-fox-border bg-fox-bg/40 flex items-center justify-between">
          {!isFinished ? (
            <>
              <button
                onClick={onClose}
                className="text-xs font-bold text-fox-text-muted hover:text-fox-text-main transition-colors"
              >
                Pausar por ahora
              </button>
              {!isAnswerSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                    selectedOption !== null
                      ? 'bg-fox-primary text-white hover:bg-fox-primary/90'
                      : 'bg-fox-border text-fox-text-muted/60 cursor-not-allowed'
                  }`}
                >
                  Comprobar Respuesta
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-fox-primary text-white hover:bg-fox-primary/90 shadow-sm flex items-center gap-2"
                >
                  {currentStep < mathQuestions.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultados'}{' '}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handleRestart}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-fox-border hover:bg-fox-bg text-fox-text-main transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} /> Reintentar Quiz
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-fox-primary text-white hover:bg-fox-primary/90 shadow-sm"
              >
                Volver a Mi Progreso
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
