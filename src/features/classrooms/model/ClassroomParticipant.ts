// Presentation contracts only. The role views retain their distinct roster owners.
export interface StudentParticipant {
  id: number;
  name: string;
  lastSeen: string;
}
export interface TeacherParticipant extends StudentParticipant {
  risk: string;
  dua: string[];
}
export type ParticipantViewMode = 'grid' | 'list';
