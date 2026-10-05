export interface SubjectMastery {
  id: string;
  subject: string;
  level: number;
  progress: number;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  color: string;
  accentColor: string;
  bgLight: string;
  textColor: string;
  activeRecallAccuracy: number;
  totalStudyHours: number;
  lastReviewed: string;
  nextScheduledReview: string;
  status: 'optimal' | 'needs_review' | 'critical';
  competencies: {
    name: string;
    score: number;
    description: string;
  }[];
  strengths: string[];
  focusAreas: string[];
  recentActivities: {
    title: string;
    type: 'quiz' | 'tarea' | 'repaso';
    score: string;
    date: string;
  }[];
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category: 'racha' | 'dominio' | 'habito' | 'social';
  icon: string;
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  maxProgress?: number;
  xpReward: number;
  rarity: 'Común' | 'Raro' | 'Épico' | 'Legendario';
}

export interface ActivityHistoryItem {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'active_recall' | 'tarea_entregada' | 'repaso_foxy';
  date: string;
  time: string;
  duration: string;
  score?: string;
  xpEarned: number;
  feedback?: string;
}

export interface ReviewScheduleItem {
  id: string;
  subject: string;
  title: string;
  date: string;
  duration: string;
  urgency: 'alta' | 'media' | 'baja';
  color: string;
  textColor: string;
  bgLight: string;
  topicId: string;
  retentionRate: number;
}
