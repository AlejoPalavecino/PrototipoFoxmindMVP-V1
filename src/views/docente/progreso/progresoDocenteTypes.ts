import { Classroom } from '../../../types';

export type Timeframe = 'semana' | 'mes' | 'trimestre';

export interface PedagogicalAlert {
  id: number;
  student: string;
  course: string;
  subject: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  time: string;
  status: 'active' | 'resolved';
  duaTag?: string;
  suggestedAction?: string;
}

export interface ClassroomPerformance {
  id: number | string;
  subject: string;
  course: string;
  studentsCount: number;
  avgGrade: number;
  progress: number;
  status: 'optimal' | 'needs_review' | 'critical';
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  color: string;
  bgLight: string;
  textColor: string;
  activeTasks: number;
  pendingSubmissions: number;
  keyCompetencies: {
    name: string;
    score: number; // 0-100
  }[];
  strengths: string[];
  weaknesses: string[];
  foxyRecommendation: string;
  priorityStudents: {
    name: string;
    issue: string;
    risk: 'ALTO' | 'MEDIO' | 'BAJO';
  }[];
}

export interface ScheduledIntervention {
  id: string;
  subject: string;
  course: string;
  studentOrGroup: string;
  type: 'tutoria' | 'dua_adaptacion' | 'comunicacion_familia' | 'quiz_diagnostico';
  date: string;
  time: string;
  urgency: 'alta' | 'media' | 'baja';
  estimatedImpact: string;
}

export interface DuaProfileStat {
  profile: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
}

export interface TeacherMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'seguimiento' | 'dua' | 'rendimiento' | 'comunidad';
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  maxProgress?: number;
  pointsReward: number;
  rarity: 'Común' | 'Raro' | 'Épico' | 'Legendario';
}

export interface TeacherHistoryEntry {
  id: string;
  title: string;
  subject: string;
  course: string;
  type: 'intervencion' | 'dua' | 'tutoria' | 'reporte' | 'evaluacion';
  date: string;
  time: string;
  impactScore?: string;
  pointsEarned: number;
  summary: string;
}

export interface TimeframeStats {
  promedio: number;
  tendenciaPromedio: string;
  tasaEntrega: string;
  tendenciaEntrega: string;
  alumnosRiesgo: number;
  totalAlumnos: number;
  consultasFoxy: number;
  adaptacionesDua: number;
  promedioHistory: number[];
  entregaHistory: number[];
  evolutionData: {
    period: string;
    promedio: number;
    entrega: number;
    consultas: number;
  }[];
}

export interface TeacherProgressData {
  stats: TimeframeStats;
  aulas: ClassroomPerformance[];
  alerts: PedagogicalAlert[];
  scheduledInterventions: ScheduledIntervention[];
  foxySummary: string;
}
