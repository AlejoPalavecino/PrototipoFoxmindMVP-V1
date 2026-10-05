import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  X, 
  RotateCw, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Trophy, 
  RefreshCw,
  Eye,
  BookOpen
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudyFlashcardDeck, StudyFlashcard } from './estudioTypes';

interface StudyFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: StudyFlashcardDeck;
  onUpdateDeck?: (updated: StudyFlashcardDeck) => void;
}

export const StudyFlashcardModal: React.FC<StudyFlashcardModalProps> = ({
  isOpen,
  onClose,
  deck,
  onUpdateDeck
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cardsState, setCardsState] = useState<StudyFlashcard[]>(deck.cards);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  if (!isOpen) return null;

  const currentCard = cardsState[currentIndex] || cardsState[0];
  const totalCards = cardsState.length;
  const masteredCount = cardsState.filter(c => c.mastered).length;
  const masteryPercentage = Math.round((masteredCount / totalCards) * 100);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMarkMastery = (mastered: boolean) => {
    const updated = [...cardsState];
    updated[currentIndex] = {
      ...updated[currentIndex],
      mastered,
      timesReviewed: (updated[currentIndex].timesReviewed || 0) + 1
    };
    setCardsState(updated);

    if (mastered) {
      toast.show('🎉 ¡Excelente! Tarjeta dominada', 'success');
    } else {
      toast.show('💡 Anotada para repasar en la próxima vuelta', 'info');
    }

    // Auto-advance
    if (currentIndex < totalCards - 1) {
      setTimeout(() => {
        setIsFlipped(false);
        setShowHint(false);
        setCurrentIndex(currentIndex + 1);
      }, 400);
    } else {
      setSessionCompleted(true);
      if (onUpdateDeck) {
        onUpdateDeck({
          ...deck,
          cards: updated,
          masteryPercentage: Math.round((updated.filter(c => c.mastered).length / totalCards) * 100),
          lastReviewed: 'Hoy'
        });
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionCompleted(false);
  };

  const handleReviewWeakOnly = () => {
    const weakCards = cardsState.filter(c => !c.mastered);
    if (weakCards.length === 0) {
      toast.show('¡Ya dominás todas las tarjetas de este mazo!', 'success');
      return;
    }
    setCardsState(weakCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionCompleted(false);
    toast.show(`Repasando ${weakCards.length} tarjetas pendientes`, 'info');
  };

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
            <div className="w-10 h-10 rounded-2xl bg-fox-purple/10 text-fox-purple flex items-center justify-center font-bold">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg line-clamp-1">
                {deck.title}
              </h3>
              <p className="text-xs text-fox-text-muted flex items-center gap-2">
                <span>{deck.folderName}</span>
                <span>•</span>
                <span className="text-fox-purple font-bold">{deck.topic}</span>
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

        {/* Body Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col justify-between space-y-6">
          {!sessionCompleted ? (
            <>
              {/* Progress Bar & Indicators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-fox-text-muted">
                  <span>Tarjeta {currentIndex + 1} de {totalCards}</span>
                  <span className="text-fox-purple flex items-center gap-1">
                    <Sparkles size={13} /> {masteryPercentage}% Dominado
                  </span>
                </div>
                <div className="w-full bg-fox-bg border border-fox-border h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-fox-purple to-fox-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
                  />
                </div>
              </div>

              {/* 3D Flip Card Container */}
              <div 
                onClick={handleFlip}
                className="relative w-full min-h-[260px] sm:min-h-[300px] cursor-pointer group perspective-1000"
              >
                <motion.div
                  className="w-full h-full min-h-[260px] sm:min-h-[300px] rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-center transition-all duration-300 border shadow-md relative"
                  style={{
                    backgroundColor: isFlipped ? '#fcfbf8' : '#ffffff',
                    borderColor: isFlipped ? '#c084fc' : '#e2e8f0'
                  }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Card Badge */}
                  <div className="flex justify-between items-center w-full">
                    <span className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider ${
                      isFlipped 
                        ? 'bg-fox-purple/15 text-fox-purple border border-fox-purple/20' 
                        : 'bg-fox-bg border border-fox-border text-fox-text-muted'
                    }`}
                    style={{ transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
                    >
                      {isFlipped ? '💡 Respuesta / Concepto' : '❓ Pregunta / Término'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className="p-1.5 rounded-lg text-fox-text-muted hover:text-fox-purple hover:bg-fox-purple/5 transition-colors"
                      style={{ transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
                      title="Pista"
                    >
                      <HelpCircle size={16} />
                    </button>
                  </div>

                  {/* Card Content (Front / Back) */}
                  <div 
                    className="my-auto py-4 flex flex-col items-center justify-center space-y-3"
                    style={{ transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
                  >
                    <p className={`font-heading font-bold leading-relaxed ${
                      isFlipped 
                        ? 'text-fox-text-main text-base sm:text-lg' 
                        : 'text-fox-text-main text-lg sm:text-xl'
                    }`}>
                      {isFlipped ? currentCard.back : currentCard.front}
                    </p>

                    {showHint && currentCard.hint && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs px-3.5 py-2 rounded-xl mt-2 max-w-md"
                      >
                        <strong>Pista de Foxy:</strong> {currentCard.hint}
                      </motion.div>
                    )}
                  </div>

                  {/* Card Footer helper */}
                  <div 
                    className="flex justify-center items-center gap-1.5 text-xs text-fox-text-muted/70 font-medium"
                    style={{ transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
                  >
                    <RotateCw size={13} />
                    <span>Haz clic en la tarjeta o presiona espacio para voltear</span>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="p-2.5 rounded-xl border border-fox-border text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === totalCards - 1}
                    className="p-2.5 rounded-xl border border-fox-border text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleMarkMastery(false)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl border border-fox-border bg-fox-bg text-fox-text-muted hover:text-fox-orange hover:border-fox-orange/30 font-bold text-xs transition-all"
                  >
                    <AlertCircle size={15} />
                    <span>Repasar luego</span>
                  </button>
                  <button
                    onClick={() => handleMarkMastery(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl bg-fox-purple text-white hover:bg-fox-purple/90 font-bold text-xs shadow-sm hover:shadow-md transition-all"
                  >
                    <Check size={15} />
                    <span>¡La sabía! (Dominado)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Completed Session View */
            <div className="py-8 text-center space-y-6 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center animate-bounce">
                <Trophy size={40} />
              </div>

              <div>
                <h4 className="font-heading font-extrabold text-xl sm:text-2xl text-fox-text-main">
                  ¡Sesión de Flashcards Finalizada!
                </h4>
                <p className="text-xs sm:text-sm text-fox-text-muted max-w-md mx-auto mt-1">
                  Has repasado las {totalCards} tarjetas de <strong>{deck.topic}</strong>. Tu dominio actual es del {masteryPercentage}%.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-fox-bg border border-fox-border rounded-2xl p-4 text-center">
                  <p className="text-xs text-fox-text-muted font-bold">Dominadas</p>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5">{masteredCount}</p>
                </div>
                <div className="bg-fox-bg border border-fox-border rounded-2xl p-4 text-center">
                  <p className="text-xs text-fox-text-muted font-bold">Por reforzar</p>
                  <p className="text-2xl font-black text-fox-orange mt-0.5">{totalCards - masteredCount}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-fox-border bg-fox-surface hover:bg-fox-bg text-fox-text-main font-bold text-xs transition-all shadow-xs"
                >
                  <RefreshCw size={15} />
                  <span>Volver a repasar todo</span>
                </button>
                {totalCards - masteredCount > 0 && (
                  <button
                    onClick={handleReviewWeakOnly}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-fox-orange text-white hover:bg-fox-orange/90 font-bold text-xs transition-all shadow-xs"
                  >
                    <Sparkles size={15} />
                    <span>Repasar solo pendientes ({totalCards - masteredCount})</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-fox-purple text-white hover:bg-fox-purple/90 font-bold text-xs transition-all shadow-xs"
                >
                  <span>Listo, volver al estudio</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
