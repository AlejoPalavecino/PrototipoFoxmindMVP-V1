import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, BookOpen, Activity, Trophy, Calendar, Sparkles, 
  ArrowRight, Award, Zap, History, ChevronRight 
} from 'lucide-react';
import { useAppContext } from '../../context';
import { 
  mockSubjectMasteries, 
  mockUpcomingReviews, 
  mockDetailedAchievements, 
  mockActivityHistory 
} from './progreso/progresoData';
import { SubjectMastery, ReviewScheduleItem } from './progreso/progresoTypes';
import { ProgresoOverviewTab } from './progreso/ProgresoOverviewTab';
import { ProgresoMateriasTab } from './progreso/ProgresoMateriasTab';
import { ProgresoHabitosTab } from './progreso/ProgresoHabitosTab';
import { ProgresoLogrosTab } from './progreso/ProgresoLogrosTab';
import { ProgresoQuizModal } from './progreso/ProgresoQuizModal';
import { SubjectDetailModal } from './progreso/SubjectDetailModal';
import { HistoryModal } from './progreso/HistoryModal';

type ProgressTab = 'resumen' | 'materias' | 'habitos' | 'logros';

export function ProgresoAlumno() {
  const { setView } = useAppContext();
  
  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<ProgressTab>('resumen');
  
  // State for dynamic XP & Subjects
  const [currentXp, setCurrentXp] = useState(2450);
  const [subjects, setSubjects] = useState<SubjectMastery[]>(mockSubjectMasteries);
  const [reviews, setReviews] = useState<ReviewScheduleItem[]>(mockUpcomingReviews);
  const [achievements, setAchievements] = useState(mockDetailedAchievements);
  const [history, setHistory] = useState(mockActivityHistory);

  // Modals
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [activeQuizTopic, setActiveQuizTopic] = useState('Matemáticas');
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectMastery | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Success Toast Banner
  const [celebrationToast, setCelebrationToast] = useState<{ message: string; xp: number } | null>(null);

  const handleOpenQuiz = (topic?: string) => {
    setActiveQuizTopic(topic || 'Matemáticas');
    setIsQuizModalOpen(true);
  };

  const handleQuizCompleted = (earnedXp: number, correctAnswers: number, totalQuestions: number) => {
    setCurrentXp(prev => prev + earnedXp);

    // Update subject mastery for the topic if it exists
    setSubjects(prev => prev.map(s => {
      if (s.subject.toLowerCase() === activeQuizTopic.toLowerCase() || (activeQuizTopic === 'Matemáticas' && s.subject === 'Matemáticas')) {
        const boost = Math.min(100, s.progress + 6);
        return {
          ...s,
          progress: boost,
          activeRecallAccuracy: Math.min(100, s.activeRecallAccuracy + 8),
          status: boost >= 70 ? 'optimal' : 'needs_review',
          trend: 'up',
          trendValue: '+6% tras quiz',
          lastReviewed: 'Hoy (Active Recall)'
        };
      }
      return s;
    }));

    // Add entry to history
    const newHistoryItem = {
      id: `act-${Date.now()}`,
      title: `Quiz de Refuerzo: ${activeQuizTopic}`,
      subject: activeQuizTopic,
      type: 'quiz' as const,
      date: 'Hoy',
      time: 'Ahora',
      duration: '4 min',
      score: `${correctAnswers}/${totalQuestions} correctas`,
      xpEarned: earnedXp,
      feedback: correctAnswers === totalQuestions ? '¡Dominio impecable demostrado!' : 'Buen repaso conceptual.',
    };
    setHistory(prev => [newHistoryItem, ...prev]);

    // Show celebration banner
    setCelebrationToast({
      message: `¡Quiz completado! Sumaste experiencia y mejoraste tu retención en ${activeQuizTopic}.`,
      xp: earnedXp
    });

    setTimeout(() => {
      setCelebrationToast(null);
    }, 5000);
  };

  const handleStartReview = (review: ReviewScheduleItem) => {
    handleOpenQuiz(review.subject);
  };

  const handleStartPracticeFromSubject = (subjectName: string) => {
    // Navigate to study view or trigger quiz
    setView('estudia');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 px-4 md:px-8 pt-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {celebrationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-fox-surface border border-fox-gold/60 text-fox-text-main px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-fox-gold/20 text-fox-gold flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-bold">{celebrationToast.message}</p>
              <span className="text-[11px] font-extrabold text-fox-gold">
                +{celebrationToast.xp} XP Acreditados
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 mb-2"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
              <span className="p-2 rounded-2xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </span>
              <span>Mi Progreso y Rendimiento</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans font-semibold">
                Active Recall
              </span>
            </h2>
            <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
              Seguimiento de competencias curriculares, retención de conceptos clave a largo plazo y hábitos de estudio.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-fox-surface border border-fox-border text-fox-text-main px-4 py-2 rounded-2xl text-xs font-bold hover:bg-fox-bg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <History size={15} /> Ver historial completo
            </button>
            
            <button
              onClick={() => handleOpenQuiz('Literatura')}
              className="bg-fox-primary text-white px-4 py-2 rounded-2xl text-xs font-bold hover:bg-fox-primary/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={15} /> Práctica Exprés
            </button>
          </div>
        </div>
      </motion.header>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-fox-border pb-1 overflow-x-auto">
        {[
          { id: 'resumen', label: 'Resumen General', icon: TrendingUp },
          { id: 'materias', label: 'Dominio por Materia', icon: BookOpen, badge: '4' },
          { id: 'habitos', label: 'Hábitos y Retención', icon: Activity },
          { id: 'logros', label: 'Logros e Insignias', icon: Trophy, badge: `${achievements.filter(a => a.earned).length}/${achievements.length}` },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProgressTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 relative ${
                isActive
                  ? 'bg-fox-primary text-white shadow-sm'
                  : 'bg-transparent text-fox-text-muted hover:text-fox-text-main hover:bg-fox-surface'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-fox-border text-fox-text-muted'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Render */}
      <div className="pt-2">
        {activeTab === 'resumen' && (
          <ProgresoOverviewTab
            subjects={subjects}
            reviews={reviews}
            currentXp={currentXp}
            onOpenQuiz={handleOpenQuiz}
            onSelectSubject={sub => setSelectedSubjectDetail(sub)}
            onStartReview={handleStartReview}
            onViewAllSubjects={() => setActiveTab('materias')}
            onViewHabits={() => setActiveTab('habitos')}
          />
        )}

        {activeTab === 'materias' && (
          <ProgresoMateriasTab
            subjects={subjects}
            onSelectSubject={sub => setSelectedSubjectDetail(sub)}
            onOpenQuiz={handleOpenQuiz}
          />
        )}

        {activeTab === 'habitos' && (
          <ProgresoHabitosTab />
        )}

        {activeTab === 'logros' && (
          <ProgresoLogrosTab
            achievements={achievements}
            currentXp={currentXp}
          />
        )}
      </div>

      {/* Interactive Modals */}
      <ProgresoQuizModal
        isOpen={isQuizModalOpen}
        initialTopic={activeQuizTopic}
        onClose={() => setIsQuizModalOpen(false)}
        onQuizCompleted={handleQuizCompleted}
      />

      <SubjectDetailModal
        isOpen={selectedSubjectDetail !== null}
        subject={selectedSubjectDetail}
        onClose={() => setSelectedSubjectDetail(null)}
        onStartPractice={handleStartPracticeFromSubject}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        history={history}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}
