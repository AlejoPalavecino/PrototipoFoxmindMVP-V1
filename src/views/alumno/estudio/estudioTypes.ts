export type StudyToolType = 'flashcards' | 'quiz' | 'resumen' | 'mapa' | 'guia' | 'plan';

export type StudentAgentMode = 'socratico' | 'explicador' | 'riguroso' | 'resumidor';

import type { StudyFlashcardDeck } from '../../../features/study/model/Flashcard';
export type { StudyFlashcard, StudyFlashcardDeck } from '../../../features/study/model/Flashcard';

export interface StudyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface StudyQuiz {
  id: string;
  title: string;
  folderId: string;
  folderName: string;
  topic: string;
  difficulty: 'facil' | 'intermedio' | 'dificil';
  questions: StudyQuizQuestion[];
  createdAt: string;
  bestScore?: number;
  totalAttempts?: number;
}

export interface StudyConceptNode {
  id: string;
  label: string;
  description: string;
  category: 'core' | 'branch' | 'subbranch' | 'detail';
  connectedTo?: string[];
  color?: string;
  x?: number;
  y?: number;
}

export interface StudyConceptMap {
  id: string;
  title: string;
  folderId: string;
  folderName: string;
  centralTopic: string;
  nodes: StudyConceptNode[];
  summary: string;
  imageUrl?: string;
  createdAt: string;
}

export interface StudySummaryResource {
  id: string;
  title: string;
  folderId: string;
  folderName: string;
  topic: string;
  contentMarkdown: string;
  keyPoints: string[];
  glossary?: Array<{ term: string; definition: string }>;
  createdAt: string;
  readTimeMinutes: number;
}

export interface StudyGeneratedResource {
  id: string;
  title: string;
  type: 'flashcards' | 'quiz' | 'resumen' | 'mapa' | 'guia' | 'document' | 'plan';
  folderId: string;
  folderName: string;
  topic: string;
  description: string;
  createdAt: string;
  fileSize?: string;
  fileFormat?: string;
  rating?: number;
  data?: {
    flashcardDeck?: StudyFlashcardDeck;
    quiz?: StudyQuiz;
    conceptMap?: StudyConceptMap;
    summary?: StudySummaryResource;
    contentMarkdown?: string;
    imageUrl?: string;
  };
}

export interface StudyPlanMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  estimatedMinutes: number;
  activityType: 'lectura' | 'flashcards' | 'quiz' | 'mapa' | 'repaso' | 'simulacro';
}

export interface StudyPlan {
  id: string;
  title: string;
  folderId: string;
  folderName: string;
  targetGoal: string;
  examDate?: string;
  intensity: 'ligero' | 'moderado' | 'intensivo';
  createdAt: string;
  progressPercentage: number;
  milestones: StudyPlanMilestone[];
  tips: string[];
}

export interface StudentFoxyReminder {
  id: string;
  title: string;
  description: string;
  folderId: string;
  folderName: string;
  priority: 'urgent' | 'spaced_review' | 'exam_target' | 'tip';
  actionPrompt: string;
  actionType: 'start_flashcards' | 'start_quiz' | 'ask_foxy' | 'open_plan';
  targetDate?: string;
  iconType: 'clock' | 'brain' | 'sparkles' | 'target' | 'alert';
}

export interface StudentStudySession {
  id: string;
  folderId: string;
  folderName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mode: StudentAgentMode;
  isPinned?: boolean;
  messages: StudentStudyMessage[];
}

export interface StudentStudyMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  image?: string;
  topic?: string;
  toolGenerated?: StudyGeneratedResource;
  suggestedActions?: Array<{
    label: string;
    actionPrompt: string;
    iconType?: 'flashcards' | 'quiz' | 'resumen' | 'mapa' | 'plan' | 'socratic';
  }>;
}
