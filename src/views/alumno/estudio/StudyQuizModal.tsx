import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  X, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Sparkles, 
  Trophy, 
  RotateCcw, 
  ArrowRight,
  Clock,
  BookOpen,
  Award
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudyQuiz, StudyQuizQuestion } from './estudioTypes';

interface StudyQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: StudyQuiz;
  onComplete?: (score: number, total: number) => void;
}

export const StudyQuizModal: React.FC<StudyQuizModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onComplete
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Array<{ questionIdx: number; selected: number; isCorrect: boolean }>>([]);

  if (!isOpen) return null;

  const currentQ = quiz.questions[currentIdx] || quiz.questions[0];
  const totalQ = quiz.questions.length;

  const handleSelectOption = (index: number) => {
    if (hasAnswered) return;
    setSelectedOpt(index);
    setHasAnswered(true);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
      toast.show('🎉 ¡Respuesta Correcta!', 'success');
    } else {
      toast.show('❌ Respuesta Incorrecta', 'error');
    }

    setUserAnswers(prev => [
      ...prev,
      { questionIdx: currentIdx, selected: index, isCorrect }
    ]);
  };

  const handleNext = () => {
    if (currentIdx < totalQ - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOpt(null);
      setHasAnswered(false);
    } else {
      setIsFinished(true);
      if (onComplete) {
        onComplete(score + (selectedOpt === currentQ.correctIndex ? 1 : 0), totalQ);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setHasAnswered(false);
    setScore(0);
    setIsFinished(false);
    setUserAnswers([]);
  };

  const percentage = Math.round((score / totalQ) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-fox-border bg-fox-bg/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fox-orange/10 text-fox-orange flex items-center justify-center font-bold">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg line-clamp-1">
                {quiz.title}
              </h3>
              <p className="text-xs text-fox-text-muted flex items-center gap-2">
                <span>{quiz.folderName}</span>
                <span>•</span>
                <span className="text-fox-orange font-bold capitalize">Dificultad {quiz.difficulty}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col justify-between space-y-6">
          {!isFinished ? (
            <>
              {/* Progress & Indicators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-fox-text-muted">
                  <span>Pregunta {currentIdx + 1} de {totalQ}</span>
                  <span className="text-fox-orange flex items-center gap-1 font-extrabold">
                    <Sparkles size={13} /> {score} Acertadas
                  </span>
                </div>
                <div className="w-full bg-fox-bg border border-fox-border h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-fox-orange to-fox-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Box */}
              <div className="space-y-4">
                <div className="bg-fox-bg/50 border border-fox-border rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-fox-text-muted mb-1 block">
                    Tema: {currentQ.topic}
                  </span>
                  <h4 className="font-heading font-bold text-base sm:text-lg text-fox-text-main leading-snug">
                    {currentQ.question}
                  </h4>
                </div>

                {/* Options list */}
                <div className="space-y-2.5">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = selectedOpt === idx;
                    const isCorrect = idx === currentQ.correctIndex;
                    const letter = String.fromCharCode(65 + idx);

                    let itemClass = "w-full text-left p-4 rounded-2xl border-2 transition-all font-medium text-sm flex items-start gap-3 cursor-pointer ";

                    if (hasAnswered) {
                      if (isCorrect) {
                        itemClass += "border-emerald-500 bg-emerald-500/10 text-emerald-900 font-bold";
                      } else if (isSelected && !isCorrect) {
                        itemClass += "border-red-500 bg-red-500/10 text-red-900 opacity-90";
                      } else {
                        itemClass += "border-fox-border bg-fox-bg/30 opacity-40";
                      }
                    } else {
                      itemClass += "border-fox-border bg-fox-surface hover:border-fox-orange/50 hover:bg-fox-orange/5 text-fox-text-main";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={hasAnswered}
                        className={itemClass}
                      >
                        <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                          hasAnswered && isCorrect 
                            ? 'bg-emerald-500 text-white' 
                            : hasAnswered && isSelected && !isCorrect 
                              ? 'bg-red-500 text-white' 
                              : 'bg-fox-bg border border-fox-border text-fox-text-muted'
                        }`}>
                          {letter}
                        </span>
                        <span className="flex-1 leading-snug">{option}</span>
                        {hasAnswered && isCorrect && (
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        {hasAnswered && isSelected && !isCorrect && (
                          <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Socratic Pedagogical Explanation */}
                <AnimatePresence>
                  {hasAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                        selectedOpt === currentQ.correctIndex 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900' 
                          : 'bg-fox-orange/10 border-fox-orange/20 text-fox-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <Sparkles size={14} className={selectedOpt === currentQ.correctIndex ? 'text-emerald-600' : 'text-fox-orange'} />
                        <span>Explicación Socrática de Foxy:</span>
                      </div>
                      <p>{currentQ.explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNext}
                  disabled={!hasAnswered}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-fox-orange text-white hover:bg-fox-orange/90 font-bold text-xs shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>{currentIdx < totalQ - 1 ? 'Siguiente Pregunta' : 'Ver Resultados Finales'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          ) : (
            /* Results View */
            <div className="py-8 text-center space-y-6 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-fox-orange/10 text-fox-orange border border-fox-orange/20 flex items-center justify-center animate-bounce">
                {percentage >= 80 ? <Trophy size={40} /> : <Award size={40} />}
              </div>

              <div>
                <h4 className="font-heading font-extrabold text-xl sm:text-2xl text-fox-text-main">
                  {percentage >= 80 ? '¡Excelente Desempeño!' : percentage >= 60 ? '¡Buen Trabajo de Repaso!' : '¡A Reforzar Conceptos!'}
                </h4>
                <p className="text-xs sm:text-sm text-fox-text-muted max-w-md mx-auto mt-1">
                  Obtuviste <strong>{score} de {totalQ} correctas</strong> ({percentage}% de precisión) en {quiz.topic}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                  <p className="text-xs text-emerald-800 font-bold">Aciertos</p>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5">{score}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                  <p className="text-xs text-red-800 font-bold">A corregir</p>
                  <p className="text-2xl font-black text-red-500 mt-0.5">{totalQ - score}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-fox-border bg-fox-surface hover:bg-fox-bg text-fox-text-main font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Volver a intentar</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-fox-orange text-white hover:bg-fox-orange/90 font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <span>Continuar Estudiando</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
