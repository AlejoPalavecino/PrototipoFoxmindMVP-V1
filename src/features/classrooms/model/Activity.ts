export type ActivityType = 'Trabajo práctico' | 'Evaluación' | 'Quizz' | 'Repaso';

export interface Activity {
  id: number;
  title: string;
  type: string;
  status: string;
  due: string;
  submissions: string;
  description: string;
  longInstructions: { title: string; content: string }[];
  attachment?: { name: string; size: string; url: string; fromLibrary?: boolean };
  rubric?: { criteria: string; points: number }[];
  duaAdaptations?: { studentName: string; duaProfile: string; adaptedContent: string; confirmed: boolean }[];
}

// Wizard output is richer than the activity assigned to the session list.
export interface CreatedActivityData extends Activity {
  type: ActivityType;
  status: 'Activa' | 'Borrador';
  startDate: string;
  topic: string;
  rubric: NonNullable<Activity['rubric']>;
  duaAdaptations: NonNullable<Activity['duaAdaptations']>;
  createdVia: 'ai' | 'upload';
}

export interface ActivityCreationInput {
  activityTitle: string;
  activityType: ActivityType;
  startDate: string;
  dueDate: string;
  activityDescription: string;
  effectiveTopic: string;
  studentCount: number;
  uploadedActivityDoc: { name: string; size: string } | null;
  attachedMaterial: { name: string; size: string; fromLibrary?: boolean } | null;
  activityRubric: CreatedActivityData['rubric'];
  duaAdaptations: CreatedActivityData['duaAdaptations'];
  activeCreationMode: CreatedActivityData['createdVia'];
}

export interface StudentActivity {
  id: number;
  title: string;
  type: string;
  status: string;
  due: string;
  description: string;
  attachment: { name: string; size: string; url: string };
  grade?: string;
  feedback?: string;
}

export interface ActivityRepository {
  read(): Activity[];
  replace(activities: Activity[]): void;
}
